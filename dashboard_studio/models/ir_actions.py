from odoo import fields, models, api
import random


class ActionWindow(models.Model):
    _inherit = "ir.actions.act_window"

    @api.model
    def create_act_window(self, values):
        action_window_values = {'name': values.get("name", "Dashboard"), 'res_model': "view.center",
                                'view_mode': "dashboard", 'target': 'current', 'view_id': False}
        action_id = self.create(action_window_values)
        values['action_id'] = action_id.id
        view_id = self.env['view.center'].create_new_view(values)
        action_id.write({'view_id': view_id})
        self.env['ir.model.data'].create({
            'module': 'studio_designer',
            'name': "view.center.dashboard.{key}".format(key=random.getrandbits(30)),
            'model': 'ir.ui.view',
            'res_id': view_id,
        })
        return action_id.id


class ActionView(models.Model):
    _inherit = 'ir.actions.act_window.view'

    view_mode = fields.Selection(selection_add=[('plan', 'Planning'), ('dashboard', 'Dashboard')],
                                 ondelete={'dashboard': 'cascade', 'plan': 'cascade'})


ActionView()
