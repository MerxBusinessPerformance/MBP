# -*- coding: utf-8 -*-

from odoo import models, fields, api
#import time
#from datetime import datetime
#from dateutil import relativedelta
from datetime import datetime, timedelta, date
import math
from collections import defaultdict
import io
from odoo.tools.misc import xlwt
import base64
#import logging
#_logger = logging.getLogger(__name__)

class CalculoSBC(models.TransientModel):
    _name = 'wizard.sbc.bimestral'
    _description = 'CalculoSBC'

    name = fields.Char("Name")
    employee_id = fields.Many2one('hr.employee', string='Empleado')
    bimestre =  fields.Selection(
        selection=[('1', 'Primero'), 
                   ('2', 'Segundo'),
                   ('3', 'Tercero'),
                   ('4', 'Cuarto'),
                   ('5', 'Quinto'),
                   ('6', 'Sexto'),],
        string='Bimestre', required=True, default='1'
    )
    fecha_aplicacion = fields.Date(string="Fecha aplicación")
    registro_patronal = fields.Char(string='Registro patronal')
    file_data = fields.Binary("File Data")
    detalles = fields.Boolean(string='Mostrar detalles', default=True)
    primer_fecha_inicio = fields.Date(string="Primer mes bimestre", required=True)
    primer_fecha_fin = fields.Date(string="al", required=True)
    segundo_fecha_inicio = fields.Date(string="Segundo mes bimestre", required=True)
    segundo_fecha_fin = fields.Date(string="al", required=True)
    total_empleados = fields.Boolean(string='Empleados sin variables', default=False)

    def dias_vac(self, anos):
       dias_vac = 0
       if anos > 0.01 and anos < 1:
          dias_vac = 6
       elif anos > 1.01 and anos < 2:
          dias_vac = 8
       elif anos > 2.01 and anos < 3:
          dias_vac = 10
       elif anos > 3.01 and anos < 4:
          dias_vac = 12
       elif anos > 4.01 and anos < 9:
          dias_vac = 14
       elif anos > 9.01 and anos < 14:
          dias_vac = 16
       elif anos > 14.01 and anos < 19:
          dias_vac = 18
       elif anos > 19.01 and anos < 22:
          dias_vac = 20
       return dias_vac

    def print_sbc_report(self):
        domain=[('state','=', 'done')]
        domain.append(('date_from','>=',self.primer_fecha_inicio))
        domain.append(('date_to','<=',self.segundo_fecha_fin))
        primer_dia = self.segundo_fecha_fin + timedelta(days=1)
        dias_mes_uno = (self.primer_fecha_fin - self.primer_fecha_inicio + timedelta(days=1)).days
        dias_mes_dos = (self.segundo_fecha_fin - self.segundo_fecha_inicio + timedelta(days=1)).days

        if self.employee_id:
            domain.append(('employee_id','=',self.employee_id.id))

        if self.registro_patronal:
            employee = self.env['hr.employee'].search([('registro_patronal', '=', self.registro_patronal_id.registro_patronal)])
            domain.append(('employee_id', '=', employee.ids))

        payslips = self.env['hr.payslip'].search(domain)
        rules = self.env['hr.salary.rule'].search([('variable_imss', '=', True)])
        payslip_lines = payslips.mapped('line_ids').filtered(lambda x: x.salary_rule_id.id in rules.ids)
        
        workbook = xlwt.Workbook()
        bold = xlwt.easyxf("font: bold on;")
        date_format = xlwt.XFStyle()
        date_format.num_format_str = 'dd/mm/yyyy'

        worksheet = workbook.add_sheet('Nomina')
        
        from_to_date = 'De  %s a %s'%(self.primer_fecha_inicio or '', self.segundo_fecha_fin or '')
        concepto = 'Concepto:  %s'%(self.primer_fecha_inicio)
        
        worksheet.write_merge(1, 1, 0, 4, 'Reporte de cálculo de sueldo base de cotización', bold)
        worksheet.write_merge(2, 2, 0, 4, from_to_date, bold)
        #worksheet.write_merge(3, 3, 0, 4, concepto, bold)
        
        worksheet.write(4, 0, 'No. Empleado', bold)
        worksheet.write(4, 1, 'Empleado', bold)
        worksheet.write(4, 2, 'NSS', bold)
        worksheet.write(4, 3, 'Registro patronal', bold)
        worksheet.write(4, 4, 'Fecha de alta', bold)
        worksheet.write(4, 5, 'Departamento', bold)
        worksheet.write(4, 6, 'Sueldo diario', bold)
        worksheet.write(4, 7, 'Factor de integración', bold)
        worksheet.write(4, 8, 'Dias de antiguedad', bold)
        worksheet.write(4, 9, 'Antiguedad en años', bold)
        worksheet.write(4, 10, 'Antiguedad redondeada', bold)
        worksheet.write(4, 11, 'SDI fijo', bold)
        worksheet.write(4, 12, 'Dias de salario devengado', bold)
        if self.detalles:
           col = 16
        else:
           col = 16
        num_rules = 0
        rule_index = {}
        if self.detalles:
           for rule in rules:
               worksheet.write(4, col, 'Total ' + rule.name, bold)
               worksheet.write(4, col+1, 'Exento ' + rule.name, bold)
               worksheet.write(4, col+2, 'Gravado ' + rule.name, bold)
               rule_index.update({rule.id:col})
               col +=3
               num_rules += 1

        tot_col = col + 1
        worksheet.write(4, tot_col, 'Variable Bimestral', bold)
        worksheet.write(4, tot_col+1, 'Variable diario', bold)
        worksheet.write(4, tot_col+2, 'SBC', bold)
        #employees = defaultdict(dict)
        #employee_payslip = defaultdict(set)
        employees = {}
        new_employees = []
        for line in payslip_lines:
            if line.slip_id.employee_id not in employees:
                employees[line.slip_id.employee_id] = {line.slip_id: []}
            if line.slip_id not in employees[line.slip_id.employee_id]:
                employees[line.slip_id.employee_id].update({line.slip_id: []})
            employees[line.slip_id.employee_id][line.slip_id].append(line)

        if employees:
            employee_ids = self.env['hr.employee'].search([('active', '=', 'True')])
            for empleado in employee_ids:
               no_encontrado = True
               for employee, payslips in employees.items():
                  if employee.id == empleado.id:
                     no_encontrado = False
               if no_encontrado:
                   #_logger.info('agregar %s', empleado.name)
                   new_employees.append(empleado)

        year = self.segundo_fecha_fin.year
        d1 = datetime(year, 1, 1)
        d2 = datetime(year + 1, 1, 1)
        days_year = (d2 - d1).days 

        row = 5
        tipo_nomina = {'O':'Nómina ordinaria', 'E':'Nómina extraordinaria'}
        for employee, payslips in employees.items():
            init_row = row
            total_gravado = 0
            dias_periodo = 0
            if not employee.contract_id:
                continue
            contrato = employee.contract_id[0]
            date1 = datetime(day=self.segundo_fecha_fin.day, month=self.segundo_fecha_fin.month, year=self.segundo_fecha_fin.year) + timedelta(days=1)
            date2 = datetime(day=contrato.date_start.day, month=contrato.date_start.month, year=contrato.date_start.year)
            no_dias = date1- date2
            no_anos = no_dias.days / days_year
            dias_anos = math.ceil(no_anos)
            if dias_anos < 1.0: 
                tablas_cfdi_lines = contrato.tablas_cfdi_id.tabla_antiguedades.filtered(lambda x: x.antiguedad >= dias_anos).sorted(key=lambda x:x.antiguedad)
            else: 
                tablas_cfdi_lines = contrato.tablas_cfdi_id.tabla_antiguedades.filtered(lambda x: x.antiguedad <= dias_anos).sorted(key=lambda x:x.antiguedad, reverse=True)
            tablas_cfdi_line = tablas_cfdi_lines[0]
            factor_integracion = ((365 + tablas_cfdi_line.aguinaldo + (tablas_cfdi_line.vacaciones)* (tablas_cfdi_line.prima_vac/100.0) ) / 365.0 )
            nsbc = factor_integracion * contrato.sueldo_diario
            max_sdi = contrato.tablas_cfdi_id.uma * 25
            if nsbc > max_sdi:
                 nsbc = max_sdi
            worksheet.write(row, 0, employee.no_empleado)
            worksheet.write(row, 1, employee.name)
            worksheet.write(row, 2, employee.segurosocial)
            worksheet.write(row, 3, employee.registro_patronal_id.registro_patronal)
            worksheet.write(row, 4, contrato.date_start, date_format)
            worksheet.write(row, 5, contrato.department_id.name)
            worksheet.write(row, 6, contrato.sueldo_diario)
            worksheet.write(row, 7, round(factor_integracion,6))
            worksheet.write(row, 8, no_dias.days)
            worksheet.write(row, 9, no_anos)
            worksheet.write(row, 10, round(dias_anos,2))
            worksheet.write(row, 11, round(nsbc,4))
            row +=1
            if self.detalles:
               worksheet.write(row, 13, 'Fecha de la nomina', bold)
               worksheet.write(row, 14, 'Tipo', bold)
            row +=1
            total_by_rule = defaultdict(lambda: 0.0)
            total_by_rule1 = defaultdict(lambda: 0.0)
            total_by_rule2 = defaultdict(lambda: 0.0)
            for payslip,lines in payslips.items():
                if self.detalles:
                   worksheet.write(row, 13, payslip.date_from, date_format)
                   worksheet.write(row, 14, tipo_nomina.get(payslip.tipo_nomina,''))

                for line in lines:
                    if self.detalles:
                       worksheet.write(row, rule_index.get(line.salary_rule_id.id), line.total)
                    total_by_rule[line.salary_rule_id.id] += line.total
                    if payslip.date_to < self.segundo_fecha_inicio:
                        total_by_rule1[line.salary_rule_id.id] += line.total
