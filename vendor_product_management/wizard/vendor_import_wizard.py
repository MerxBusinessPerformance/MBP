# -*- coding: utf-8 -*-

import base64

from odoo import _, api, fields, models
from odoo.exceptions import UserError


class vendor_import_wizard(models.TransientModel):
    """
    The model to keep basic features of vendor imports
    """
    _name = 'vendor.import.wizard'
    _description = 'Import vendor products'

    partner_id = fields.Many2one("res.partner", string="Vendor")
    table_to_import = fields.Binary(string="Table to import")
    import_chosen_lines = fields.Boolean(string="Import only chosen lines")
    lines_start = fields.Integer(string="Lines", default=2)
    lines_end = fields.Integer(string="End", default=1002)

    _sql_constraints = [
        ('check_positive_start', 'check (lines_start>=2)',
         _('Starting line should be at least 2, the first line is always a header!')),
        ('check_range', 'check (lines_end >= lines_start)',
        _('The last line to import should be bigger than the first line to import!')),
    ]

    def action_import(self):
        """
        The method to process import and open results in backend

        Methods:
         * _process_import

        Returns:
         * ir.actions.act.window

        Extra info:
         * Expected singleton
        """
        self.ensure_one()
        results, errors = self._process_import()
        wizard_id = self.env["vendor.import.result"].create({
            "model": self._name,
            "errors": "\n".join(errors),
            "record_ids": results,
            "record_num": len(results),
        })
        action = self.sudo().env.ref("vendor_product_management.vendor_import_result_action").read()[0]
        action["res_id"] = wizard_id.id
        return action

    @api.model
    def _parse_float(self, value):
        """
        The method to retrieve float from xlsx string
        Here we already have the value optimized by base import

        Args:
         * value - string

        Returns:
         * float
         * char
        """
        try:
            res = value and float(value) or 0.0
            error = False
        except Exception as e:
            res = 0.0
            error = _(u"'{}' can't be converted to float. It is considered as 0; ".format(value))
        return res, error

    @api.model
    def _parse_date(self, value):
        """
        The method to retrieve date from xlsx string
        Here we already have the value optimized by base import

        Args:
         * value - string

        Returns:
         * date.date or False
         * char
        """
        try:
            res = value and fields.Date.from_string(value) or False
            error = False
        except Exception as e:
            res = False
            error = _(u"'{}' can't be converted to date; ".format(value))
        return res, error

    @api.model
    def _parse_currency(self, value):
        """
        The method to find currency by name

        Args:
         * value - string

        Returns:
         * float
         * char
        """
        error = res = False
        if value:
            currency_id = self.env["res.currency"].search([("name", "=", value)], limit=1)
            if currency_id:
                res = currency_id.id
            else:
                error = _(u"Currency '{}' doesn't exist in Odoo; ".format(value))
        return res, error

    def _prepare_values(self, fields, res_model):
        """
        The method to prepare values based on uploaded files

        Args:
         * fields - lsit of field names
         * res_model - name of imported model

        Methods:
         * urlsafe_b64decode of base64
         * _convert_import_data of base_import.import

        Returns:
         * list of lists of each field value

        Raises:
         * UserError if start line

        Extra info:
         * Expected singleton
        """
        self.ensure_one()
        start_line = 0
        end_line = False
        if self.import_chosen_lines:
            start_line = self.lines_start - 2 #since the first is header and lines start with 12
            end_line = self.lines_end - 1
        decoded_table = base64.urlsafe_b64decode(self.table_to_import)
        import_id = self.env["base_import.import"].create({
            "res_model": res_model,
            "file": decoded_table,
        })
        options = {"has_headers": True}
        values = import_id._convert_import_data(fields, options)[0]
        if end_line:
            if len(values) >= end_line + 1:
                values = values[start_line:end_line]
            elif len(values) >= start_line + 1:
                values = values[start_line:]
            else:
                raise UserError(_("No lines found according to your range"))
        return values

    def _process_import(self):
        """
        The method to to implement logic of imports: create/update real Odoo objects
        """
        raise NotImplementedError
