from odoo import fields, models, api
import random


class DashboardWidgetData(models.Model):
    _name = "dashboard.widget.data"

    name = fields.Text(string="Name")
    type = fields.Selection([('todo', 'To Do'), ('bookmark', 'Bookmark'), ('text', 'Text')], string="Widget Type")
    state = fields.Selection([('todo', 'To Do'), ('completed', 'Completed')], string="Todo State", default="todo")
    view_id = fields.Many2one(comodel_name="dashboard.widget.view", string="View")


class DashboardWidgetView(models.Model):
    _name = "dashboard.widget.view"

    name = fields.Char(string="Name")
    arch = fields.Text(string="Arch")
    model = fields.Char(string="Model")


DashboardWidgetView()


class ViewDashboard(models.Model):
    _name = "view.dashboard"

    gs_x = fields.Integer(string="GS-X")
    gs_y = fields.Integer(string="GS-Y")
    gs_h = fields.Integer(string="GS-Height")
    gs_w = fields.Integer(string="GS-Width")
    title = fields.Char(string="Title")
    view_id = fields.Many2one(string="View id", comodel_name="ir.ui.view")
    # _card_view = fields.Many2one(string="Card View", comodel_name="ir.ui.view")
    card_view = fields.Many2one(string="Card View", comodel_name="dashboard.widget.view")
    view_type = fields.Char(string="View Type")

    @api.model
    def create_new_card(self, data):
        arch, view_id, name, model = data.get("arch", False), data.get("view_id", False), data.get("name",
                                                                                                   False), data.get(
            "model", False)
        x, y, w, h, title, view_type = data.get("x", 0), data.get("y", 0), data.get("w", 0), data.get("h", 0), data.get(
            "title", "Title"), data.get("view_type", "graph")
        card_view = self.card_view.create({'arch': arch, 'model': model, 'name': name})
        res_id = self.create(
            {'gs_x': x, 'gs_y': y, 'gs_w': w, 'gs_h': h, 'title': title, 'view_id': view_id, 'card_view': card_view.id,
             'view_type': view_type})
        return self.load_dashboard(res_id.id, view_id)

    @api.model
    def update_view(self, values):
        for record in values:
            self.browse(record['id']).write({'gs_x': record['x'], 'gs_y': record['y'],
                                             'gs_h': record['h'], 'gs_w': record['w']})

    @api.returns('self', lambda value: value.id)
    def copy(self, default=None):
        default = default or {}
        default['card_view'] = self.card_view.copy().id
        return super(ViewDashboard, self).copy(default=default)

    @api.model
    def load_dashboard(self, res_id, view_id):
        domain = [['view_id', '=', view_id]]
        if res_id:
            domain.append(['id', '=', res_id])
        card_views, result = self.search_read(domain), {}
        if len(card_views):
            for view in card_views:
                if view['card_view']:
                    view_obj = self.card_view.browse(view['card_view'][0])
                    view['viewInfo'] = {'model': view_obj.model, 'arch': view_obj.arch, 'name': view_obj.name,
                                        'data': self.env['dashboard.widget.data'].search_read(
                                            [('view_id', '=', view_obj.id)]),
                                        'view_id': view_obj.id, 'base_model': view_obj.model,
                                        'fields': self.env[view_obj.model].fields_get()}
        return card_views


ViewDashboard()


class ViewCenter(models.Model):
    _name = "view.center"

    arch = fields.Text(string="Arch")
    view_id = fields.Many2one(string="View id", comodel_name="ir.ui.view")

    @api.model
    def load_query(self, sql):
        self._cr.execute(sql)
        return self._cr.dictfetchall()

    @api.model
    def get_group_xmlid(self, res_ids=[]):
        groups = self.env['ir.model.data'].search([['model', '=', 'res.groups'], ['res_id', 'in', res_ids]])
        return ",".join([x.complete_name for x in groups])

    @api.model
    def get_group_id(self, xmlid=""):
        result = []
        for x in xmlid.split(","):
            group = self.env.ref(x)
            result.append({'id': group.id, 'display_name': group.display_name})
        return result

    @api.model
    def store_view(self, values):
        views_exist = self.search([['view_id', '=', values.get('view_id', False)]], limit=1)
        if len(views_exist) > 0:
            views_exist.write({'arch': values['arch']})
        else:
            for attr in [x for x in values.keys() if x not in self._fields]:
                del values[attr]
            self.create(values)
        return True

    @api.model
    def reset_view(self, values):
        return self.search([]).unlink()
        # return self.search([['view_id', '=', values.get('view_id', False)]]).unlink()

    @api.model
    def load_field_get(self, model_name):
        return self.env[model_name].fields_get()

    @api.model
    def create_new_menu(self, values):
        view = values.get("view", {})
        action_id = self.env['ir.actions.act_window'].create_act_window(view)
        menu = self.env["ir.ui.menu"].create(
            {'name': view.get("name", "Dashboard"), 'parent_id': values.get("parent_id", False),
             'sequence': values.get("sequence", 1), 'action': '%s,%s' % ('ir.actions.act_window',
                                                                         action_id)})
        return {'action_id': action_id, 'menu_id': menu.id}

    @api.model
    def create_new_view(self, values):
        view_mode = values.get('view_mode', False)
        action_id = values.get('action_id', False)
        data = values.get("data", {})
        view_id = self.env['ir.ui.view'].create(data)
        values_action_view = {'sequence': 100, 'view_id': view_id.id,
                              'act_window_id': action_id, 'view_mode': view_mode}
        self.env['ir.actions.act_window.view'].create(values_action_view)
        return view_id.id


ViewCenter()
