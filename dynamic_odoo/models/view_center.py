from odoo import fields, models, api


# class IRModelFields(models.Model):
#     _inherit = "ir.model.fields"
#
#     view_studio_id = fields.Many2one(comodel_name="view.center", string="Studio")
#
#
# IRModelFields()

class ActionsCenter(models.Model):
    _name = "ir.actions.center"

    action_id = fields.Many2one(string="Action", comodel_name="ir.actions.act_window")
    views_order = fields.Char(string="Views Order", default='[]')
    name = fields.Char(string="Name")

    @api.model
    def store_action(self, action_id, values):
        action_virtual = self.search([('action_id', '=', action_id)], limit=1)
        if not action_virtual:
            action_virtual = self.create({'action_id': action_id})
        return action_virtual.write(values)


ActionsCenter()


class ReportCenter(models.Model):
    _name = "report.center"

    xml = fields.Text(string="Xml")
    view_id = fields.Many2one(string="View id", comodel_name="ir.ui.view")
    report_id = fields.Many2one(string="Report Id", comodel_name="ir.actions.report")

    @api.model
    def undo_view(self, report_id):
        if report_id:
            return self.search([['report_id', '=', report_id]]).unlink()
        return False

    @api.model
    def create_new_report(self, values):
        self.env['ir.ui.view']._load_records([dict(xml_id=values.get("xml_id", False), values={
            'name': values.get("name", False),
            'arch': values.get("xml", False),
            'key': values.get("xml_id", False),
            'inherit_id': False,
            'type': 'qweb',
        })])
        model_id = self.env['ir.model'].search([["model", '=', values['model']]]).id
        report = self.env["ir.actions.report"].create({
            'model': values['model'],
            "binding_type": "report",
            "binding_model_id": model_id,
            "model_id": model_id,
            "name": values['string'],
            "report_file": values['report_file'],
            "report_name": values['report_name'],
            "report_type": "qweb-pdf",
            "type": "ir.actions.report",
            "xml_id": values['report_xml_id']
        })
        return {'id': report.id, 'name': report.name, 'report_name': report.report_name}

    @api.model
    def store_template(self, data):
        report_id = data.get("report_id", False)
        templates = data.get("templates", {})
        if report_id:
            for template_id in templates.keys():
                template_id, template = int(template_id), templates[template_id]
                views_exist = self.search([['view_id', '=', template_id], ['report_id', '=', report_id]], limit=1)
                if len(views_exist) > 0:
                    views_exist.write({'xml': template})
                else:
                    self.create({'xml': template, 'view_id': template_id, 'report_id': report_id})
        return True

    @api.model
    def get_field_widget(self):
        all_models = self.env.registry.models
        models_name = all_models.keys()
        widgets = {}
        for model_name in models_name:
            if model_name.find("ir.qweb.field.") >= 0:
                widget_name = model_name.replace("ir.qweb.field.", "")
                self.env[model_name].get_available_options()
                widgets[widget_name] = self.env[model_name].get_available_options()
        return widgets


