#coding: utf-8

from odoo import _, api, fields, models


class product_supplierinfo(models.Model):
    """
    Overwrite to add method required in portal
    """
    _inherit = "product.supplierinfo"

    def get_this_price_values(self):
        """
        The method to retrieve this supplierinfo values (used for js)

        Methods:
         * return_currencies

        Returns:
         * dict
           ** id
           ** price
           ** min_qty
           ** date_start
           ** date_end

        Extra info:
         * Expected singleton
        """
        self.ensure_one()
        res = {
            "id": self.id,
            "price": self.price,
            "min_qty": self.min_qty,
            "date_start": self.date_start,
            "date_end": self.date_end,
            "vendor_product_id": self.vendor_product_id.id,
            "currency_id": self.currency_id.id,
        }
        res.update(self.return_currencies())
        return res

    @api.model
    def return_currencies(self):
        """
        The method to return available currencies

        Methods:
         * name_get of res.currency

        Returns:
         * dict
        """
        currency_ids = self.env["res.currency"].search([])
        return {"currency_ids": currency_ids.name_get()}

    @api.model
    def create_price_from_portal(self, values):
        """
        The method to create product.supplierinfo from values and prepare defaults

        Returns:
          * success string
        """
        partner_id = self.env.user.partner_id.commercial_partner_id.id
        values.update({"name": partner_id})
        try:
            values.update({"date_start": fields.Date.from_string(values.get("date_start"))})
        except:
            values.update({"date_start": False})
        try:
            values.update({"date_end": fields.Date.from_string(values.get("date_end"))})
        except:
            values.update({"date_end": False})
        price_id = self.create(values)
        return _("The price has been successfully registered")

    def write_price_from_portal(self, values):
        """
        The method to write product.supplierinfo from values

        Returns:
          * success string

        Extra info:
         * Expected singleton
        """
        try:
            values.update({"date_start": fields.Date.from_string(values.get("date_start"))})
        except:
            values.update({"date_start": False})
        try:
            values.update({"date_end": fields.Date.from_string(values.get("date_end"))})
        except:
            values.update({"date_end": False})
        price_id = self.write(values)
        return _("The price has been successfully updated")
