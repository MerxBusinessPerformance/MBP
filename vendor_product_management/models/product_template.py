#coding: utf-8

from odoo import api, fields, models


class product_template(models.Model):
    """
    Overwrite to easily access vendor locations
    """
    _inherit = "product.template"

    @api.depends("vendor_quant_ids", "vendor_quant_ids.active", "vendor_quant_ids.supplier_quantity",
                 "vendor_quant_ids.product_quantity")
    def _compute_vendor_quantity(self):
        """
        Compute method for quant_ids
        """
        for template in self:
            template.vendor_quantity = sum(template.vendor_quant_ids.mapped('product_quantity'))

    vendor_quant_ids = fields.One2many("vendor.quant", "product_tmpl_id", string="Vendor Stocks")
    vendor_quantity = fields.Float(
        string="Vendor Quantity",
        compute=_compute_vendor_quantity,
        compute_sudo=True,
        store=True,
    )
