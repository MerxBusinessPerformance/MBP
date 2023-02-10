#coding: utf-8

from odoo import _, api, fields, models


class vendor_quant(models.Model):
    """
    Overwrite to prepare methods required in portal
    """
    _inherit = "vendor.quant"

    def get_this_stock_values(self):
        """
        The method to retrieve this supplierinfo values (used for js)

        Methods:
         * return_options

        Returns:
         * dict
           ** id
           ** vendor_product_id
           ** supplier_quantity
           ** location_id
           ** uom_id
           ** location_ids
           ** uom_ids

        Extra info:
         * Expected singleton
        """
        self.ensure_one()
        values = {
            "id": self.id,
            "vendor_product_id": self.vendor_product_id.id,
            "supplier_quantity": self.supplier_quantity,
            "location_id": self.vendor_location_id.id,
            "uom_id": self.supplier_product_uom_id.id,
        }
        values.update(self.return_options())
        return values

    @api.model
    def return_options(self):
        """
        The method to prepare available locations and units of measures

        Methods:
         * name_get of vendor.location
         * name_get of uom.uom

        Returns:
         * dict
          ** location_ids
          ** uom_ids
        """
        partner_id = self.env.user.partner_id.commercial_partner_id.id
        location_ids = self.env["vendor.location"].search([("partner_id", "child_of", partner_id)])
        uom_ids = self.env["uom.uom"].sudo().search([])
        return {
            "location_ids": location_ids.name_get(),
            "uom_ids": uom_ids.sudo().name_get(),
        }

    @api.model
    def create_stock_from_portal(self, values):
        """
        The method to create vendor.quant from values and prepare defaults
        We need product_partner_id for the security reasons

        Returns:
          * success string
        """
        partner_id = self.env.user.partner_id.commercial_partner_id.id
        values.update({"product_partner_id": partner_id})
        quant_id = self.create(values)
        return _("The stock level has been successfully registered")

    def write_stock_from_portal(self, values):
        """
        The method to write vendor.quant from values

        Returns:
          * success string

        Extra info:
         * Expected singleton
        """
        price_id = self.write(values)
        return _("The stock level has been successfully updated")
