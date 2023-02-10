# -*- coding: utf-8 -*-
# This module and its content is copyright of Technaureus Info Solutions Pvt. Ltd.
# - © Technaureus Info Solutions Pvt. Ltd 2020. All rights reserved.

from odoo import api, fields, models, _
from odoo.addons.base.models.res_partner import _tz_get
import pytz
from datetime import datetime
from ..zk import ZK
from odoo.exceptions import UserError, ValidationError


class BiometricDeviceConfig(models.Model):
    _name = 'biometric.config'
    _description = 'biometric config'

    name = fields.Char(string='Name', required=True)
    device_ip = fields.Char(string='Device IP', required=True)
    port = fields.Integer(string='Port', required=True)
    is_password_set = fields.Boolean(string='Is Password Set')
    device_password = fields.Char(string='Device Password')
    time_zone = fields.Selection(_tz_get, string='Timezone', default=lambda self: self.env.user.tz or 'GMT')
    company_id = fields.Many2one('res.company', default=lambda self: self.env.company, readonly=True)

    def test_device_connection(self):
        ip = self.device_ip
        port = self.port
        password = int(self.device_password)
        zk = ZK(ip, port, password=password,ommit_ping=False)
        try:
            conn = zk.connect()
            if conn:
                zk.disable_device()
                zk.enable_device()
                raise UserError(_("Connection Success"))
            else:
                raise ValidationError(_("Connection Failed"))
        except Exception as e:
            raise UserError(_(e))

    def sync_employees(self):
        uid = 0
        user_id = 0
        uid_list = []
        user_id_list = []
        ip = self.device_ip
        port = self.port
        password = self.device_password
        zk = ZK(ip, port, password=password)
        try:
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
                employees = self.env['hr.employee'].search([])
                for employee in employees:
                    uid += 1
                    user_id += 1
                    biometric_device = employee.biometric_device_ids.search(
                        [('employee_id', '=', employee.id), ('device_id', '=', self.id)])
                    if not biometric_device:
                        employee.biometric_device_ids = [(0, 0, {
                            'employee_id': employee.id,
                            'biometric_attendance_id': user_id,
                            'device_id': self.id,
                        })]
                        zk.set_user(uid, employee.name, 0, '', '', str(user_id))
                return {'name': 'Success Message',
                        'type': 'ir.actions.act_window',
                        'res_model': 'employee.sync.wizard',
                        'view_mode': 'form',
                        'view_type': 'form',
                        'target': 'new'}
            else:
                raise ValidationError("Connection Failed")
        except Exception as e:
            raise UserError(_(e))

    def download_attendance_log(self):
        attend_obj = self.env['attendance.log']
        ip = self.device_ip
        port = self.port
        password = self.device_password
        zk = ZK(ip, port, password=password)
        try:
            conn = zk.connect()
            if conn:
                attendances = zk.get_attendance()
                device = 'F18'
                device_name = zk.get_device_name()
                company_id = self.company_id
                if device_name:
                    device = device_name.split('/')[0]
                    device = device.replace('\x00', '')
                if attendances:
                    for attendance in attendances:
                        atten_time = attendance.timestamp
                        atten_time = datetime.strptime(
                            atten_time.strftime('%Y-%m-%d %H:%M:%S'), '%Y-%m-%d %H:%M:%S')
                        local_tz = pytz.timezone(self.time_zone or 'GMT')
                        local_dt = local_tz.localize(atten_time, is_dst=None)
                        utc_dt = local_dt.astimezone(pytz.utc)
                        utc_dt = utc_dt.strftime("%Y-%m-%d %H:%M:%S")
                        atten_time = datetime.strptime(utc_dt, "%Y-%m-%d %H:%M:%S")
                        atten_time = fields.Datetime.to_string(atten_time)
                        attendance_status = False
                        if attendance.status == 0:
                            attendance_status = '0'
                        elif attendance.status == 1:
                            attendance_status = '1'
                        else:
                            attendance_status = '2'
                        employees = self.env['biometric.attendance.devices'].search(
                            [('biometric_attendance_id', '=', attendance.user_id), ('device_id', '=', self.id)])
                        if len(employees) > 1:
                            employee_id = employees.mapped('employee_id')
                            employee_name = employee_id.mapped('name')
                            raise UserError(_("Two Users have same Biometric User ID %s ") % employee_name)
                        existing_log = attend_obj.search(
                            [('employee_id', '=', employees.employee_id.id), ('punching_time', '=', atten_time)])
                        if employees:
                            if existing_log:
                                for log in existing_log:
                                    if log.is_calculated == True:
                                        vals = {'employee_id': employees.employee_id.id,
                                                'punching_time': atten_time,
                                                'status': attendance_status,
                                                'device': str(device),
                                                'company_id': company_id.id,
                                                'is_calculated': True}
                                    else:
                                        vals = {'employee_id': employees.employee_id.id,
                                                'punching_time': atten_time,
                                                'status': attendance_status,
                                                'device': str(device),
                                                'company_id': company_id.id,
                                                'is_calculated': False}
                                    existing_log.write(vals)
                            else:
                                vals = {'employee_id': employees.employee_id.id,
                                        'punching_time': atten_time,
                                        'status': attendance_status,
                                        'device': str(device),
                                        'company_id': company_id.id,
                                        'is_calculated': False}
                                attend_obj.create(vals)
                    return {'name': 'Success Message',
                            'type': 'ir.actions.act_window',
                            'res_model': 'success.wizard',
                            'view_mode': 'form',
                            'view_type': 'form',
                            'target': 'new'}
            else:
                raise ValidationError("Connection failed")
        except Exception as e:
            raise UserError(_(e))

    def download_attendance_log_new(self):
        devices = self.env["biometric.config"].search([])
        for device in devices:
            device.download_attendance_log()
