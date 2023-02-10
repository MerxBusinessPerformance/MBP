#coding: utf-8

from odoo import _, api, fields, models


class product_supplierinfo(models.Model):
    """
    Overwrite to link with vendor products
     * supplier info may exists without vendor product defined. Vendor product would NOT be automatically created
    """
    _inherit = "product.supplierinfo"

    @api.onchange("vendor_product_id")
    def _onchange_vendor_product_id(self):
        """
        Onchange method for vendor_product_id
        """
        for info in self:
            product = info.vendor_product_id
            if product:
                info.name = product.partner_id
                info.product_id = product.product_id
                info.product_tmpl_id = product.product_tmpl_id
                info.product_name = product.product_name
                info.product_code = product.product_code
                info.delay = product.delay

    vendor_product_id = fields.Many2one("vendor.product", string="Vendor Product")
    active = fields.Boolean(string="Active", default=True)

    @api.model
    def create(self, values):
        """
        Overwrite to make sure that all data is taken from vendor product
         * we can't do that in inverse since some fields are required as name

        Methods:
         *  _update_values_based_on_vendor_product
         * _track_price_changes
        """
        values = self._update_values_based_on_vendor_product(values)
        res = super(product_supplierinfo, self).create(values)
        res._track_price_changes()
        return res

    def write(self, values):
        """
        Overwrite to make sure that all data is taken from vendor product
         * we can't do that in inverse since some fields are required as name

        Methods:
         *  _update_values_based_on_vendor_product
         * _track_price_changes
        """
        values = self._update_values_based_on_vendor_product(values)
        res = super(product_supplierinfo, self).write(values)
        self._track_price_changes()
        return res

    def name_get(self):
        """
        Overloading the method, to reflect parent's name recursively
        """
        result = []
        for product in self:
            if product.check_not_valid():
                name = _("not active")
            else:
                name =  u"{} {}: {} {}".format(
                            product.min_qty,
                            product.product_uom and product.product_uom.name or "",
                            product.price,
                            product.currency_id and product.currency_id.name or "",
                        )
            result.append((product.id, name))
        return result

    def check_not_valid(self):
        """
        The method to check whether current date is valid

        Returns:
         * bool

        Extra info:
         * Expected singleton
        """
        self.ensure_one()
        today = fields.Date.today()
        res = (self.date_start and self.date_start > today) or (self.date_end and self.date_end < today)
        return res

    def _update_values_based_on_vendor_product(self, values):
        """
        The method to prepare values dict based on chosen vendor product and notify parent vendor product in 
        case of changes

        Args:
         * values - dict

        Returns:
         * values - dict
        """
        new_values = values.copy()
        vendor_product = False
        if new_values.get("vendor_product_id"):
            vendor_product = self.env["vendor.product"].browse(new_values.get("vendor_product_id"))
            new_values.update({
                "name": vendor_product.partner_id.id,
                "product_id": vendor_product.product_id.id,
                "product_tmpl_id": vendor_product.product_tmpl_id.id,
                "product_name": vendor_product.product_name,
                "product_code": vendor_product.product_code,
                "delay": vendor_product.delay,
            })

        return new_values

    def _track_price_changes(self):
        """
        The method to notify vendor products if price was changed
        """
        if not self:
            return
        self = self.sudo()    
        tonotify_vendor_products = self.mapped("vendor_product_id") or self.env["vendor.product"]
        if tonotify_vendor_products:
            for tonotify_vendor_product in tonotify_vendor_products:
                tonotify_vendor_products.message_post(
                    subtype_id=self.env.ref("vendor_product_management.mt_vendor_product_price").id, 
                    body=_("Vendor product <b>{}</b> price info is updated.".format(
                        tonotify_vendor_product.name_get()[0][1]
                    )),
                )

    @api.model
    def _find_exactly_the_same_price(self, product, min_qty, date_start, date_end, currency):
        """
        The method to find price to update

        Args:
         * product - vendor.product object
         * min_qty - float
         * date_start - date.date
         * date_end - date.date
         * currency - int - id of res.currency

        Returns:
         * int - product.supplierinfo id
         * False if any not found
        """
        price_id = self.search(
            [
                ("vendor_product_id", "=", product),
                ("min_qty", "=", min_qty),
                ("date_start", "=", date_start),
                ("date_end", "=", date_end),
                ("currency_id", "=", currency),
                "|",
                    ("active", "=", True),
                    ("active", "=", False),
            ],
            limit=1,
        )
        return price_id and price_id.id or False
