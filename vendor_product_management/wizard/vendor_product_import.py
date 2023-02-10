# -*- coding: utf-8 -*-

import logging

from odoo import _, api, fields, models

_logger = logging.getLogger(__name__)


class vendor_product_import(models.TransientModel):
    """
    The model to reflect low sold product variants
    """
    _name = "vendor.product.import"
    _inherit = "vendor.import.wizard"
    _description = 'Import vendor products'

    @api.model
    def _default_template_table_id(self):
        """
        Default method for template_table_id
        """
        attach_id = int(self.env['ir.config_parameter'].sudo().get_param('vendor_product_import_id', 0))
        attach_obj = self.env["ir.attachment"]
        return attach_id and attach_obj.browse(attach_id) or attach_obj

    @api.model
    def _default_help_text(self):
        """
        Default method for help_text
        """
        return self.env['ir.config_parameter'].sudo().get_param('vendor_product_help', "")

    @api.depends("template_table_id")
    def _compute_url(self):
        """
        Compute method for url
        """
        for wiz in self:
            base_url = self.env['ir.config_parameter'].sudo().get_param('web.base.url')
            url = '{}/web/content/{}?download=true'.format(base_url, wiz.template_table_id.id,)
            wiz.url = url

    archive_products = fields.Boolean(string="Archive other products of this vendor")
    archive_prices = fields.Boolean(string="Mark previous prices as outdated")
    template_table_id = fields.Many2one(
        "ir.attachment",
        string="Template",
        default=_default_template_table_id,
        readonly=True,
    )
    help_text = fields.Html(string="Help", default=_default_help_text, readonly=True)
    url = fields.Char(string="Download template", compute=_compute_url, readonly=True)

    def _process_import(self):
        """
        The method to create vendor products & prices
         1. Archive previous products / prices if asked to
         2. Prepare values from the table
         3. Adapt each value format of fields, check for errors
         4. Update / create vendor product
         5. Update / create supplier info (price)

        Methods:
         * _prepare_values of vendor.import.wizard
         * _find_vendor_product of vendor.product
         * _find_exactly_the_same_price of product.supplierinfo
         * _parse_float
         * _parse_date

        Returns:
         * list (results - updated vendor.products), list (errors)

        Extra info:
         * Expected singleton
        """
        self.ensure_one()
        vendor_product = self.env["vendor.product"]
        supplier_info = self.env["product.supplierinfo"]
        errors = []
        results = []
        #1
        if not self.import_chosen_lines:
            if self.archive_products:
                to_archive = vendor_product.search([("partner_id", "=", self.partner_id.id)])
                to_archive.write({"active": False})
            if self.archive_prices:
                to_archive = supplier_info.search([("name", "=", self.partner_id.id)])
                to_archive.write({"active": False})
        # 2
        fields = ["product_code", "product_name", "description", "price", "currency_id", "min_qty", "date_start",
                  "date_end"]
        values = self._prepare_values(fields, "vendor.product")
        line_num = 1
        for val in values:
            # 3
            line_num += 1
            product_code = val[0]
            product_name = val[1]
            description = val[2]
            price, price_error = self._parse_float(val[3])
            currency, currency_error = self._parse_currency(val[4])
            min_qty, min_qty_error = self._parse_float(val[5])
            date_start, date_start_error = self._parse_date(val[6])
            date_end, date_end_error = self._parse_date(val[7])
            if not product_code and not product_name:
                errors.append(
                    _(u"There is no product name or code defined in the line {}. The line is skipped;".format(line_num))
                )
                continue
            if price_error or min_qty_error or date_start_error or date_end_error or currency_error:
                errors.append(
                    _(u"Not all columns of the line {} are parsed. Errors: {} {} {} {} {}".format(
                        line_num,
                        price_error and price_error or "",
                        min_qty_error and min_qty_error or "",
                        date_start_error and date_start_error or "",
                        date_end_error and date_end_error or "",
                        currency_error and currency_error or "",
                    ))
                )
            # 4
            product = vendor_product._find_vendor_product(self.partner_id, product_code, product_name)
            pr_values = {
                "partner_id": self.partner_id.id,
                "active": True,
            }
            if product_code:
                pr_values.update({"product_code": product_code})
            if product_name:
                pr_values.update({"product_name": product_name})
            if description:
                pr_values.update({"description": description})
            if not product:
                product = vendor_product.create(pr_values).id
                _logger.debug(u"Vendor product {} is created".format(product))
            else:
                vendor_product.browse(product).write(pr_values)
                _logger.debug(u"Vendor product {} is updated".format(product))
            if product not in results:
                results.append(product)
            # 5
            supplier_info_id = supplier_info._find_exactly_the_same_price(product, min_qty, date_start, date_end,
                                                                          currency)
            supplier_info_vals = {
                "vendor_product_id": product,
                "price": price,
                "min_qty": min_qty,
                "date_start": date_start,
                "date_end": date_end,
                "currency_id": currency or self.env.user.sudo().company_id.currency_id.id,
                "active": True,
            }
            if not supplier_info_id:
                supplier_info_id = supplier_info.create(supplier_info_vals).id
                _logger.debug(u"Price {} of vendor product is created".format(supplier_info_id, product))
            else:
                supplier_info.browse(supplier_info_id).write(supplier_info_vals)
                _logger.debug(u"Price {} of vendor product is updated".format(supplier_info_id, product))

            self.env.cr.commit()

        return results, errors
