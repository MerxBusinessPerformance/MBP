# -*- coding: utf-8 -*-
# This module and its content is copyright of Technaureus Info Solutions Pvt. Ltd.
# - © Technaureus Info Solutions Pvt. Ltd 2020. All rights reserved.

from odoo import api, fields, models, _
from datetime import datetime
import base64
import os
import pytz
import math
from dateutil.relativedelta import relativedelta
from odoo.tools import DEFAULT_SERVER_DATETIME_FORMAT
from pytz import timezone, UTC
import io
from odoo.tools.misc import xlsxwriter


class AttendanceReportWizard(models.TransientModel):
    _name = 'attendance.report.wizard'
    _description = 'attendance report wizard'

    report_from = fields.Selection([('attend', 'From Attendance'),
                                    ('log', 'From Log')],
                                   string='Report', required=True, default='attend')
    date_from = fields.Datetime('From', required=True, default=datetime.today())
    date_to = fields.Datetime('To', required=True, default=datetime.today())
    report_file = fields.Binary('File', readonly=True)
    report_name = fields.Text(string='File Name')
    is_printed = fields.Boolean('Printed', default=False)

    @api.onchange('report_from')
    def onchange_report(self):
        day = datetime.today().day
        date_from = datetime.today() + relativedelta(day=day - 1, hour=00, minute=00, second=00)
        date_to = datetime.today() + relativedelta(day=day - 1, hour=23, minute=59, second=59)
        self.date_from = date_from.strftime("%Y-%m-%d %H:%M:%S")
        self.date_to = date_to.strftime("%Y-%m-%d %H:%M:%S")

    def export_attendance_xlsx(self, fl=None):
        if fl == None:
            fl = ''
        if self.report_from == 'log':
            date_from = self.new_timezone(self.date_from)
            date_to = self.new_timezone(self.date_to)

            domain = [('punching_time', '>=', date_from),
                      ('punching_time', '<=', date_to)]
            attendance_logs = self.env['attendance.log'].search(domain)
            fl = self.print_attendance_logs(attendance_logs)
        elif self.report_from == 'attend':
            date_from = self.new_timezone(self.date_from)
            date_to = self.new_timezone(self.date_to)
            domain = ['|',
                      '&', ('check_in', '>=', date_from), ('check_out', '<=', date_to),
                      '&', '&', ('check_in', '>=', date_from), ('check_in', '<=', date_to), ('check_out', '=', False)]
            attendances = self.env['hr.attendance'].search(domain)
            fl = self.print_attendance_records(attendances)

        output = base64.encodebytes(fl[1])
        context = self.env.args
        ctx = dict(context[2])
        ctx.update({'report_file': output})
        ctx.update({'file': fl[0]})
        self.report_name = fl[0]
        self.report_file = ctx['report_file']
        self.is_printed = True

        return {
            'type': 'ir.actions.act_window',
            'view_type': 'form',
            'view_mode': 'form',
            'res_model': 'attendance.report.wizard',
            'target': 'new',
            'context': ctx,
            'res_id': self.id,
        }


    def action_back(self):
        if self._context is None:
            self._context = {}
        self.is_printed = False
        result = {
            'type': 'ir.actions.act_window',
            'view_type': 'form',
            'view_mode': 'form',
            'res_model': 'attendance.report.wizard',
            'target': 'new',
        }
        return result

    def print_attendance_records(self, attendances):
        str_date1 = str(self.date_from)
        str_date1 = self.new_timezone(self.date_from)

        date1 = datetime.strptime(str_date1, '%Y-%m-%d %H:%M:%S').date()
        day1 = date1.strftime('%d')
        month1 = date1.strftime('%B')
        year1 = date1.strftime('%Y')
        str_date2 = str(self.date_to)
        str_date2 = self.new_timezone(self.date_to)
        date2 = datetime.strptime(str_date2, '%Y-%m-%d %H:%M:%S').date()
        day2 = date2.strftime('%d')
        month2 = date2.strftime('%B')
        year2 = date2.strftime('%Y')
        fl = 'Attendance from ' + day1 + '-' + month1 + '-' + year1 + ' to ' + day2 + '-' + month2 + '-' + year2 + '(' + str(
            datetime.today()) + ')' + '.xlsx'
        output = io.BytesIO()
        workbook = xlsxwriter.Workbook(output)
        worksheet = workbook.add_worksheet('Sheet 1')
        worksheet.set_landscape()

        bold = workbook.add_format({'bold': True, 'border': 1,
                                    'align': 'center'})
        font_left = workbook.add_format({'align': 'left',
                                         'border': 1,
                                         'font_size': 12})
        font_center = workbook.add_format({'align': 'center',
                                           'border': 1,
                                           'valign': 'vcenter',
                                           'font_size': 12})
        font_bold_center = workbook.add_format({'align': 'center',
                                                'border': 1,
                                                'valign': 'vcenter',
                                                'font_size': 12,
                                                'bold': True})
        border = workbook.add_format({'border': 1})

        worksheet.set_column('E:XFD', None, None, {'hidden': True})
        worksheet.set_column('A:E', 20, border)
        worksheet.set_row(0, 20)
        worksheet.merge_range('A1:E1',
                              "Attendance sheet from " + day1 + '-' + month1 + '-' + year1 + ' to ' + day2 + '-' + month2 + '-' + year2,
                              bold)

        row = 2
        col = 0
        worksheet.merge_range(row, col, row + 1, col + 1, "Name of Employee", font_bold_center)
        worksheet.merge_range(row, col + 2, row + 1, col + 2, "Check In", font_bold_center)
        worksheet.merge_range(row, col + 3, row + 1, col + 3, "Check_out", font_bold_center)
        worksheet.merge_range(row, col + 4, row + 1, col + 4, "Difference", font_bold_center)

        row += 2
        for attendance in attendances:
            worksheet.merge_range(row, col, row, col + 1, attendance.employee_id.name, font_left)
            if attendance.check_in:
                check_in = self.new_timezone(attendance.check_in)
            else:
                check_in = '***No Check In***'
            worksheet.write(row, col + 2, check_in, font_center)
            if attendance.check_out:
                check_out = self.new_timezone(attendance.check_out)
            else:
                check_out = '***No Check Out***'

            worksheet.write(row, col + 3, check_out, font_center)

            factor = attendance.in_out_diff < 0 and -1 or 1
            val = abs(attendance.in_out_diff)
            hour, minute = (factor * int(math.floor(val)), int(round((val % 1) * 60)))
            if minute == 60:
                hour += 1
                minute = 0
            diff = ''
            str_min = ''
            if minute <= 9:
                str_min = '0' + str(minute)
            else:
                str_min = str(minute)
            if hour <= 9:
                diff = '0' + str(hour) + ':' + str_min
            else:
                diff = str(hour) + ':' + str_min

            worksheet.write(row, col + 4, diff, font_center)
            row += 1

        workbook.close()
        xlsx_data = output.getvalue()

        return [fl, xlsx_data]

    def new_timezone(self, time):
        user_tz = self.env.user.tz or str(pytz.utc)
        local = pytz.timezone(user_tz)
        display_date_result = datetime.strftime(pytz.utc.localize(time, is_dst=0).astimezone(
            local), "%Y-%m-%d %H:%M:%S")
        return display_date_result

    def to_naive_user_tz(self, datetime):
        tz_name = self.env.user.tz
        tz = tz_name and pytz.timezone(tz_name) or pytz.UTC
        x = pytz.UTC.localize(datetime.replace(tzinfo=None), is_dst=False).astimezone(tz).replace(tzinfo=None)
        return x

    def to_naive_utc(self, datetime):
        tz_name = self.env.user.tz
        tz = tz_name and pytz.timezone(tz_name) or pytz.UTC
        y = tz.localize(datetime.replace(tzinfo=None), is_dst=False).astimezone(pytz.UTC).replace(tzinfo=None)
        return y

    def to_tz(self, datetime):
        tz_name = self.env.user.tz
        tz = pytz.timezone(tz_name) if tz_name else pytz.UTC
        return pytz.UTC.localize(datetime.replace(tzinfo=None), is_dst=False).astimezone(tz).replace(tzinfo=None)

    def convert_timezone(self, time):
        atten_time = datetime.strptime(str(time), '%Y-%m-%d %H:%M:%S')
        atten_time = datetime.strptime(
            atten_time.strftime('%Y-%m-%d %H:%M:%S'), '%Y-%m-%d %H:%M:%S')
        local_tz = pytz.timezone(
            self.env.user.tz or 'GMT')
        local_dt = local_tz.localize(atten_time, is_dst=0)
        utc_dt = local_dt.astimezone(pytz.utc)
        utc_dt = utc_dt.strftime("%Y-%m-%d %H:%M:%S")
        atten_time = datetime.strptime(
            utc_dt, "%Y-%m-%d %H:%M:%S")
        atten_time = fields.Datetime.to_string(atten_time)
        return atten_time

    def print_attendance_logs(self, logs):
        str_date1 = str(self.date_from)
        date1 = datetime.strptime(str(str_date1), '%Y-%m-%d %H:%M:%S').date()
        day1 = date1.strftime('%d')
        month1 = date1.strftime('%B')
        year1 = date1.strftime('%Y')
        str_date2 = str(self.date_to)
        date2 = datetime.strptime(str(str_date2), '%Y-%m-%d %H:%M:%S').date()
        day2 = date2.strftime('%d')
        month2 = date2.strftime('%B')
        year2 = date2.strftime('%Y')
        fl = 'Attendance Log from ' + day1 + '-' + month1 + '-' + year1 + ' to ' + day2 + '-' + month2 + '-' + year2 + '(' + str(
            datetime.today()) + ')' + '.xlsx'

        output = io.BytesIO()
        workbook = xlsxwriter.Workbook(output)
        worksheet = workbook.add_worksheet('Sheet 1')
        worksheet.set_landscape()
        bold = workbook.add_format({'bold': True, 'border': 1,
                                    'align': 'center'})
        font_left = workbook.add_format({'align': 'left',
                                         'border': 1,
                                         'font_size': 12})
        font_center = workbook.add_format({'align': 'center',
                                           'border': 1,
                                           'valign': 'vcenter',
                                           'font_size': 12})
        font_bold_center = workbook.add_format({'align': 'center',
                                                'border': 1,
                                                'valign': 'vcenter',
                                                'font_size': 12,
                                                'bold': True})
        border = workbook.add_format({'border': 1})

        worksheet.set_column('E:XFD', None, None, {'hidden': True})
        worksheet.set_column('A:E', 20, border)
        worksheet.set_row(0, 20)
        worksheet.merge_range('A1:E1',
                              "Attendance Log from " + day1 + '-' + month1 + '-' + year1 + ' to ' + day2 + '-' + month2 + '-' + year2,
                              bold)

        row = 2
        col = 0
        worksheet.merge_range(row, col, row + 1, col + 1, "Name of Employee", font_bold_center)
        worksheet.merge_range(row, col + 2, row + 1, col + 2, "Punching Time", font_bold_center)
        worksheet.merge_range(row, col + 3, row + 1, col + 3, "Status", font_bold_center)
        worksheet.merge_range(row, col + 4, row + 1, col + 4, "Device", font_bold_center)

        row += 2
        for log in logs:
            worksheet.merge_range(row, col, row, col + 1, log.employee_id.name, font_left)
            if log.punching_time:
                punching_time = self.new_timezone(log.punching_time)

            else:
                punching_time = '***No Status***'
            worksheet.write(row, col + 2, punching_time, font_center)
            if log.status == "0":
                status = 'Check In'
            elif log.status == "1":
                status = 'Check Out'
            else:
                status = 'Undefined'
            worksheet.write(row, col + 3, status, font_center)
            worksheet.write(row, col + 4, log.device, font_center)
            row += 1

        workbook.close()
        xlsx_data = output.getvalue()

        return [fl, xlsx_data]
