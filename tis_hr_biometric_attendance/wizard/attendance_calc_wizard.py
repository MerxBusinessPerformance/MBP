# -*- coding: utf-8 -*-
# This module and its content is copyright of Technaureus Info Solutions Pvt. Ltd.
# - © Technaureus Info Solutions Pvt. Ltd 2020. All rights reserved.

from odoo import models, _
from datetime import datetime, timedelta


class AttendanceWizard(models.TransientModel):
    _name = 'attendance.calc.wizard'
    _description = 'attendance calc wizard'

    def calculate_attendance(self):
        hr_attendance = self.env['hr.attendance']
        today = datetime.now().strftime("%Y-%m-%d %H:%M:%S")
        domain = [('punching_time', '<=', str(today)), ('is_calculated', '=', False)]
        attendance_log = self.env['attendance.log'].search(domain)
        employee_list = []
        for log in attendance_log:
            if log.employee_id.id in employee_list:
                attd = self.check_in_check_out(log.employee_id.id, log.punching_time)
                attendance = self.env['hr.attendance'].search([('id', '=', attd)])
                attendance.write({'check_out': log.punching_time})
                employee_list.remove(log.employee_id.id)
            else:
                attd = self.check_in_check_out(log.employee_id.id, log.punching_time)
                attendance = self.env['hr.attendance'].search([('id', '=', attd)])
                if attendance and attendance.check_out is False:
                    attendance.write({'check_out': log.punching_time})
                else:
                    hr_attendance.create({'employee_id': log.employee_id.id, 'check_in': log.punching_time})
                    employee_list.append(log.employee_id.id)
            log.is_calculated = True

    def check_in_check_out(self, emp_id, time):
        attendances = self.env['hr.attendance'].search([('employee_id', '=', emp_id), ('check_out', '=', False)])
        if attendances:
            return attendances.id
