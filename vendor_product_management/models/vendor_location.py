#coding: utf-8

from odoo import api, fields, models


class vendor_location(models.Model):
    """
    The model to organize supplier warehouses
    """
    _name = "vendor.location"
    _description = "Vendor Location"

    def _inverse_active(self):
        """
        Inverse method for active
        We deactivate quants when a location is deactivated
        We do not activate them back since we have no idea how definite quants have been deactivated (e.g. deactivated
        product)
        """
        for location in self:
            if not location.active:
                location.quant_ids.sudo().write({"active": False})

    name = fields.Char(string="Name", required=True)
    address = fields.Char(string="Address",)
    partner_id = fields.Many2one("res.partner", string="Vendor",)
    delivery_time = fields.Integer("Delivery lead time",)
    description = fields.Text("Description",)
    quant_ids = fields.One2many("vendor.quant", "vendor_location_id",string="Stocks")
    company_id = fields.Many2one(
        'res.company',
        'Company',
        default=lambda self: self.env.user.company_id.id,
        index=1,
    )
    active = fields.Boolean(string="Active", default=True, inverse=_inverse_active)

    @api.model
    def _find_or_create_location(self, name, partner_id, delay):
        """
        The method to find a location by name, or create it if it doesn't exist

        Args:
         * name - location name
         * partner_id - res.partner object
         * delay - int or False

        Returns:
         * int - id
        """
        delay = delay and int(delay) or 0
        loc_f_id = self.search([
            ("name", "=", name),
            "|",
                ("partner_id", "=", partner_id.id),
                ("partner_id", "=", False),
            "|",
                ("active", "=", True),
                ("active", "=", False),
        ], limit=1)
        loc_id = loc_f_id and loc_f_id.id or False
        loc = self.browse(loc_id)
        if not loc_id:
            loc_id = self.create({
                "partner_id": partner_id.id,
                "name": name,
                "active": True,
                "delivery_time": delay,
            }).id
        else:
            if not loc.active:
                loc.active = True
            if delay:
                loc.delivery_time = delay
        return loc_id