#                        _logger.info("total1: %s", total_by_rule1[line.salary_rule_id.id])
                    else:
                        total_by_rule2[line.salary_rule_id.id] += line.total
#                        _logger.info("total2: %s", total_by_rule2[line.salary_rule_id.id])
                row +=1

            for rule_id, total in total_by_rule.items():
                if self.detalles:
                   worksheet.write(init_row, rule_index.get(rule_id), total)
                #sacamos calculo exento y grvado dependiendo de opción en regla salarial
                regla = self.env['hr.salary.rule'].search([('id', '=', rule_id)])
                if regla.variable_imss_tipo == '001':  # Monto total
                   if self.detalles:
                      worksheet.write(init_row, rule_index.get(rule_id)+1, 0)
                      worksheet.write(init_row, rule_index.get(rule_id)+2, total)
                   total_gravado  += total
                elif regla.variable_imss_tipo == '002': # Pct de UMA
                   bimestre_exento = 0
                   bimestre_gravado = 0
                   if total_by_rule1[rule_id]:   #### calcula exento y gravado para primer mes
                        uma = contrato.tablas_cfdi_id.uma * dias_mes_uno
                        tot_exento = uma * regla.variable_imss_monto/100
                        if total_by_rule1[rule_id] > tot_exento:
                           total_gravado  += total_by_rule1[rule_id]-tot_exento
                           bimestre_gravado += total_by_rule1[rule_id]-tot_exento
                           bimestre_exento += tot_exento
                        else:
                           bimestre_exento += total_by_rule1[rule_id]
                   if total_by_rule2[rule_id]:  #### calcula exento y gravado para segundo mes
                        uma = contrato.tablas_cfdi_id.uma * dias_mes_dos
                        tot_exento = uma * regla.variable_imss_monto/100
                        if total_by_rule2[rule_id] > tot_exento:
                           total_gravado  += total_by_rule2[rule_id]-tot_exento
                           bimestre_gravado += total_by_rule2[rule_id]-tot_exento
                           bimestre_exento += tot_exento
                        else:
                           bimestre_exento += total_by_rule2[rule_id]
                   if self.detalles:
                      worksheet.write(init_row, rule_index.get(rule_id)+1, bimestre_exento)
                      worksheet.write(init_row, rule_index.get(rule_id)+2, bimestre_gravado)
                else:   # Pct de SBC
                   bimestre_exento = 0
                   bimestre_gravado = 0
                   if total_by_rule1[rule_id]:   #### calcula exento y gravado para primer mes
                        msbc = contrato.sueldo_base_cotizacion * dias_mes_uno
                        tot_exento = msbc * regla.variable_imss_monto/100
                        if total_by_rule1[rule_id] > tot_exento:
                           total_gravado  += total_by_rule1[rule_id]-tot_exento
                           bimestre_gravado += total_by_rule1[rule_id]-tot_exento
                           bimestre_exento += tot_exento
                        else:
                           bimestre_exento += total_by_rule1[rule_id]
                   if total_by_rule2[rule_id]:  #### calcula exento y gravado para segundo mes
                        msbc = contrato.sueldo_base_cotizacion * dias_mes_dos
                        tot_exento = msbc * regla.variable_imss_monto/100
                        if total_by_rule2[rule_id] > tot_exento:
                           total_gravado  += total_by_rule2[rule_id]-tot_exento
                           bimestre_gravado += total_by_rule2[rule_id]-tot_exento
                           bimestre_exento += tot_exento
                        else:
                           bimestre_exento += total_by_rule2[rule_id]
                   if self.detalles:
                      worksheet.write(init_row, rule_index.get(rule_id)+1, bimestre_exento)
                      worksheet.write(init_row, rule_index.get(rule_id)+2, bimestre_gravado)

            #dias del periodo, calcula dias de todas las nóminas no solo las que aparecen con gravados
