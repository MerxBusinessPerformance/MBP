#coding: utf-8

from odoo import _, api, fields, models


class vendor_product(models.Model):
    """
    The model to keep supplier products' list
    """
    _name = "vendor.product"
    _inherit = ["mail.thread", "mail.activity.mixin"]
    _description = "Vendor product"
    _rec_name = "product_name"

    @api.depends("quant_ids.active", "quant_ids", "quant_ids.supplier_quantity", "quant_ids.product_quantity",
                 "quant_ids.uom_error",)
    def _compute_vendor_quantity(self):
        """
        Compute method for vendor_quantity, uom_notes, zero_qty
        """
        for product in self:
            product.vendor_quantity = sum(product.quant_ids.mapped("product_quantity"))
            supplier_qty = sum(product.quant_ids.mapped("supplier_quantity"))
            product.zero_qty = not supplier_qty
            uom_notes = False
            if any(product.quant_ids.mapped("uom_error")):
                uom_notes = _("Calculated quantity might be wrong due to units of measure issues")
            product.uom_notes = uom_notes

    def _inverse_partner_id(self):
        """
        Inverse method for partner_id, product_name, product_code, product_id, product_tmpl_id, delay

        Extra info:
         * sudo() is required since portal users do not have rights for products
        """
        self = self.sudo()
        for product in self:
            if product.product_id and (not product.product_tmpl_id \
                    or product.product_tmpl_id != product.product_id.product_tmpl_id):
                product.product_tmpl_id = product.product_id.product_tmpl_id
            product.price_ids.write({
                "name": product.partner_id.id,
                "product_name": product.product_name,
                "product_code": product.product_code,
                "product_id": product.product_id.id,
                "product_tmpl_id": product.product_tmpl_id.id,
                "delay": product.delay,
            })

    def _inverse_active(self):
        """
        Inverse method for active
        If product is deactivated, we deactivated prices and quants
        If it activated back, we do nothing, since have no idea which were inversed deactivated, which were deactivated
        manually
        """
        for product in self:
            if not product.active:
                product.price_ids.sudo().write({"active": False})
                product.quant_ids.sudo().write({"active": False})

    @api.onchange("product_id")
    def _onchange_product_id(self):
        """
        Onchange method for product_id
        """
        for product in self:
            if product.product_id:
                product.product_tmpl_id = product.product_id.product_tmpl_id

    partner_id = fields.Many2one(
        "res.partner",
        string="Vendor",
        inverse=_inverse_partner_id,
        required=True,
    )
    product_name = fields.Char(string="Vendor product name", inverse=_inverse_partner_id)
    product_code = fields.Char(string="Vendor product code", inverse=_inverse_partner_id)
    product_id = fields.Many2one("product.product", "Product Variant", inverse=_inverse_partner_id)
    product_tmpl_id = fields.Many2one("product.template", "Product Template", inverse=_inverse_partner_id)
    delay = fields.Integer(string="Average Delay", inverse=_inverse_partner_id)
    quant_ids = fields.One2many("vendor.quant", "vendor_product_id", string="Stocks")
    vendor_quantity = fields.Float(
        string="Quantity",
        compute=_compute_vendor_quantity,
        compute_sudo=True,
        store=True,
    )
    uom_notes = fields.Char(
        string="Notes",
        compute=_compute_vendor_quantity,
        compute_sudo=True,
        store=True,
    )
    zero_qty = fields.Float(
        string="Out of stocks",
        compute=_compute_vendor_quantity,
        store=True,
        compute_sudo=True,
    )
    uom_name = fields.Char(related="product_tmpl_id.uom_name", compute_sudo=True)
    price_ids = fields.One2many("product.supplierinfo", "vendor_product_id", string="Prices")
    description = fields.Text(string="Description",)
    company_id = fields.Many2one(
        "res.company",
        "Company",
        default=lambda self: self.env.user.company_id.id,
        index=1,
    )
    active = fields.Boolean(string="Active", default=True, inverse=_inverse_active)
    # to let portal users update products
    activity_date_deadline = fields.Date(compute_sudo=True)

    _order = "product_tmpl_id, product_id, partner_id, id"


    def name_get(self):
        """
        Overloading the method, to reflect parent's name recursively
        """
        result = []
        for product in self:
            name = u"{}{} - {}".format(
                product.product_code and "[{}] ".format(product.product_code) or '',
                product.product_name and product.product_name or '',
                product.partner_id and product.partner_id.name or '',
            )
            result.append((product.id, name))
        return result

    def _creation_subtype(self):
        """
        To track creation
        """
        return self.env.ref("vendor_product_management.mt_vendor_product_new")

    @api.model
    def _find_vendor_product(self, partner_id, product_code, product_name):
        """
        The method to find vendor product by code and name

        Args:
         * partner_id - res.partner object
         * product_code - char
         * product_name - char

        Returns:
         * int - vendor.product id
         * False if any not found
        """
        products = False
        if product_code:
            products = self.search([
                ("partner_id", "=", partner_id.id),
                ("product_code", "=", product_code),
                "|",
                    ("active", "=", True),
                    ("active", "=", False),
            ], limit=1)
        if not products and product_name:
            products = self.search([
                ("partner_id", "=", partner_id.id),
                ("product_name", "=", product_name),
                "|",
                    ("active", "=", True),
                    ("active", "=", False),
            ], limit=1)
        return products and products.id or False