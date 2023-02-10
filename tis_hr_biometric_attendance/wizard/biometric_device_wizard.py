# -*- coding: utf-8 -*-
# This module and its content is copyright of Technaureus Info Solutions Pvt. Ltd.
# - © Technaureus Info Solutions Pvt. Ltd 2020. All rights reserved.

from odoo import api, fields, models, _
from ..zk import ZK
from odoo.exceptions import ValidationError, UserError


class BiometricDeviceWizard(models.TransientModel):
    _name = 'biometric.device.wizard'
    _description = 'biometric device wizard'

    biometric_id = fields.Many2one('biometric.config', string='Biometric Device', required=True)
    operation_type = fields.Selection([('update', 'Update'), ('scan', 'Scan'), ('remove', 'Remove')], string="Type")

    def confirm_update_with_biometric(self):
        employee_id = self._context.get('active_id')
        employee = self.env['hr.employee'].search([('id', '=', employee_id)])
        biometric_attendance_id = ''
        for line in employee.biometric_device_ids:
            biometric_attendance_id = line.biometric_attendance_id
        ip = self.biometric_id.device_ip
        port = self.biometric_id.port
        password = self.biometric_id.device_password
        zk = ZK(ip, port, password=password)
        conn = zk.connect()
        if conn:
            users = zk.get_users()
            valid = False
            if users:
                for user in users:
                    if user.user_id == biometric_attendance_id:
                        valid = True
                if valid == True:
                    raise ValidationError("Already in machine")
                else:
                    if biometric_attendance_id:
                        zk.set_user(int(biometric_attendance_id), employee.name, 0, '', '', biometric_attendance_id)
                    else:
                        self.update_employee()
            else:
                if biometric_attendance_id:
                    zk.set_user(int(biometric_attendance_id), employee.name, 0, '', '', biometric_attendance_id)
                else:
                    self.update_employee()
            zk.disconnect()
        else:
            raise ValidationError("Connection failed")

    def update_employee(self):
        uid_list = []
        user_id_list = []
        ip = self.biometric_id.device_ip
        port = self.biometric_id.port
        password = self.biometric_id.device_password
        zk = ZK(ip, port, password=password)
        conn = zk.connect()
        if conn:
            zk.disable_device()
            zk.enable_device()
            users = zk.get_users()
            if users:
                for user in users:
                    uid_list.append(user.uid)
                    user_id_list.append(int(user.user_id))
                uid_list.sort()
                user_id_list.sort()
            uid = uid_list[-1]
            user_id = user_id_list[-1]
            employee_id = self._context.get('active_id')
            employee = self.env['hr.employee'].search([('id', '=', employee_id)])
            biometric_device = employee.biometric_device_ids.search(
                [('employee_id', '=', employee.id), ('device_id', '=', self.biometric_id.id)])
            if not biometric_device:
                uid += 1
                user_id += 1
                employee.biometric_device_ids = [(0, 0, {
                    'employee_id': employee.id,
                    'biometric_attendance_id': user_id,
                    'device_id': self.biometric_id.id,
                })]
                zk.set_user(uid, employee.name, 0, '', '', str(user_id))
        else:
            raise ValidationError("Connection Failed")

    def confirm_scan_with_biometric(self):
        employee_id = self._context.get('active_id')
        employee = self.env['hr.employee'].search([('id', '=', employee_id)])
        biometric_attendance_id = ''
        for attendance_id in employee.biometric_device_ids:
            biometric_attendance_id = attendance_id.biometric_attendance_id
        ip = self.biometric_id.device_ip
        port = self.biometric_id.port
        password = self.biometric_id.device_password
        zk = ZK(ip, port, password=password)
        conn = zk.connect()
        if conn:
            users = zk.get_users()
            valid = False
            if users:
                for user in users:
                    if user.user_id == biometric_attendance_id:
                        valid = True
                if valid == True:
                    try:
                        zk.enroll_user(uid=int(biometric_attendance_id), user_id=str(biometric_attendance_id))
                    except Exception as e:
                        raise UserError(_(e))
                    raise ValidationError("Place your finger on the Biometric Device")
                else:
                    raise ValidationError("Not in Machine")
            else:
                raise ValidationError("No Users Log")
        else:
            raise ValidationError("Connection failed")

    def remove_employee_from_biometric(self):
        employee_id = self._context.get('active_id')
        employee = self.env['hr.employee'].search([('id', '=', employee_id)])
        biometric_attendance_id = ''
        for attendance_id in employee.biometric_device_ids:
            biometric_attendance_id = attendance_id.biometric_attendance_id
        ip = self.biometric_id.device_ip
        port = self.biometric_id.port
        password = self.biometric_id.device_password
        zk = ZK(ip, port, password=password)
        conn = zk.connect()
        if conn:
            users = zk.get_users()
            valid = False
            if users:
                for user in users:
                    if user.user_id == biometric_attendance_id:
                        valid = True
                if valid == True:
                    zk.delete_user(user_id=str(biometric_attendance_id))
                    biometric_device = employee.biometric_device_ids.search(
                        [('biometric_attendance_id', '=', biometric_attendance_id),
                         ('device_id', '=', self.biometric_id.id)])
                    biometric_device.unlink()
                else:
                    raise ValidationError("Not in Machine")
            else:
                raise ValidationError("No Users Log")
        else:
            raise ValidationError("Connection failed")


class SuccessWizard(models.TransientModel):
    _name = 'success.wizard'
    _description = 'success wizard'


class EmployeeSyncWizard(models.TransientModel):
    _name = 'employee.sync.wizard'
    _description = 'employee sync wizard'
