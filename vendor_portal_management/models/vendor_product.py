#coding: utf-8

from odoo import _, api, fields, models
from odoo.addons.http_routing.models.ir_http import slug


class vendor_product(models.Model):
    _name = "vendor.product"
    _inherit = ["vendor.product", "portal.mixin",]

    def _compute_access_url(self):
        """
        Overwritting the compute method for access_url to pass our pathes

        Methods:
         * super
        """
        for product in self:
            product.access_url = u'/my/products/{}'.format(slug(product))

    success = fields.Text(help="Tech field for the website")
    error = fields.Text(help="Tech field for the website")

    def get_this_product_values(self):
        """
        The method to retrieve this product values (used for js)

        Returns:
         * dict
           ** id
           ** product_name
           ** product_code
           ** description

        Extra info:
         * Expected singleton
        """
        self.ensure_one()
        return {
            "id": self.id,
            "product_name": self.product_name,
            "product_code": self.product_code,
            "description": self.description,
        }

    @api.model
    def create_product_from_portal(self, values):
        """
        The method to create vendor.product from values and prepare defaults

        Returns:
          * char - url

        Extra info:
         * We purposefully do not pass query params to newly created url to: (a) simplify the code; (b) to avoid
           missing of new product in previous tree search
        """
        partner_id = self.env.user.partner_id.commercial_partner_id.id
        values.update({"partner_id": partner_id})
        product_id = self.create(values)
        url = product_id.access_url
        return url

    def toggle_vendor_product_active(self):
        """
        The method to archive / restore vendor.product from portal

        Extra info:
         * Expected singleton
        """
        self.ensure_one()
        self.write({
           "active": not self.active,
           "success": _(u"The product has been successfully {}".format(self.active and "archived" or "restored")),
        })
        return True

    @api.model
    def return_import_configs(self):
        """
        The method to return import configs (help, template url)

        Returns:
         * dict
        """
        IPsudo = self.env['ir.config_parameter'].sudo()
        vendor_product_help = IPsudo.get_param('vendor_product_help', '')
        price_attach =  IPsudo.get_param('vendor_product_import_id', '')
        vendor_stocks_help = IPsudo.get_param('vendor_stocks_help', '')
        stocks_attach =  IPsudo.get_param('vendor_stocks_import_id', '')
        prices_table = price_attach and '/web/content/{}?download=true'.format(price_attach) or False
        stocks_table = stocks_attach and '/web/content/{}?download=true'.format(stocks_attach) or False
        uom_ids = self.env["uom.uom"].sudo().search([])
        uoms_help = ", ".join(uom_ids.mapped("name"))
        cur_ids = self.env["res.currency"].sudo().search([])
        cur_help = ", ".join(cur_ids.mapped("name"))
        return {
            "vendor_product_help": vendor_product_help or False,
            "vendor_stocks_help": vendor_stocks_help or False,
            "prices_table": prices_table,
            "stocks_table": stocks_table,
            "uoms_help": uoms_help,
            "cur_help": cur_help,
        }

    @api.model
    def import_product_prices_portal(self, values):
        """
        The method to manage import of products and stocks

        Args:
         * dict if values
          ** basis - binary of attachment
          ** import_chosen_lines - bool
          ** line_start - int or empty string
          ** lines_end - int or empty string
          ** archive_products - bool
          ** archive_prices - bool

        Methods:
         * _process_import of vendor.product.import

        Returns:
         * dict:

        """
        if not values.get("basis"):
            errors = [_("File to import is not chosen")]
            results = []
        else:
            import_chosen_lines = values.get("import_chosen_lines")
            lines_start = values.get("lines_start") and int(values.get("lines_start")) or 2
            lines_start = lines_start >= 2 and lines_start or 2
            lines_end = values.get("lines_end") and int(values.get("lines_end")) or 1002
            lines_end = lines_start <= lines_end and lines_end or lines_start
            archive_products = not import_chosen_lines and values.get("archive_products") or False
            archive_prices = not archive_products and values.get("archive_prices") or False
            partner_id = self.env.user.partner_id.commercial_partner_id.id
            import_wizard = self.env["vendor.product.import"].create({
                "partner_id": partner_id,
                "table_to_import": values.get("basis"),
                "import_chosen_lines": import_chosen_lines,
                "lines_start": lines_start,
                "lines_end": lines_end,
                "archive_products": archive_products,
                "archive_prices": archive_prices,
            })
            results, errors = import_wizard.sudo()._process_import()
        return {
            "results": results,
            "num_updated": len(results),
            "errors": "\n".join(errors),
        }

    @api.model
    def import_product_stocks_portal(self, values):
        """
        The method to manage import of products and stocks

        Args:
         * dict if values
          ** basis - binary of attachment
          ** import_chosen_lines - bool
          ** line_start - int or empty string
          ** lines_end - int or empty string
          ** archive_products - bool
          ** archive_prices - bool

        Methods:
         * _process_import of vendor.stock.import

        Returns:
         * dict:

        """
        if not values.get("basis"):
            errors = [_("File to import is not chosen")]
            results = []
        else:
            import_chosen_lines = values.get("import_chosen_lines")
            lines_start = values.get("lines_start") and int(values.get("lines_start")) or 2
            lines_start = lines_start >= 2 and lines_start or 2
            lines_end = values.get("lines_end") and int(values.get("lines_end")) or 1002
            lines_end = lines_start <= lines_end and lines_end or lines_start
            archive_products = not import_chosen_lines and values.get("archive_products") or False
            archive_stocks = not archive_products and values.get("archive_stocks") or False
            partner_id = self.env.user.partner_id.commercial_partner_id.id
            import_wizard = self.env["vendor.stock.import"].create({
                "partner_id": partner_id,
                "table_to_import": values.get("basis"),
                "import_chosen_lines": import_chosen_lines,
                "lines_start": lines_start,
                "lines_end": lines_end,
                "archive_products": archive_products,
                "archive_stocks": archive_stocks,
            })
            results, errors = import_wizard.sudo()._process_import()
        return {
            "results": results,
            "num_updated": len(results),
            "errors": "\n".join(errors),
        }
