# coding=utf-8
from odoo import models, fields, api,_
import base64
from datetime import datetime
from dateutil.relativedelta import relativedelta
from odoo.tools import DEFAULT_SERVER_DATE_FORMAT
from odoo.exceptions import UserError, Warning
import logging
_logger = logging.getLogger(__name__)

class exportar_cfdi_sua(models.TransientModel):
    _name = 'exportar.cfdi.sua'
    _description = 'Exportar SUA'
    
    start_date = fields.Date('Fecha inicio')
    end_date = fields.Date('Fecha fin')
    employee_id = fields.Many2one("hr.employee",'Empleado')
    file_content = fields.Binary("Archivo")
    tipo_exp_sua = fields.Selection(
        selection=[('0', 'Movmientos'),
                   ('1', 'Datos incapacidades'),
                   ('2', 'Alta'),
                   ('3', 'Datos afiliatorios'),
                   ('4', 'Movimientos de crédito'),
                   ('5', 'Reingreso'),],
        string='Tipo exportación',
    )
    tipo_exp_idse = fields.Selection(
        selection=[('0', 'Alta / Reingreso'),
                   ('1', 'Baja'),
                   ('2', 'Cambio sueldo'),],
        string='Tipo exportación',
    )
    registro_patronal_id = fields.Many2one('registro.patronal', string='Registro patronal')
    

    def print_exportar_cfdi_sua(self):
        file_text = []
        is_idse = self._context.get('idse')
        
        domain = [('fecha','>=',self.start_date),('fecha','<=',self.end_date)]
        domain2 = [('fecha_inicio','>=',self.start_date),('fecha_inicio','<=',self.end_date)]
        domain.append(('state','=', 'done'))
        domain2.append(('state','=', 'done'))
        if self.employee_id:
            domain.append(('employee_id','=', self.employee_id.id))
            domain2.append(('employee_id','=', self.employee_id.id))
        
        if self.registro_patronal_id:
            domain.append(('employee_id.registro_patronal_id','=', self.registro_patronal_id))
            domain2.append(('employee_id.registro_patronal_id','=', self.registro_patronal_id))
            
        ################ EXPORTACIÓN A IDSE #############################
        if is_idse:
            domain.append(('tipo_de_incidencia', '!=','Cambio reg. patronal'))
            f_nomina = []
            in_nomina = []
        ################ EXPORTACIÓN A SUA #############################
        else:
            f_nomina = self.env['faltas.nomina'].search(domain2)
            in_nomina = self.env['incapacidades.nomina'].search(domain)
            infonavit = self.env['credito.infonavit'].search(domain)
        i_nomina = self.env['incidencias.nomina'].search(domain)

        ################ EXPORTACIÓN A IDSE #############################
        lines = 0
        no_guia = ''
        if is_idse:
            for rec in i_nomina:
                #INDICATES THE MOVEMENT TYPE OF THE INCIDENCIA
                if self.tipo_exp_idse == '0': #Alta / Reingreso
                   if rec.tipo_de_incidencia=='Reingreso' or rec.tipo_de_incidencia=='Alta':
                    employee = rec.employee_id
                    if not employee.registro_patronal_id:
                       raise UserError(_('No tiene %s registro patronal configurado') % (employee.name))
                    if len(employee.registro_patronal_id.registro_patronal) != 11:
                       raise UserError(_('La longitud del registro patronal es incorrecto %s')  % (employee.name))
                    data1 = employee.registro_patronal_id.registro_patronal[0:11].ljust(11, ' ') #Registro Patronal
                    if not employee.segurosocial:
                       raise UserError(_('No tiene %s seguro social configurado') % (employee.name))
                    if len(employee.segurosocial) != 11:
                       raise UserError(_('La longitud del número de seguro social es incorrecto %s')  % (employee.name))
                    data3= employee.segurosocial[0:11].ljust(11, ' ') #Número de seguridad social
                    data5 = employee.empleado_paterno and employee.empleado_paterno.replace('ñ','#').replace('Ñ','#').ljust(27, ' ') or '                           ' #Primer apellido
                    data6 = employee.empleado_materno and employee.empleado_materno.replace('ñ','#').replace('Ñ','#').ljust(27, ' ') or '                           ' #Segundo apellido
                    if not employee.empleado_nombre:
                       raise UserError(_('No tiene %s nombre de empleado configurado') % (employee.name))
                    data7 = employee.empleado_nombre.replace('ñ','#').replace('Ñ','#').ljust(27, ' ') #Nombre(s)
                    data8 = '{:06d}'.format(int(round(rec.sueldo_cotizacion_base,2)*100)) or '      ' #Salario base de cotización
                    data9 = '      ' #Filler
                    if not employee.tipoDeTrabajador:
                       raise UserError(_('No tiene %s tipo de trabajador configurado') % (employee.name))
                    data10 = employee.tipoDeTrabajador #Tipo de trabajador
                    if not employee.tipoDeSalario:
                       raise UserError(_('No tiene %s tipo de salario configurado') % (employee.name))
                    data11 = employee.tipoDeSalario #Tipo de salario
                    if not employee.tipoDeJornada:
                       raise UserError(_('No tiene %s tipo de jornada configurado') % (employee.name))
                    data12 = employee.tipoDeJornada #Semana o jornada reducida
                    data13 = rec.fecha.strftime("%d%m%Y") #Fecha de movimiento (inicio de labores)
                    if not employee.unidadMedicina:
                       raise UserError(_('No tiene %s unidad de medicina configurado') % (employee.name))
                    data14 = employee.unidadMedicina and employee.unidadMedicina[0:3].ljust(3, ' ') or '' #Unidad de medicina familiar
                    data15 = '  ' #Filler
                    data16 = '08' #Tipo de movimiento
                    if not employee.no_guia:
                       raise UserError(_('No tiene %s numero de clave de subdelegación configurado (2digitos)') % (employee.name))
                    data17 = employee.no_guia[0:2].ljust(2, ' ') + '400' #Guía
                    if not employee.no_empleado:
                       raise UserError(_('No tiene %s numero de empleado configurado') % (employee.name))
                    data18 = employee.no_empleado.ljust(10, ' ') or '' # número de empleado
                    data19 = ' ' #Filler
                    if not employee.curp:
                       raise UserError(_('No tiene %s CURP configurado') % (employee.name))
                    if len(employee.curp) != 18:
                       raise UserError(_('La longitud del CURP es incorrecto %s')  % (employee.name))
                    data20 = employee.curp.rjust(18, ' ') #Clave única de registro de población
                    data21 = '9' #Identificador
                    file_text.append((data1)+(data3)+(data5)+(data6)+(data7)+(data8)+(data9)+(data10)+(data11)+(data12)+(data13) + \
                                     (data14) +(data15)+(data16)+(data17) +(data18)+(data19) + (data20) +data21 + '\r')
                    lines += 1
                    no_guia = data17

                if self.tipo_exp_idse == '1': #Baja
                   if rec.tipo_de_incidencia=='Baja':
                    employee = rec.employee_id
                    if not employee.registro_patronal_id:
                       raise UserError(_('No tiene %s registro patronal configurado') % (employee.name))
                    if len(employee.registro_patronal_id.registro_patronal) != 11:
                       raise UserError(_('La longitud del registro patronal es incorrecto %s')  % (employee.name))
                    data1 = employee.registro_patronal_id.registro_patronal[0:11].ljust(11, ' ') #Registro Patronal
                    if not employee.segurosocial:
                       raise UserError(_('No tiene %s seguro social configurado') % (employee.name))
                    if len(employee.segurosocial) != 11:
                       raise UserError(_('La longitud del número de seguro social es incorrecto %s')  % (employee.name))
                    data2= employee.segurosocial[0:11].ljust(11, ' ') #Número de seguridad social
                    data3 = employee.empleado_paterno and employee.empleado_paterno.replace('ñ','#').replace('Ñ','#').ljust(27, ' ') or '                           ' #Primer apellido
                    data4 = employee.empleado_materno and employee.empleado_materno.replace('ñ','#').replace('Ñ','#').ljust(27, ' ') or '                           ' #Segundo apellido
                    if not employee.empleado_nombre:
                       raise UserError(_('No tiene %s nombre de empleado configurado') % (employee.name))
                    data5 = employee.empleado_nombre.replace('ñ','#').replace('Ñ','#').ljust(27, ' ') #Nombre(s)
                    data6 = '000000000000000' #Filler
                    data7 = rec.fecha.strftime("%d%m%Y") #Fecha de movimiento (fecha de baja)
                    data8 = '     ' #Filler
                    data9 = '02' #Tipo de movimiento
                    if not employee.no_guia:
                       raise UserError(_('No tiene %s numero de clave de subdelegación configurado (2digitos)') % (employee.name))
                    data10 = employee.no_guia[0:2].ljust(2, ' ') + '400' #Guía
                    if not employee.no_empleado:
                       raise UserError(_('No tiene %s numero de empleado configurado') % (employee.name))
                    data11 = employee.no_empleado.ljust(10, ' ') or ''# número de empleado
                    if not rec.tipo_de_baja:
                       raise UserError(_('No tiene %s tipo de baja configurado') % (employee.name))
                    data12 = rec.tipo_de_baja #Tipo de baja
                    data13 = '                  ' #Filler
                    data14 = '9' #Identificador
                    file_text.append((data1)+(data2)+(data3)+(data4)+(data5)+(data6)+(data7)+(data8)+(data9)+(data10)+(data11)+(data12)+(data13)+(data14)+ '\r')
                    lines += 1
                    no_guia = data10

                if self.tipo_exp_idse == '2': #Cambio salario
                   if rec.tipo_de_incidencia=='Cambio salario':
                    employee = rec.employee_id
                    if not employee.registro_patronal_id:
                       raise UserError(_('No tiene %s registro patronal configurado') % (employee.name))
                    if len(employee.registro_patronal_id.registro_patronal) != 11:
                       raise UserError(_('La longitud del registro patronal es incorrecto %s')  % (employee.name))
                    data1 = employee.registro_patronal_id.registro_patronal[0:11].ljust(11, ' ') #Registro Patronal
                    if not employee.segurosocial:
                       raise UserError(_('No tiene %s seguro social configurado') % (employee.name))
                    if len(employee.segurosocial) != 11:
                       raise UserError(_('La longitud del número de seguro social es incorrecto %s')  % (employee.name))
                    data2= employee.segurosocial[0:11].ljust(11, ' ') #Número de seguridad social
                    data3 = employee.empleado_paterno and employee.empleado_paterno.replace('ñ','#').replace('Ñ','#').ljust(27, ' ') or '                           ' #Primer apellido
                    data4 = employee.empleado_materno and employee.empleado_materno.replace('ñ','#').replace('Ñ','#').ljust(27, ' ') or '                           ' #Segundo apellido
                    if not employee.empleado_nombre:
                       raise UserError(_('No tiene %s nombre de empleado configurado') % (employee.name))
                    data5 = employee.empleado_nombre.replace('ñ','#').replace('Ñ','#').ljust(27, ' ') #Nombre(s)
                    data6 = '{:06d}'.format(int(round(rec.sueldo_cotizacion_base,2)*100)) or '      ' #Salario base de cotización
                    data7 = '      ' #Filler
                    #data7a = ' ' #Filler dua con este espacio vacio o 1
                    if not employee.tipoDeTrabajador:
                       raise UserError(_('No tiene %s tipo de trabajador configurado') % (employee.name))
                    data7a = employee.tipoDeTrabajador #Tipo de trabajador 
                    if not employee.tipoDeSalario:
                       raise UserError(_('No tiene %s tipo de salario configurado') % (employee.name))
                    data8 = employee.tipoDeSalario #Tipo de salario
                    if not employee.tipoDeJornada:
                       raise UserError(_('No tiene %s tipo de jornada configurado') % (employee.name))
                    data9 = employee.tipoDeJornada #Semana o jornada reducida
                    data10 = rec.fecha.strftime("%d%m%Y") #Fecha de movimiento (inicio de labores)
                    data11 = '     ' #Filler
                    data12 = '07' #Tipo de movimiento
                    if not employee.no_guia:
                       raise UserError(_('No tiene %s numero de clave de subdelegación configurado (2digitos)') % (employee.name))
                    data13 = employee.no_guia[0:2].ljust(2, ' ') + '400' #Guía
                    if not employee.no_empleado:
                       raise UserError(_('No tiene %s numero de empleado configurado') % (employee.name))
                    data14 = employee.no_empleado.ljust(10, ' ') or '' # número de empleado
                    data15 = ' ' #Filler
                    if not employee.curp:
                       raise UserError(_('No tiene %s CURP configurado') % (employee.name))
                    if len(employee.curp) != 18:
                       raise UserError(_('La longitud del CURP es incorrecto %s')  % (employee.name))
                    data16 = employee.curp.rjust(18, ' ') #Clave única de registro de población
                    data17 = '9' #Identificador
                    file_text.append((data1)+(data2)+(data3)+(data4)+(data5)+(data6)+(data7)+ data7a +(data8)+(data9)+(data10)+(data11)+(data12)+(data13)+(data14)+\
                                     (data15)+(data16)+(data17)+ '\r')
                    lines += 1
                    no_guia = data13

        ################ EXPORTACIÓN A SUA #############################
        else:
            if self.tipo_exp_sua == '0': ##Movmientos: ausentismo, baja, incapcidad, cambio sueldo
               for rec in f_nomina:
                   if rec.tipo_de_falta != 'Justificada con goce de sueldo':
                      employee = rec.employee_id
                      if not employee.registro_patronal_id:
                         raise UserError(_('No tiene %s registro patronal configurado') % (employee.name))
                      if len(employee.registro_patronal_id.registro_patronal) != 11:
                         raise UserError(_('La longitud del registro patronal es incorrecto %s')  % (employee.name))
                      if not employee.segurosocial:
                         raise UserError(_('No tiene %s seguro social configurado') % (employee.name))
                      if len(employee.segurosocial) != 11:
                         raise UserError(_('La longitud del número de seguro social es incorrecto %s')  % (employee.name))
                      data3 = '11'
                      data4=''
                      if rec.fecha_inicio:
                          data4 = rec.fecha_inicio.strftime("%d%m%Y")
                      data7 = ''
                      folioimss = '        '
                      #if employee.contract_id:
                      data7='0000000' #'{:07d}'.format(int(employee.contract_id.sueldo_diario_integrado*100))
                      file_text.append((employee.registro_patronal_id.registro_patronal[0:11] or '           ')+(employee.segurosocial[0:11] or '           ')+(data3)+(data4)+ \
                                       (folioimss)+'{:02d}'.format(rec.dias)+data7 + '\r')

               for rec in i_nomina: # agrega bajas
                   if rec.tipo_de_incidencia=='Baja':
                      employee = rec.employee_id
                      if not employee.registro_patronal_id:
                         raise UserError(_('No tiene %s registro patronal configurado') % (employee.name))
                      if len(employee.registro_patronal_id.registro_patronal) != 11:
                         raise UserError(_('La longitud del registro patronal es incorrecto %s')  % (employee.name))
                      if not employee.segurosocial:
                         raise UserError(_('No tiene %s seguro social configurado') % (employee.name))
                      if len(employee.segurosocial) != 11:
                         raise UserError(_('La longitud del número de seguro social es incorrecto %s')  % (employee.name))
                      data3 = '02'
                      data4=''
                      if rec.fecha:
                          data4 = rec.fecha.strftime("%d%m%Y")
                      data7 = '0000000'
                      folioimss = '        '
                      diasincidencia = '00'
                      file_text.append((employee.registro_patronal_id.registro_patronal[0:11] or '           ')+(employee.segurosocial[0:11] or '           ')+(data3)+(data4)+(folioimss)+(diasincidencia) + data7 + '\r')

               for rec in in_nomina: # incapacidades
                   employee = rec.employee_id
                   data3 = '12'
                   data4=''
                   if not employee.registro_patronal_id:
                      raise UserError(_('No tiene %s registro patronal configurado') % (employee.name))
                   if len(employee.registro_patronal_id.registro_patronal) != 11:
                      raise UserError(_('La longitud del registro patronal es incorrecto %s')  % (employee.name))
                   if not employee.segurosocial:
                      raise UserError(_('No tiene %s seguro social configurado') % (employee.name))
                   if len(employee.segurosocial) != 11:
                      raise UserError(_('La longitud del número de seguro social es incorrecto %s')  % (employee.name))
                   if len(rec.folio_incapacidad) != 8:
                      raise UserError(_('La longitud del folio de incapacidad es incorrecto %s')  % (employee.name))
                   if rec.fecha:
                       data4 = rec.fecha.strftime("%d%m%Y")
                   data7 = ''
                   #if employee.contract_id:
                   data7='0000000' #'{:07d}'.format(int(employee.contract_id.sueldo_diario_integrado*100)) 
                   file_text.append((employee.registro_patronal_id.registro_patronal[0:11] or '           ')+(employee.segurosocial[0:11] or '')+(data3)+(data4) + \
                                    (rec.folio_incapacidad[0:8]) + '{:02d}'.format(rec.dias) + data7 + '\r')

               for rec in i_nomina: # cambio de sueldo
                   if rec.tipo_de_incidencia=='Cambio salario':
                      employee = rec.employee_id
                      if not employee.registro_patronal_id:
                         raise UserError(_('No tiene %s registro patronal configurado') % (employee.name))
                      if len(employee.registro_patronal_id.registro_patronal) != 11:
                         raise UserError(_('La longitud del registro patronal es incorrecto %s')  % (employee.name))
                      if not employee.segurosocial:
                         raise UserError(_('No tiene %s seguro social configurado') % (employee.name))
                      if len(employee.segurosocial) != 11:
                         raise UserError(_('La longitud del número de seguro social es incorrecto %s')  % (employee.name))
                      data3 = '07'
                      data4=''
                      if rec.fecha:
                          data4 = rec.fecha.strftime("%d%m%Y")
                      data7 = '0000000'
                      folioimss = '        '
                      diasincidencia = '00'
                      if employee.contract_id:
                          data7='{:07d}'.format(int(round(rec.sueldo_cotizacion_base,2)*100))
                      file_text.append((employee.registro_patronal_id.registro_patronal[0:11] or '           ')+(employee.segurosocial[0:11] or '           ')+(data3)+(data4)+(folioimss)+(diasincidencia)+data7 + '\r')

