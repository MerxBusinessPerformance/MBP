from odoo import fields, models, api


class IrRule(models.Model):
    _inherit = "ir.rule"

    model_name = fields.Char(string="Model Name", related='model_id.model')


IrRule()


class IrFilter(models.Model):
    _inherit = "ir.filters"

    model_name = fields.Char(string="Model Name", compute="_compute_model_id")

    @api.depends('model_id')
    def _compute_model_id(self):
        for item in self:
            item.model_name = item.model_id


IrFilter()


class IrModelAccess(models.Model):
    _inherit = "ir.model.access"

    model_name = fields.Char(string="Model Name", related='model_id.model')


IrModelAccess()


class BaseAutomation(models.Model):
    _inherit = "base.automation"

    trigger = fields.Selection(selection_add=[('button_action', 'Button Action')], ondelete={'button_action': 'cascade'})


BaseAutomation()


class IrServerObjectLines(models.Model):
    _inherit = "ir.server.object.lines"

    @api.onchange('resource_ref', 'evaluation_type')
    def _set_resource_ref(self):
        super(IrServerObjectLines, self)._set_resource_ref()


IrServerObjectLines()