#            dias_lab = 0
            new_domain=[('state','=', 'done')]
            new_domain.append(('date_from','>=',self.primer_fecha_inicio))
            new_domain.append(('date_to','<=',self.segundo_fecha_fin))
            new_domain.append(('employee_id','=',employee.id))
            payslips_days = self.env['hr.payslip'].search(new_domain)
            for pay_day in payslips_days:
                if pay_day.tipo_nomina == 'O':
                   for workline in pay_day.worked_days_line_ids:
                       if workline.code == 'WORK100' or workline.code == 'FJC' or workline.code == 'P025' or workline.code == 'VAC' or workline.code == 'SEPT':
                           dias_periodo += workline.number_of_days

            #poner totales
            if dias_periodo == 0:
               dias_periodo = 1
            resultado = round(nsbc + total_gravado/round(dias_periodo),2)
            if resultado > 25 * contrato.tablas_cfdi_id.uma:
               resultado = 25 * contrato.tablas_cfdi_id.uma
            worksheet.write(init_row, 12, int(round(dias_periodo)))
            worksheet.write(init_row, tot_col, total_gravado)
            if dias_periodo != 0:
              worksheet.write(init_row, tot_col+1, round(total_gravado/round(dias_periodo),2))
              worksheet.write(init_row, tot_col+2, resultado)
            row +=1
                
        if self.total_empleados:
           for empleado2 in new_employees:
               _#logger.info('lista nva %s', empleado2.name)
               if not empleado2.contract_id:
                   continue
               contrato = empleado2.contract_id[0]
               date1 = datetime(day=self.segundo_fecha_fin.day, month=self.segundo_fecha_fin.month, year=self.segundo_fecha_fin.year) + timedelta(days=1)
               date2 = datetime(day=contrato.date_start.day, month=contrato.date_start.month, year=contrato.date_start.year)
               no_dias = date1- date2
               no_anos = no_dias.days / days_year
               dias_anos = math.ceil(no_anos)
               if dias_anos < 1.0: 
                   tablas_cfdi_lines = contrato.tablas_cfdi_id.tabla_antiguedades.filtered(lambda x: x.antiguedad >= dias_anos).sorted(key=lambda x:x.antiguedad) 
               else: 
                   tablas_cfdi_lines = contrato.tablas_cfdi_id.tabla_antiguedades.filtered(lambda x: x.antiguedad <= dias_anos).sorted(key=lambda x:x.antiguedad, reverse=True) 
               tablas_cfdi_line = tablas_cfdi_lines[0]
               uma = contrato.tablas_cfdi_id.uma * 30
               msbc = contrato.sueldo_base_cotizacion * 30
               factor_integracion = ((365 + tablas_cfdi_line.aguinaldo + (tablas_cfdi_line.vacaciones)* (tablas_cfdi_line.prima_vac/100.0) ) / 365.0 )
               nsbc = factor_integracion * contrato.sueldo_diario
               max_sdi = contrato.tablas_cfdi_id.uma * 25
               if nsbc > max_sdi:
                    nsbc = max_sdi
               worksheet.write(row, 0, empleado2.no_empleado)
               worksheet.write(row, 1, empleado2.name)
               worksheet.write(row, 2, empleado2.segurosocial)
               worksheet.write(row, 3, empleado2.registro_patronal)
               worksheet.write(row, 4, contrato.date_start)
               worksheet.write(row, 5, contrato.department_id.name)
               worksheet.write(row, 6, contrato.sueldo_diario)
               worksheet.write(row, 7, round(factor_integracion,6))
               worksheet.write(row, 8, no_dias.days)
               worksheet.write(row, 9, no_anos)
               worksheet.write(row, 10, round(dias_anos,2))
               worksheet.write(row, 11, round(nsbc,4))
               row +=1

        fp = io.BytesIO()
        workbook.save(fp)
        fp.seek(0)
        data = fp.read()
        fp.close()
        
        self.write({'file_data':base64.b64encode(data)})
        action = {
            'name': 'Payslips',
            'type': 'ir.actions.act_url',
            'url': "/web/content/?model="+self._name+"&id=" + str(self.id) + "&field=file_data&download=true&filename=sbc_bimestral.xls",
            'target': 'self',
            }
        return action

    def change_sbc(self):
        domain=[('state','=', 'done')]
        domain.append(('date_from','>=',self.primer_fecha_inicio))
        domain.append(('date_to','<=',self.segundo_fecha_fin))
        primer_dia = self.segundo_fecha_fin + timedelta(days=1)
        dias_mes_uno = (self.primer_fecha_fin - self.primer_fecha_inicio + timedelta(days=1)).days
        dias_mes_dos = (self.segundo_fecha_fin - self.segundo_fecha_inicio + timedelta(days=1)).days

        if self.employee_id:
            domain.append(('employee_id','=',self.employee_id.id))

        if self.registro_patronal:
            employee = self.env['hr.employee'].search([('registro_patronal', '=', self.registro_patronal)])
            domain.append(('employee_id', '=', employee.ids))

        payslips = self.env['hr.payslip'].search(domain)
        rules = self.env['hr.salary.rule'].search([('variable_imss', '=', True)])
        payslip_lines = payslips.mapped('line_ids').filtered(lambda x: x.salary_rule_id.id in rules.ids)

        col = 23
        rule_index = {}
        for rule in rules:
            rule_index.update({rule.id:col})
            col +=3

        #employees = defaultdict(dict)
        #employee_payslip = defaultdict(set)
        employees = {}
        for line in payslip_lines:
            if line.slip_id.employee_id not in employees:
                employees[line.slip_id.employee_id] = {line.slip_id: []}
            if line.slip_id not in employees[line.slip_id.employee_id]:
                employees[line.slip_id.employee_id].update({line.slip_id: []})
            employees[line.slip_id.employee_id][line.slip_id].append(line)
            
            #employees[line.slip_id.employee_id].add(line)
            
            #employee_payslip[line.slip_id.employee_id].add(line.slip_id)
        year = self.segundo_fecha_fin.year
        d1 = datetime(year, 1, 1)
        d2 = datetime(year + 1, 1, 1)
        days_year = (d2 - d1).days

        tipo_nomina = {'O':'Nómina ordinaria', 'E':'Nómina extraordinaria'}
        for employee, payslips in employees.items():
            total_gravado = 0
            dias_periodo = 0
            if not employee.contract_id:
                continue
            contrato = employee.contract_id[0]
            date1 = datetime(day=self.segundo_fecha_fin.day, month=self.segundo_fecha_fin.month, year=self.segundo_fecha_fin.year) + timedelta(days=1)
            date2 = datetime(day=contrato.date_start.day, month=contrato.date_start.month, year=contrato.date_start.year)
            no_dias = date1- date2
            no_anos = no_dias.days / days_year
            dias_anos = math.ceil(no_anos)
            if dias_anos < 1.0: 
                tablas_cfdi_lines = contrato.tablas_cfdi_id.tabla_antiguedades.filtered(lambda x: x.antiguedad >= dias_anos).sorted(key=lambda x:x.antiguedad) 
            else: 
                tablas_cfdi_lines = contrato.tablas_cfdi_id.tabla_antiguedades.filtered(lambda x: x.antiguedad <= dias_anos).sorted(key=lambda x:x.antiguedad, reverse=True) 
            tablas_cfdi_line = tablas_cfdi_lines[0]
            factor_integracion = ((365 + tablas_cfdi_line.aguinaldo + (tablas_cfdi_line.vacaciones)* (tablas_cfdi_line.prima_vac/100.0) ) / 365.0 )
            nsbc = factor_integracion * contrato.sueldo_diario
            max_sdi = contrato.tablas_cfdi_id.uma * 25
            if nsbc > max_sdi:
                 nsbc = max_sdi
            total_by_rule = defaultdict(lambda: 0.0)
            total_by_rule1 = defaultdict(lambda: 0.0)
            total_by_rule2 = defaultdict(lambda: 0.0)
            for payslip,lines in payslips.items():
                for line in lines:
                    total_by_rule[line.salary_rule_id.id] += line.total
                    if payslip.date_to < self.segundo_fecha_inicio:
                        total_by_rule1[line.salary_rule_id.id] += line.total