#               for rec in i_nomina:
#                   if rec.tipo_de_incidencia=='Alta':
#                      employee = rec.employee_id
#                      data3 = '08'
#                      data4=''
#                      if rec.fecha:
#                          data4 = rec.fecha.strftime("%d%m%Y")
#                      data7 = '0000000'
#                      folioimss = '        '
#                      diasincidencia = '00'
#                      if employee.contract_id:
#                          data7='{:07d}'.format(int(round(employee.contract_id.sueldo_diario_integrado,2)*100))
#                      file_text.append((employee.registro_patronal[0:11] or '           ')+(employee.segurosocial[0:11] or '           ')+(data3)+(data4)+(folioimss)+(diasincidencia)+data7)


            if self.tipo_exp_sua == '1': ##Tipo Incapacidad
               for rec in in_nomina:
                   employee = rec.employee_id
                   if not employee.registro_patronal_id:
                      raise UserError(_('No tiene %s registro patronal configurado') % (employee.name))
                   if len(employee.registro_patronal_id.registro_patronal) != 11:
                      raise UserError(_('La longitud del registro patronal es incorrecto %s')  % (employee.name))
                   if not employee.segurosocial:
                      raise UserError(_('No tiene %s seguro social configurado') % (employee.name))
                   if len(employee.segurosocial) != 11:
                      raise UserError(_('La longitud del número de seguro social es incorrecto %s')  % (employee.name))
                   data3 = '12'
                   data4=''
                   if rec.fecha:
                       data4 = rec.fecha.strftime("%d%m%Y")
                       fecha_fin = (rec.fecha + relativedelta(days=rec.dias-1)).strftime("%d%m%Y")
                   data5 = '0'
                   if rec.ramo_de_seguro == 'Riesgo de trabajo':
                       data5 = '0001'
                   elif rec.ramo_de_seguro == 'Enfermedad general':
                       data5 = '0002'
                   elif rec.ramo_de_seguro == 'Maternidad':
                       data5 = '0003'
                   data6 = '0'
                   if rec.tipo_de_riesgo == 'Accidente de trabajo':
                       data6 = '1'
                   elif rec.tipo_de_riesgo == 'Accidente de trayecto':
                       data6 = '2'
                   elif rec.tipo_de_riesgo == 'Enfermedad de trabajo':
                       data6 = '3'
                   data7 = '0'
                   if rec.secuela == 'Ninguna':
                       data7 = '0'
                   elif rec.secuela == 'Incapacidad temporal':
                       data7 = '1'
                   elif rec.secuela == 'Valuación inicial provisional':
                       data7 = '2'
                   elif rec.secuela == 'Valuación inicial definitiva':
                       data7 = '3'
                   data8 = '0'
                   if rec.control == 'Unica':
                       data8 = '1'
                   elif rec.control == 'Inicial':
                       data8 = '2'
                   elif rec.control == 'Subsecuente':
                       data8 = '3'
                   elif rec.control == 'Alta médica o ST-2':
                       data8 = '4'
                   if rec.control2 == '01':
                       data8 = '7'
                   elif rec.control2 == '02':
                       data8 = '8'
                   elif rec.control2 == '03':
                       data8 = '9'
                   file_text.append((employee.registro_patronal_id.registro_patronal[0:11] or '           ')+(employee.segurosocial[0:11] or '')+'0'+(data4)+(rec.folio_incapacidad[0:8])+ \
                                    '{:03d}'.format(rec.dias) + data5  + data6 + data7 + data8 + fecha_fin + '\r')

            if self.tipo_exp_sua == '2':  ##Tipo alta
               for rec in i_nomina:
                   if rec.tipo_de_incidencia == 'Alta':
                      employee = rec.employee_id
                      data3 = '02'
                      data4=''
                      if rec.fecha:
                          data4 = rec.fecha.strftime("%d%m%Y")
                      data7 = '00000000'
                      folioimss = '        '
                      diasincidencia = '00'
                      nombre = ''
                      if employee.empleado_paterno:
                           nombre = employee.empleado_paterno + '$'
                      if employee.empleado_materno:
                           nombre = nombre + employee.empleado_materno + '$'
                      if employee.empleado_nombre:
                           nombre = nombre + employee.empleado_nombre
                      nombre = nombre.replace('ñ','¥')
                      nombre= nombre.replace('Ñ','¥')
                      if employee.contract_id:
                          ultimo_sueldo = 0
                          for sueldos in employee.contract_id.historial_salario_ids:
                               if sueldos.fecha_sueldo <= self.end_date:
                                  ultimo_sueldo = sueldos.sueldo_base_cotizacion
                          sdi='{:07d}'.format(int(round(ultimo_sueldo,2)*100))
                      ocupacion = employee.job_title
                      if not employee.registro_patronal_id:
                         raise UserError(_('No tiene %s registro patronal configurado') % (employee.name))
                      if len(employee.registro_patronal_id.registro_patronal) != 11:
                         raise UserError(_('La longitud del registro patronal es incorrecto %s')  % (employee.name))
                      if not employee.segurosocial:
                         raise UserError(_('No tiene %s seguro social configurado') % (employee.name))
                      if len(employee.segurosocial) != 11:
                         raise UserError(_('La longitud del número de seguro social es incorrecto %s')  % (employee.name))
                      if not employee.rfc:
                           raise UserError(_("Faltan RFC del empleado %s") % (employee.name))
                      if len(employee.rfc) != 13:
                         raise UserError(_('La longitud del RFC es incorrecto %s')  % (employee.name))
                      if not employee.curp:
                           raise UserError(_("Faltan CURP del empleado %s") % (employee.name))
                      if len(employee.curp) != 18:
                         raise UserError(_('La longitud del CURP es incorrecto %s')  % (employee.name))
                      if not employee.tipoDeTrabajador:
                           raise UserError(_("Faltan tipo de trabajador del empleado %s") % (employee.name))
                      if not employee.tipoDeJornada:
                           raise UserError(_("Faltan tipo de jornada del empleado %s") % (employee.name))
                      file_text.append((employee.registro_patronal_id.registro_patronal[0:11] or '           ')+(employee.segurosocial[0:11] or '           ') + employee.rfc + employee.curp + \
                                       nombre.ljust(50, ' ') + employee.tipoDeTrabajador + '0' + data4 + sdi + employee.no_empleado.ljust(27, ' ') + folioimss + ' ' + data7 + '\r')

            if self.tipo_exp_sua == '3':  ##Movimiento afiliatorio
               for rec in i_nomina:
                   if rec.tipo_de_incidencia == 'Alta':
                      employee = rec.employee_id
                      data3 = '02'
                      data4=''
                      if rec.fecha:
                          data4 = rec.fecha.strftime("%d%m%Y")
                      data7 = '00000000'
                      folioimss = '        '
                      diasincidencia = '00'
                      nombre = ''
                      if employee.empleado_paterno:
                           nombre = employee.empleado_paterno + '$'
                      if employee.empleado_materno:
                           nombre = nombre + employee.empleado_materno + '$'
                      if employee.empleado_nombre:
                           nombre = nombre + employee.empleado_nombre
                      if employee.contract_id:
                          sdi='{:07d}'.format(int(round(rec.sueldo_base_cotizacion,2)*100))
                      if not employee.job_title:
                         raise UserError(_('No tiene %s puesto configurado') % (employee.name))
                      if employee.gender == 'male':
                           genero = 'M'
                      elif employee.gender == 'female':
                           genero = 'F'
                      if not employee.registro_patronal_id:
                         raise UserError(_('No tiene %s registro patronal configurado') % (employee.name))
                      if len(employee.registro_patronal_id.registro_patronal) != 11:
                         raise UserError(_('La longitud del registro patronal es incorrecto %s')  % (employee.name))
                      if not employee.segurosocial:
                         raise UserError(_('No tiene %s seguro social configurado') % (employee.name))
                      if len(employee.segurosocial) != 11:
                         raise UserError(_('La longitud del número de seguro social es incorrecto %s')  % (employee.name))
                      if not employee.birthday:
                           raise UserError(_("Faltan fecha de cumpleaños del empleado %s") % (employee.name))
                      if not employee.place_of_birth:
                           raise UserError(_("Faltan lugar de nacimiento del empleado %s") % (employee.name))
                      if not employee.unidadMedicina:
                           raise UserError(_("Faltan unidad de medicina del empleado %s") % (employee.name))
                      if not employee.codigo_postal:
                           raise UserError(_("Faltan código postal del domicilio del empleado %s") % (employee.name))
                      file_text.append((employee.registro_patronal_id.registro_patronal[0:11] or '           ')+(employee.segurosocial[0:11] or '           ') + employee.codigo_postal + \
                                        employee.birthday.strftime("%d%m%Y") + employee.place_of_birth.rjust(25, ' ') + '00' + \
                                        employee.unidadMedicina[0:3].ljust(3, ' ') + employee.job_title.rjust(12, ' ') + genero + employee.tipoDeSalario + ' ' + '\r')

            if self.tipo_exp_sua == '4':  ##Credito INFONAVIT
               for rec in infonavit:
                      employee = rec.employee_id
                      if not employee.registro_patronal_id:
                         raise UserError(_('No tiene %s registro patronal configurado') % (employee.name))
                      if len(employee.registro_patronal_id.registro_patronal) != 11:
                         raise UserError(_('La longitud del registro patronal es incorrecto %s')  % (employee.name))
                      if not employee.segurosocial:
                         raise UserError(_('No tiene %s seguro social configurado') % (employee.name))
                      if len(employee.segurosocial) != 11:
                         raise UserError(_('La longitud del número de seguro social es incorrecto %s')  % (employee.name))
                      data4=''
                      if rec.fecha:
                          data4 = rec.fecha.strftime("%d%m%Y")
                      if rec.tipo_de_descuento == '1' or rec.tipo_de_descuento == '3': #4 posciones decimales
                           data5 =  str(rec.valor_descuento).split('.')[0].rjust(4, '0')
                           if rec.valor_descuento > 0:
                              data5b =  str(rec.valor_descuento).split('.')[1].ljust(4, '0')
                           else:
                              data5b =  '000'
                      elif rec.tipo_de_descuento == '2': #3 posciones decimales
                           data5 =  str(rec.valor_descuento).split('.')[0].rjust(5, '0')
                           if rec.valor_descuento > 0:
                              data5b =  str(rec.valor_descuento).split('.')[1].ljust(3, '0')
                           else:
                              data5b =  '000'
                      file_text.append((employee.registro_patronal_id.registro_patronal[0:11] or '           ') + (employee.segurosocial[0:11] or '           ') + rec.no_credito + rec.tipo_de_movimiento + \
                                       data4 + rec.tipo_de_descuento + data5 + data5b + res.aplica_tabla + '\r')

            if self.tipo_exp_sua == '5':  ##Tipo reingreso
               for rec in i_nomina:
                   if rec.tipo_de_incidencia=='Reingreso':
                      if not employee.registro_patronal_id:
                         raise UserError(_('No tiene %s registro patronal configurado') % (employee.name))
                      if len(employee.registro_patronal_id.registro_patronal) != 11:
                         raise UserError(_('La longitud del registro patronal es incorrecto %s')  % (employee.name))
                      if not employee.segurosocial:
                         raise UserError(_('No tiene %s seguro social configurado') % (employee.name))
                      if len(employee.segurosocial) != 11:
                         raise UserError(_('La longitud del número de seguro social es incorrecto %s')  % (employee.name))
                      employee = rec.employee_id
                      data3 = '08'
                      data4=''
                      if rec.fecha:
                          data4 = rec.fecha.strftime("%d%m%Y")
                      data7 = '0000000'
                      folioimss = '        '
                      diasincidencia = '00'
                      if employee.contract_id:
                          data7='{:07d}'.format(int(round(rec.sueldo_base_cotizacion,2)*100))
                      file_text.append((employee.registro_patronal_id.registro_patronal[0:11] or '           ')+(employee.segurosocial[0:11] or '           ')+(data3)+(data4)+(folioimss)+(diasincidencia)+data7 + '\r')

           ####agregar footer IDSE
        if is_idse and lines != 0:
           file_text.append('*************'+ '                                           ' + str(lines).rjust(6, '0') + \
                            '                                                                       ' +  no_guia + '                             ' + '9' + '\r')

        if not file_text:
            raise UserError(_("No hay datos para generar el archivo."))
        
        file_text = '\n'.join(file_text)
        file_text = file_text.encode()
        filename = datetime.now().strftime("%y%m-%d%H%M%S")+'.txt'
        self.write({'file_content':base64.b64encode(file_text)})
        return {
                'type' : 'ir.actions.act_url',
                'url': "/web/content/?model="+self._name+"&id=" + str(self.id) + "&field=file_content&download=true&filename="+filename+'&mimetype=text/plain',
                'target':'self',
                }
        
