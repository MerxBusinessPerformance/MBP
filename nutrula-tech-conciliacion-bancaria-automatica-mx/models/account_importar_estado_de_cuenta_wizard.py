# -*- coding: utf-8 -*-

from odoo import models, fields, api, _
from odoo.exceptions import UserError, ValidationError
import mimetypes
from odoo.tools.mimetypes import guess_mimetype

from . import importador
banco_funcion = {
    'bbva': importador.bbva,
    'banamex': importador.banamex,
    'american_express': importador.american_express,
    'banorte': importador.banorte,
    'santander': importador.santander}


class AccountImportarEstadoDeCuenta(models.TransientModel):
    _name = 'account.importar_estado_de_cuenta'
    _description = "Importar estado de cuenta csv, xml"

    nombre = fields.Char('Nombre del fichero')
    fichero = fields.Binary(required=True, string="Estado de cuenta")

    bancos = fields.Selection([
        ('bbva', 'BBVA'),
        ('banamex', 'Banamex'),
        ('american_express', 'American Express'),
        ('banorte', 'Banorte'),
        ('santander', 'Santander'),
    ], default='bbva', required=True)

    def procesar(self):
        self.validar_tipo_de_archivo()
        lineas = banco_funcion[self.bancos](self.fichero)

        estado_de_cuenta = self._context['estado_de_cuenta']

        estado_de_cuenta = self.env['account.bank.statement'].search(
            [('id', '=', estado_de_cuenta)])

        if not estado_de_cuenta:
            self.cancelar()
            raise UserError('No hay un estado de cuenta valido')
        print(lineas)
        estado_de_cuenta.write({'line_ids': [(0, 0, dato)for dato in lineas]})
        self.cancelar()

    def validar_tipo_de_archivo(self):
        if self.fichero:
            if not self.nombre:
                raise ValidationError(_("No has seleccionado un archivo"))
        else:
            # Check the file's extension
            tmp = self.nombre.split('.')
            ext = tmp[len(tmp)-1]
            if not (ext == 'csv' or ext == 'xls'):
                raise ValidationError(_("El fichero debe ser csv o xls"))

    def cancelar(self):
        return {type: 'ir.actions.act_window_close'}
