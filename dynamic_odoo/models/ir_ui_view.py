from odoo import models, api, fields
from odoo.addons.base.models import ir_ui_view
from odoo.tools.safe_eval import safe_eval
from lxml import etree
import collections
import random
from odoo.exceptions import UserError

super_transfer_node_to_modifiers = ir_ui_view.transfer_node_to_modifiers


def inherit_transfer_node_to_modifiers(node, modifiers, context=None):
    super_transfer_node_to_modifiers(node, modifiers, context=context)
    if context.get("STUDIO", False):
        if node.get('props_modifier'):
            # for node.get('props_modifier')
            modifiers.update(safe_eval(node.get('props_modifier')))
        if node.get("invisible") and (any(parent.tag == 'tree' for parent in node.iterancestors()) and not any(
                parent.tag == 'header' for parent in node.iterancestors())):
            v = str(safe_eval(node.get("invisible"), {'context': context or {}}))
            if v.find("[") >= 0:
                modifiers["invisible"] = v
                del modifiers["column_invisible"]


ir_ui_view.transfer_node_to_modifiers = inherit_transfer_node_to_modifiers


class IrUiView(models.Model):
    _inherit = 'ir.ui.view'

    type = fields.Selection(selection_add=[('plan', 'Planning')], ondelete={'plan': 'cascade'})

    def _apply_groups(self, node, name_manager, node_info):
        groups = node.get('groups')
        res = super(IrUiView, self)._apply_groups(node, name_manager, node_info)
        if self.env.context.get("STUDIO", False) and groups:
            node.set('groups', groups)
        return res

    @api.constrains('arch_db')
    def _check_xml(self):
        if "view_center" in self.name:
            return True
        return super(IrUiView, self)._check_xml()

    def remove_view(self):
        self.env['ir.actions.act_window.view'].search([['view_id', 'in', self.ids]]).unlink()
        return self.unlink()

    @api.model
    def create_new_view(self, values):
        view_mode = values.get('view_mode', False)
        action_id = values.get('action_id', False)
        data = values.get("data", {})
        view_id = self.env['ir.ui.view'].create(data)
        if action_id:
            if view_mode == "search":
                self.env['ir.actions.act_window'].browse(action_id).write({'search_view_id': view_id.id})
            else:
                values_action_view = {'sequence': 100, 'view_id': view_id.id,
                                      'act_window_id': action_id, 'view_mode': view_mode}
                self.env['ir.actions.act_window.view'].create(values_action_view)
        return view_id.id

    def read(self, fields=None, load='_classic_read'):
        report_id = self.env.context.get("REPORT_ID", False)
        res = super(IrUiView, self).read(fields=fields, load=load)
        if len(self) == 1 and self.type == "qweb" and report_id:
            template = self.env['report.center'].search([['view_id', '=', self.id], ['report_id', '=', report_id]],
                                                        limit=1)
            if len(template):
                for view in res:
                    view['arch'] = template.xml
        return res

    def get_report_studio(self, report_id, view_id):
        template = self.env['report.center'].search([['view_id', '=', view_id], ['report_id', '=', report_id]], limit=1)
        if len(template):
            return template.xml
        return None

    def _combine(self, hierarchy: dict):
        report_id = self.env.context.get("REPORT_ID", False)
        arch_studio = self.get_report_studio(report_id, self.id)
        if not arch_studio:
            return super(IrUiView, self)._combine(hierarchy)
        self.ensure_one()
        assert self.mode == 'primary'

        combined_arch = etree.fromstring(arch_studio)
        if self.env.context.get('inherit_branding'):
            combined_arch.attrib.update({
                'data-oe-model': 'ir.ui.view',
                'data-oe-id': str(self.id),
                'data-oe-field': 'arch',
            })
        self._add_validation_flag(combined_arch)
        # queue = collections.deque(sorted(hierarchy[self], key=lambda v: v.mode))
        # while queue:
        #     view = queue.popleft()
        #     arch = etree.fromstring(view.arch)
        #     if view.env.context.get('inherit_branding'):
        #         view.inherit_branding(arch)
        #     self._add_validation_flag(combined_arch, view, arch)
        #     combined_arch = view.apply_inheritance_specs(combined_arch, arch)
        #
        #     for child_view in reversed(hierarchy[view]):
        #         if child_view.mode == 'primary':
        #             queue.append(child_view)
        #         else:
        #             queue.appendleft(child_view)

        return combined_arch

    @api.model
    def get_views(self):
        return {
            'translation': [[self.env.ref('base.view_translation_dialog_tree').id, 'list'],
                            [self.env.ref('base.view_translation_search').id, 'search']],
            'controller': [[False, 'list'], [False, 'form']],
            'automation': [[False, 'list'], [False, 'form'],
                           [self.env.ref('base_automation.view_base_automation_search').id, 'search']],
            'access_control': [[False, 'list'], [False, 'form'],
                               [self.env.ref('base.ir_access_view_search').id, 'search']],
            'filter_rules': [[False, 'list'], [False, 'form'],
                             [self.env.ref('base.ir_filters_view_search').id, 'search']],
            'record_rules': [[False, 'list'], [False, 'form'], [self.env.ref('base.view_rule_search').id, 'search']]}

    def duplicate_template(self, old_report, new_report):
        new = self.copy()
        cloned_templates, new_key = self.env.context.get('cloned_templates', {}), '%s_cp_%s' % (
            new.key.split("_cp_")[0], random.getrandbits(30))
        self, studio_center = self.with_context(cloned_templates=cloned_templates), self.env['report.center']
        cloned_templates[new.key], arch_tree = new_key, etree.fromstring(self._read_template(self.id))

        for node in arch_tree.findall(".//t[@t-call]"):
            template_call = node.get('t-call')
            if '{' in template_call:
                continue
            if template_call not in cloned_templates:
                template_view = self.search([('key', '=', template_call)], limit=1)
                template_copy = template_view.duplicate_template(old_report, new_report)
                studio_view = studio_center.search([('view_id', '=', template_view.id), ('report_id', '=', old_report)],
                                                   limit=1)
                if studio_view:
                    studio_view.copy({'view_id': template_copy.id, 'report_id': new_report})
            node.set('t-call', cloned_templates[template_call])
        subtree = arch_tree.find(".//*[@t-name]")
        if subtree is not None:
            subtree.set('t-name', new_key)
            arch_tree = subtree
        new.write({
            'name': '%s Copy' % new.name,
            'key': new_key,
            'arch_base': etree.tostring(arch_tree, encoding='unicode'),
            'inherit_id': False,
        })
        return new


