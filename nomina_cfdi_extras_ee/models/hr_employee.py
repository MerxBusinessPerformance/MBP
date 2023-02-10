# -*- coding: utf-8 -*-

from odoo import models, fields, api, _


class hr_employee(models.Model):
    _inherit = 'hr.employee'

    loan_request = fields.Integer('Solicitud del prestamo por año', default=1, required="1")

# vim:expandtab:smartindent:tabstop=4:softtabstop=4:shiftwidth=4:
