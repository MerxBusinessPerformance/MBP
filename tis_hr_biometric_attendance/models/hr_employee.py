# -*- coding: utf-8 -*-
# This module and its content is copyright of Technaureus Info Solutions Pvt. Ltd.
# - © Technaureus Info Solutions Pvt. Ltd 2020. All rights reserved.

from odoo import api, fields, models, _


class HrEmployee(models.Model):
    _inherit = 'hr.employee'

    biometric_device_ids = fields.One2many('biometric.attendance.devices', 'employee_id', string='Biometric Devices')


class BiometricAttendanceDevices(models.Model):
    _name = 'biometric.attendance.devices'
    _description = 'biometric attendance devices'

    employee_id = fields.Many2one('hr.employee', string='Employee')
    biometric_attendance_id = fields.Char(string='Biometric User ID', required=True)
    device_id = fields.Many2one('biometric.config', string='Biometric Attendance Device', required=True)