class IrUiMenu(models.Model):
    _inherit = 'ir.ui.menu'

    model_id = fields.Many2one(string="Model", comodel_name="ir.model")

    def load_web_menus(self, debug):
        web_menus = super(IrUiMenu, self).load_web_menus(debug)
        obj_menus = self.browse(list(filter(lambda x: x != 'root', web_menus.keys())))

        for m in obj_menus:
            if m.id and m.id in web_menus:
                web_menus[m.id]['parent_id'] = [m.parent_id.id, m.parent_id.display_name]
                web_menus[m.id]['sequence'] = m.sequence

        return web_menus

    @api.model
    def create_new_app(self, values):
        app_name, menu_name, model_name, web_icon_data = values.get("app_name", False), values.get("object_name",
                                                                                                   False), values.get(
            "model_name", False), values.get("web_icon_data", False)
        if app_name:
            app_menu = self.create(
                {'name': app_name, 'parent_id': False, 'sequence': 100, 'web_icon_data': web_icon_data})
            parent_menu = self.create({'name': menu_name, 'parent_id': app_menu.id, 'sequence': 1})
            values['parent_id'] = parent_menu.id
            result = self.create_new_menu(values)
            result['menu_id'] = app_menu.id
            return result
        return False

    @api.model
    def create_new_model(self, model_des, model_name):
        model_values = {'name': model_des, 'model': model_name, 'state': 'manual',
                        'is_mail_thread': True, 'is_mail_activity': True,
                        'access_ids': [(0, 0, {'name': 'Group No One', 'group_id':
                            self.env.ref('base.group_no_one').id, "perm_read": True, "perm_write": True,
                                               "perm_create": True, "perm_unlink": True})]}
        return self.env['ir.model'].create(model_values).id

    @api.model
    def create_action_wd(self, model_name):
        # create action window
        action_window_values = {'name': 'New Model', 'res_model': model_name,
                                'view_mode': "tree,form", 'target': 'current', 'view_id': False}
        action_id = self.env['ir.actions.act_window'].create(action_window_values)
        # create tree view
        view_data = {"arch": "<tree><field name='id' /></tree>", "model": model_name,
                     "name": "{model}.tree.{key}".format(model=model_name, key=random.getrandbits(30))}
        view_id = self.env['studio.view.center'].create_new_view(
            {'view_mode': 'tree', 'action_id': action_id.id, "data": view_data})
        # create form view
        view_data = {
            "arch": "<form><header></header><sheet><div class='oe_button_box' name='button_box'></div><field name='id' invisible='True' /></sheet></form>",
            "model": model_name,
            "name": "{model}.form.{key}".format(model=model_name, key=random.getrandbits(30))}
        self.env['studio.view.center'].create_new_view({'view_mode': 'form', 'action_id': action_id.id, "data": view_data})
        self.env['ir.model.data'].create({
            'module': 'odo_studio',
            'name': view_data['name'],
            'model': 'ir.ui.view',
            'res_id': view_id.id,
        })
        return action_id.id

    @api.model
    def create_new_menu(self, values):
        model_name, model_id, menu_name, empty_view = values.get("model_name", False), values.get("model_id", False), \
                                                      values.get("object_name", False), values.get("empty_view", False)
        action_id, parent_id, sequence = False, values.get("parent_id", False), values.get("sequence", False)
        if model_name:
            model_id = self.create_new_model(menu_name, model_name)
            action_id = self.create_action_wd(model_name)
        else:
            model_obj = self.env['ir.model'].browse(model_id)
            if empty_view:
                action_id = self.create_action_wd(model_obj.model)
            else:
                action_ids = self.env['ir.actions.act_window'].search([('res_model', '=', model_obj.model)])
                if len(action_ids):
                    has_view = action_ids.filtered(lambda x: x.view_id != False)
                    if len(has_view):
                        has_tree = has_view.filtered(lambda x: (x.view_mode or "").find("tree") >= 0)
                        action_ids = has_tree if len(has_tree) else has_view
                    action_id = action_ids[0].id
        # create menu
        if model_id:
            menu = self.create({'name': menu_name, 'parent_id': parent_id, 'sequence': sequence or 1,
                                'action': '%s,%s' % ('ir.actions.act_window', action_id)})
            return {'action_id': action_id, 'menu_id': menu.id}
        return False

    @api.model
    def update_menu(self, menu_update, menu_delete):
        self.browse(menu_delete).unlink()
        for menu in menu_update:
            self.browse(int(menu)).write(menu_update[menu])

    @api.model
    def get_form_view_id(self):
        return self.env.ref('dynamic_odoo.ir_ui_menu_studio_form_view').id