#                        _logger.info("total1: %s", total_by_rule1[line.salary_rule_id.id])
                    else:
                        total_by_rule2[line.salary_rule_id.id] += line.total
#                        _logger.info("total2: %s", total_by_rule2[line.salary_rule_id.id])

            for rule_id, total in total_by_rule.items():
                #sacamos calculo exento y grvado dependiendo de opción en regla salarial
                regla = self.env['hr.salary.rule'].search([('id', '=', rule_id)])
                if regla.variable_imss_tipo == '001':  # Monto total
                   total_gravado  += total
                elif regla.variable_imss_tipo == '002': # Pct de UMA
                   bimestre_exento = 0
                   bimestre_gravado = 0
                   if total_by_rule1[rule_id]:   #### calcula exento y gravado para primer mes
                        uma = contrato.tablas_cfdi_id.uma * dias_mes_uno
                        tot_exento = uma * regla.variable_imss_monto/100
                        if total_by_rule1[rule_id] > tot_exento:
                           total_gravado  += total_by_rule1[rule_id]-tot_exento
                           bimestre_gravado += total_by_rule1[rule_id]-tot_exento
                           bimestre_exento += tot_exento
                        else:
                           bimestre_exento += total_by_rule1[rule_id]
                   if total_by_rule2[rule_id]:  #### calcula exento y gravado para segundo mes
                        uma = contrato.tablas_cfdi_id.uma * dias_mes_dos
                        tot_exento = uma * regla.variable_imss_monto/100
                        if total_by_rule2[rule_id] > tot_exento:
                           total_gravado  += total_by_rule2[rule_id]-tot_exento
                           bimestre_gravado += total_by_rule2[rule_id]-tot_exento
                           bimestre_exento += tot_exento
                        else:
                           bimestre_exento += total_by_rule2[rule_id]
                else:   # Pct de SBC
                   bimestre_exento = 0
                   bimestre_gravado = 0
                   if total_by_rule1[rule_id]:   #### calcula exento y gravado para primer mes
                        msbc = contrato.sueldo_base_cotizacion * dias_mes_uno
                        tot_exento = msbc * regla.variable_imss_monto/100
                        if total_by_rule1[rule_id] > tot_exento:
                           total_gravado  += total_by_rule1[rule_id]-tot_exento
                           bimestre_gravado += total_by_rule1[rule_id]-tot_exento
                           bimestre_exento += tot_exento
                        else:
                           bimestre_exento += total_by_rule1[rule_id]
                   if total_by_rule2[rule_id]:  #### calcula exento y gravado para segundo mes
                        msbc = contrato.sueldo_base_cotizacion * dias_mes_dos
                        tot_exento = msbc * regla.variable_imss_monto/100
                        if total_by_rule2[rule_id] > tot_exento:
                           total_gravado  += total_by_rule2[rule_id]-tot_exento
                           bimestre_gravado += total_by_rule2[rule_id]-tot_exento
                           bimestre_exento += tot_exento
                        else:
                           bimestre_exento += total_by_rule2[rule_id]

            #dias del periodo, calcula dias de todas las nóminas no solo las que aparecen con gravados
            new_domain=[('state','=', 'done')]
            new_domain.append(('date_from','>=',self.primer_fecha_inicio))
            new_domain.append(('date_to','<=',self.segundo_fecha_fin))
            new_domain.append(('employee_id','=',employee.id))
            payslips_days = self.env['hr.payslip'].search(new_domain)
            for pay_day in payslips_days:
                if pay_day.tipo_nomina == 'O':
                   for workline in pay_day.worked_days_line_ids:
                       if workline.code == 'WORK100' or workline.code == 'FJC' or workline.code == 'P025' or workline.code == 'VAC' or workline.code == 'SEPT':
                           dias_periodo += workline.number_of_days

            #poner totales
            if dias_periodo == 0:
               continue
            resultado = round(nsbc + total_gravado/round(dias_periodo),2)
            if resultado > 25 * contrato.tablas_cfdi_id.uma:
               resultado = 25 * contrato.tablas_cfdi_id.uma
            if employee.contract_ids:
                    #employee.contract_ids[0].write({
                    #                                'sueldo_base_cotizacion' : resultado,
                    #                                })
                    incidencia = self.env['incidencias.nomina'].create({'tipo_de_incidencia':'Cambio salario', 
                                                                   'employee_id': employee.id,
                                                                   'sueldo_mensual': employee.contract_ids[0].wage,
                                                                   'sueldo_diario': employee.contract_ids[0].sueldo_diario,
                                                                   'sueldo_diario_integrado': employee.contract_ids[0].sueldo_diario_integrado,
                                                                   'sueldo_por_horas' : employee.contract_ids[0].sueldo_hora,
                                                                   'sueldo_cotizacion_base': resultado,
                                                                   'fecha': self.fecha_aplicacion,
                                                                   'contract_id': employee.contract_ids[0].id
                                                                   })
                   # incidencia.action_validar()
        return True

        
    
    
