# -*- coding: utf-8 -*-

from odoo import  api, fields, models
from odoo.tools.safe_eval import safe_eval

PARAMS = [('show_stocks_in_portal', safe_eval, "False"),]


class res_config_settings(models.TransientModel):
    _inherit = "res.config.settings"

    show_stocks_in_portal = fields.Boolean(string="Vendor Stocks in Portal")

    @api.model
    def get_values(self):
        """
        Overwrite to add new system params
        """
        Config = self.env['ir.config_parameter'].sudo()
        res = super(res_config_settings, self).get_values()
        values = {}
        for field_name, getter, default in PARAMS:
            values[field_name] = getter(str(Config.get_param(field_name, default)))
        res.update(**values)
        return res

    def set_values(self):
        """
        Overwrite to add new system params
        """
        Config = self.env['ir.config_parameter'].sudo()
        super(res_config_settings, self).set_values()
        for field_name, getter, default in PARAMS:
            value = getattr(self, field_name, default)
            Config.set_param(field_name, value)
