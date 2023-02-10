# -*- coding: utf-8 -*-
from odoo import fields, models

class Employee(models.Model):
    _inherit = 'hr.employee'

    no_employee = fields.Char('No de empleado')
