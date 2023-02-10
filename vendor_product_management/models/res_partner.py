#coding: utf-8

from odoo import api, fields, models


class res_partner(models.Model):
    """
    Overwrite to open vendor locations
    """
    _inherit = "res.partner"

    @api.depends("vendor_product_ids", "vendor_product_ids.active")
    def _compute_vendor_product_count(self):
        """
        Compute method for vendor_product_count
        """
        for product in self:
            product.vendor_product_count = len(product.vendor_product_ids)

    @api.depends("vendor_location_ids", "vendor_location_ids.active")
    def _compute_vendor_location_count(self):
        """
        Compute method for vendor_location_count
        """
        for product in self:
            product.vendor_location_count = len(product.vendor_location_ids)

    vendor_product_ids = fields.One2many("vendor.product", "partner_id", string="Products")
    vendor_product_count = fields.Integer(
        string="Products Count",
        compute=_compute_vendor_product_count,
        compute_sudo=True,
        store=True,
    )
    vendor_location_ids = fields.One2many("vendor.location", "partner_id", string="Locations")
    vendor_location_count = fields.Integer(
        string="Locations Count",
        compute=_compute_vendor_location_count,
        store=True,
        compute_sudo=True,
    )

