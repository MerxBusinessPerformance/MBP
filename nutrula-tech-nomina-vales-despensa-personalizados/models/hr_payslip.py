# -*- coding: utf-8 -*-

import datetime
from odoo import models, fields, api
import calendar
import logging


class HRPayslip(models.Model):
    _inherit = 'hr.payslip'

    acumulado_dias_de_trabajo = fields.Float(
        string="Acumulado días trabajados.",
        description=" Solo aplica para la 'última nómina del mes' y suma todas las nóminas del empleado del mes.", compute="_compute_acumulado", store=True)
    acumulado_horas_de_trabajo = fields.Float(
        string="Acumulado horas trabajadas",
        description="Solo aplica para la 'última nómina del mes' y suma todas las nóminas del empleado del mes.", compute="_compute_acumulado", store=True)

    nominas_para_calculo = fields.Many2many(
        'hr.payslip', 'fg_este_campo', 'k_el_otro_campo', compute="_compute_acumulado", store=True)

    @api.depends('mes', 'date_from', 'date_to', 'employee_id', 'worked_days_line_ids')
    def _compute_acumulado(self):
        for esta_nomina in self:
            if not esta_nomina.mes:
                continue
            # Debe ser la ultima nomina para en ella sumar los dias
            # laborales pasados.
            if not esta_nomina.ultima_nomina:
                continue

            mes = int(esta_nomina.mes)
            este_usuario = esta_nomina.employee_id
            state = 'done'
            fecha_inicial, fecha_final = esta_nomina._obtener_rango_fechas(mes)

            dominio = [
                ('date_from', '>=', fecha_inicial),
                ('date_to', '<=', fecha_final),
                ('state', '=', state),
                ('employee_id', '=', este_usuario.id),
                ('ultima_nomina', '=', False),

            ]
            nominas = esta_nomina.env['hr.payslip'].search(dominio)

            nominas = [(0, 0, nom.id) for nom in nominas]

            reglas_a_sumar = ['FJC', 'VAC', 'WORK100']

            dias = 0.0
            horas = 0.0
            for linea in esta_nomina.worked_days_line_ids:
                if linea.code not in reglas_a_sumar:
                    continue
                dias += linea.number_of_days
                horas += linea.number_of_hours

            datos = {
                'acumulado_dias_de_trabajo': dias,
                'acumulado_horas_de_trabajo': horas,
                'nominas_para_calculo': nominas,
            }

            esta_nomina.write(datos)

    def _obtener_rango_fechas(self, mes):
        fecha = datetime.datetime.today()
        anio = fecha.year

        primer_dia, ultimo_dia = calendar.monthrange(anio, mes)

        fecha_inicio = fecha.replace(
            day=primer_dia, month=mes, hour=0, minute=0, second=0)
        fecha_final = fecha.replace(
            day=ultimo_dia, month=mes, hour=23, minute=59, second=59)

        return fecha_inicio, fecha_final
