# -*- coding: utf-8 -*-

import logging

from odoo import _, api, fields, models

_logger = logging.getLogger(__name__)


class vendor_stocks_import(models.TransientModel):
    """
    The model to reflect low sold product variants
    """
    _name = "vendor.stock.import"
    _inherit = "vendor.import.wizard"
    _description = 'Import vendor products'

    @api.model
    def _default_template_table_id(self):
        """
        Default method for template_table_id
        """
        attach_id = int(self.env['ir.config_parameter'].sudo().get_param('vendor_stocks_import_id', 0))
        attach_obj = self.env["ir.attachment"]
        return attach_id and attach_obj.browse(attach_id) or attach_obj

    @api.model
    def _default_help_text(self):
        """
        Default method for help_text
        """
        return self.env['ir.config_parameter'].sudo().get_param('vendor_stocks_help', "")

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
    archive_stocks = fields.Boolean(string="Archive previous stocks of this vendor")
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
         1. Archive previous stocks if asked to
         2. Prepare values from the table
         3. Adapt each value format of fields, check for errors
         4. Update / create vendor product
         5. Find vendor location, if not create
         6. Update / create vendor quants

        Methods:
         * _prepare_values of vendor.import.wizard
         * _find_vendor_product of vendor.product
         * _find_or_create_location of vendor.location
         * _parse_float

        Returns:
         * list (results - updated vendor.quants), list (errors)

        Extra info:
         * Expected singleton
        """
        self.ensure_one()
        vendor_product = self.env["vendor.product"]
        vendor_quant = self.env["vendor.quant"]
        vendor_location = self.env["vendor.location"]
        errors = []
        results = []
        #1
        if not self.import_chosen_lines:
            if self.archive_products:
                to_archive = vendor_product.search([("partner_id", "=", self.partner_id.id)])
                to_archive.write({"active": False})
            elif self.archive_stocks:
                to_archive = vendor_quant.search([("partner_id", "=", self.partner_id.id)])
                to_archive.write({"active": False})
        # 2
        fields = ["product_code", "product_name", "description", "vendor_location_id", "delay", "supplier_quantity",
                  "supplier_product_uom_id"]
        values = self._prepare_values(fields, "vendor.product")
        line_num = 1
        for val in values:
            # 3
            line_num += 1
            product_code = val[0]
            product_name = val[1]
            description = val[2]
            location_name = val[3]
            delay, delay_error = self._parse_float(val[4])
            qty, qty_error = self._parse_float(val[5])
            uom_name = val[6]
            if not product_code and not product_name:
                errors.append(
                    _(u"There is no product name or code defined in the line {}. The line is skipped;".format(line_num))
                )
                continue
            if not location_name:
                errors.append(
                    _(u"There is no location defined in the line {}. The line is skipped;".format(line_num))
                )
                continue
            if qty_error or delay_error:
                errors.append(
                    _(u"Not all columns of the line {} are parsed. Errors: {}".format(
                        line_num,
                        qty_error and qty_error or "",
                        delay_error and delay_error or "",
                    ))
                )
            supplier_product_uom_id = False
            if uom_name:
                uom_ids = self.env["uom.uom"].search([("name", "=", uom_name)], limit=1)
                if uom_ids:
                    supplier_product_uom_id = uom_ids.id
                else:
                    errors.append(
                        _(u"Unit of measure name {} of the line {} is not found".format(uom_name, line_num))
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
            # 5
            location_id = vendor_location._find_or_create_location(location_name, self.partner_id, delay)
            # 6
            quant_id = vendor_quant._find_quant(product, location_id)
            vendor_quant_vals = {
                "vendor_product_id": product,
                "vendor_location_id": location_id,
                "supplier_quantity": qty,
                "active": True,
            }
            if supplier_product_uom_id:
                vendor_quant_vals.update({"supplier_product_uom_id": supplier_product_uom_id})
            if not quant_id:
                quant_id = vendor_quant.create(vendor_quant_vals).id
                _logger.debug(u"Vendor quant {} for product {} is created".format(quant_id, product))
            else:
                vendor_quant.browse(quant_id).write(vendor_quant_vals)
                _logger.debug(u"Vendor quant {} for product {} is created".format(quant_id, product))

            if quant_id not in results:
                results.append(quant_id)
            self.env.cr.commit()

        return results, errors
