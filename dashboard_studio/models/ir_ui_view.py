from odoo import models, api, fields
from odoo.addons.base.models import ir_ui_view
from odoo.tools.safe_eval import safe_eval

# super_transfer_node_to_modifiers = ir_ui_view.transfer_node_to_modifiers
#
# def inherit_transfer_node_to_modifiers(node, modifiers, context=None, in_tree_view=False):
#     super_transfer_node_to_modifiers(node, modifiers, context=context, in_tree_view=in_tree_view)
#     if context.get("DynamicOdo", False):
#         for a in ('invisible', 'readonly', 'required'):
#             if node.get(a):
#                 v = bool(safe_eval(node.get(a), {'context': context or {}}))
#                 if in_tree_view and a == 'invisible':
#                     a = "column_invisible"
#                 modifiers[a] = v
#
# ir_ui_view.transfer_node_to_modifiers = inherit_transfer_node_to_modifiers


class IrUiView(models.Model):
    _inherit = 'ir.ui.view'

    type = fields.Selection(selection_add=[('plan', 'Planning'), ('dashboard', 'Dashboard')], ondelete={'dashboard': 'cascade', 'plan': 'cascade'})
    is_start = fields.Boolean(string="Bin to Start")

    def _apply_group(self, model, node, modifiers, fields):
        groups = node.get('groups')
        res = super(IrUiView, self)._apply_group(model, node, modifiers, fields)
        if self.env.context.get("from_odo_studio", False) and groups:
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

    def pin_to_start(self):
        self.search([['is_start', '=', True]]).write({'is_start': False})
        self.write({'is_start': True})


IrUiView()
