# -*- coding: utf-8 -*-

from odoo import fields, models
from odoo.tools.safe_eval import safe_eval



class vendor_import_result(models.TransientModel):
    """
    The model to reflect low sold product variants
    """
    _name = 'vendor.import.result'
    _description = 'Import Results'

    model = fields.Char(string="Model")
    record_ids = fields.Char(string="IDS")
    record_num = fields.Integer(string="Number of updated records")
    errors = fields.Text(string="Errors registered")

    def action_open_results(self):
        """
        The method to open updated records

        Returns:
         * ir.action.act.window

        Extra info:
         * Expected singleton
        """
        self.ensure_one()
        record_ids = safe_eval(self.record_ids)
        if self.model == "vendor.product.import":
            action = self.sudo().env.ref("vendor_product_management.vendor_product_action").read()[0]
            action["domain"] = [("id", "in", record_ids)]
        else:
            action = self.sudo().env.ref("vendor_product_management.vendor_quant_action").read()[0]
            action["domain"] = [("id", "in", record_ids)]
        return action

