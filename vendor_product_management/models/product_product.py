#coding: utf-8

from odoo import api, fields, models


class product_product(models.Model):
    """
    Overwrite to easily access vendor locations
    """
    _inherit = "product.product"

    @api.depends("vendor_quant_ids", "vendor_quant_ids.active", "vendor_quant_ids.supplier_quantity",
                 "vendor_quant_ids.product_quantity")
    def _compute_vendor_quantity(self):
        """
        Compute method for quant_ids
        """
        for product in self:
            product.vendor_quantity = sum(product.vendor_quant_ids.mapped('product_quantity'))

    vendor_quant_ids = fields.One2many("vendor.quant", "product_id", string="Vendor Stocks")
    vendor_quantity = fields.Float(
        string="Vendor Quantity",
        compute=_compute_vendor_quantity,
        compute_sudo=True,
        store=True,
    )