class ViewCenter(models.Model):
    _name = "studio.view.center"

    arch = fields.Text(string="Arch")
    # menu_id = fields.Many2one(string="Menu Id", comodel_name="ir.ui.menu")
    action_id = fields.Many2one(string="Action", comodel_name="ir.actions.act_window")

    view_id = fields.Many2one(string="View id", comodel_name="ir.ui.view")
    new_fields = fields.Many2many('ir.model.fields', string="New Fields", copy=False)

    view_key = fields.Char(string="View Key")  # sale_order_field_order_line_list_field_invoice_lines_list
    parent_id = fields.Many2one(string="Parent Id", comodel_name="studio.view.center")
    parent_view_id = fields.Many2one(string="Parent View Id", comodel_name="ir.ui.view")
    # parent_model_name = fields.Char(string="Parent Model Name")
    field_name = fields.Char(string="Field Name")
    view_type = fields.Selection([('tree', 'Tree'), ('form', 'Form'), ('kanban', 'Kanban'), ('search', 'Search'),
                                  ('pivot', 'Pivot'), ('calendar', 'Calendar'), ('graph', 'Graph'), ('plan', 'Plan')],
                                 ondelete='cascade', string="View Type")
    views_order = fields.Char(string="Views Order", default="[]")  # ["form", "list"]

    @api.model
    def get_button_data(self, res_id, model):
        approval_model = self.env['studio.approval.details']
        approval = approval_model.get_approval(res_id, model)
        return {'approval': approval}

    @api.model
    def create_btn_compute(self, data, field):
        model, field_name, field_relation, action_name = field.pop("model"), field.pop("field_name"), field.pop(
            "field_relation"), field.pop("action_name")
        field[
            "compute"] = "results = self.env['{model}'].read_group([('{field_relation}', 'in', self.ids)], ['{field_relation}'], ['{field_relation}']) \n" \
                         "dic = {{}} \n" \
                         "for x in results: dic[x['{field_relation}'][0]] = x['{field_relation}_count'] \n" \
                         "for record in self: record['{field_name}'] = dic.get(record.id, 0)".format(
            field_relation=field_relation, field_name=field_name, model=model)
        action_data = {'xml_id': action_name, 'name': 'Demo', 'type': 'ir.actions.act_window', 'res_model': model,
                       'view_mode': 'tree,form',
                       'context': "{{'search_default_{field_name}': active_id, 'default_{field_name}': active_id}}".format(
                           field_name=field_relation)}
        action = self.env['ir.actions.act_window'].create(action_data)
        data['arch'] = data['arch'].replace(action_name, str(action.id))

    @api.model
    def update_button(self, model, data, kind):
        model_button, model_rule, model = \
            self.env['studio.button'], self.env['studio.approval.rule'], self.env['ir.model'].search(
                [['model', '=', model]])
        for btn_key in data.keys():
            button, value = model_button.search([['name', '=', btn_key]]), data[btn_key]
            if len(button) == 0:
                button = model_button.create({'name': btn_key, 'model_id': model.id})
            if kind == "approval":
                for rule in button.rule_ids:
                    group_id = rule.group_id.id
                    if group_id not in value:
                        rule.unlink()
                        continue
                    value.remove(group_id)
                if len(value):
                    model_rule.create([{'button_id': button.id, 'group_id': group} for group in value])

    @api.model
    def get_field_id(self, field_name, model_name):
        model_obj = self.env['ir.model'].search([['model', '=', model_name]], limit=1)
        field_obj = self.env['ir.model.fields'].search([['model_id', '=', model_obj.id], ['name', '=', field_name]],
                                                       limit=1)
        if len(field_obj):
            return field_obj.id
        return False

    @api.model
    def get_group_xmlid(self, res_ids=[]):
        groups = self.env['ir.model.data'].search([['model', '=', 'res.groups'], ['res_id', 'in', res_ids]])
        return ",".join([x.complete_name for x in groups])

    @api.model
    def get_relation_id(self, model):
        model_obj = self.env['ir.model'].search([['model', '=', model]], limit=1)
        if len(model_obj):
            return {'id': model_obj.id, 'display_name': model_obj.display_name}
        return {}

    @api.model
    def get_group_id(self, xmlid=""):
        result = []
        for x in xmlid.split(","):
            if x.find("!") == -1:
                group = self.env.ref(x)
                result.append({'id': group.id, 'display_name': group.display_name})
        return result

    @api.model
    def create_m2o_from_o2m(self, new_field):
        field_m2one = new_field.get('fieldM2one', {})
        model_m2one = self.env['ir.model'].search([('model', '=', field_m2one.get("model_name", False))])
        field_m2one.update({'model_id': model_m2one.id, 'state': 'manual'})
        del field_m2one['model_name']
        self.env['ir.model.fields'].create(field_m2one)
        del new_field['fieldM2one']

    @api.model
    def create_new_view(self, values):
        view_mode = values.get('view_mode', False)
        action_id = values.get('action_id', False)
        data = values.get("data", {})
        if view_mode == "list":
            view_mode = "tree"
        view_id = self.env['ir.ui.view'].create(data)
        values_action_view = {'sequence': 100, 'view_id': view_id.id,
                              'act_window_id': action_id, 'view_mode': view_mode}
        self.env['ir.actions.act_window.view'].create(values_action_view)
        return view_id

    @api.model
    def store_view(self, data):
        parent_child = {}
        parent_id = {}
        for values in data:
            view_key, parent_stack_id, stack_id = \
                values.get("view_key", False), values.pop("parent_stack_id", False), values.pop("stack_id", False)

            # if force:
            #     obj_data = self.create(values)
            #     parent_data[parent_stack_id].append(obj_data.id)
            #     if stack_id:
            #         parent_ok[stack_id] = obj_data.id
            #     continue

            views_exist = self.search([['view_key', '=', view_key]], limit=1)
            new_fields, model_name, button_data, stack_root_id = \
                values.get("new_fields", False), values.pop("model_name", False), values.pop("button_data",
                                                                                             False), values.pop(
                    "stack_root_id", False)

            if button_data and model_name:
                self.update_button(model_name, button_data.get("approval"), "approval")

            # only data have arch can create/update
            # if values.get("arch", False):
            if model_name and new_fields and len(new_fields):
                model_obj, use_for_compute = self.env['ir.model'].search([('model', '=', model_name)]), values
                if stack_root_id:
                    # co stack_root_id co nghia la in_parent va ta can su dung arch parent (boi vi no khong co arch)
                    for item in data:
                        if item.get("stack_id", False) == stack_root_id:
                            use_for_compute = item
                            break

                for newField in new_fields:
                    if newField['ttype'] == "one2many":
                        self.create_m2o_from_o2m(newField)
                    if newField.pop('compute', False):
                        self.create_btn_compute(use_for_compute, newField)
                    newField.update({'model_id': model_obj.id, 'state': 'manual'})
                values['new_fields'] = [(0, 0, new_field) for new_field in new_fields]

            for attr in [x for x in values.keys() if x not in self._fields]:
                del values[attr]
            if len(views_exist) > 0:
                views_exist.write(values)
            else:
                views_exist = self.create(values)
            if parent_stack_id:
                if parent_stack_id not in parent_child:
                    parent_child[parent_stack_id] = []
                parent_child[parent_stack_id].append(views_exist.id)
            if stack_id:
                parent_id[stack_id] = views_exist.id

        for st_id in parent_child.keys():
            if st_id in parent_id:
                self.browse(parent_child[st_id]).write({'parent_id': parent_id[st_id]})

        return True

    @api.model
    def reset_view(self, values):
        return self.search([['id', 'child_of', values]]).unlink()

    @api.model
    def get_view(self, domain):
        return self.search(domain).read()

    @api.model
    def load_field_get(self, model_name):
        return self.env[model_name].fields_get()

    @api.model
    def create_app(self):
        pass


ViewCenter()


class StudioButton(models.Model):
    _name = "view.center.button"

    button_key = fields.Char(string="Button Key", required=True)
    automation_id = fields.Many2one(comodel_name="base.automation", string="Automation")

    @api.model
    def get_button_action_info(self, model_name):
        view_id = self.env.ref('dynamic_odoo.base_automation_action_studio').id
        model = self.env['ir.model'].search([('model', '=', model_name)])
        return {'view_id': view_id, 'model_id': model.id}


StudioButton()
