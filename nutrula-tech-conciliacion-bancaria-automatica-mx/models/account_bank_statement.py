# -*- coding: utf-8 -*-

from odoo import models, fields, api
from odoo.exceptions import UserError


class AccountBankStatement(models.Model):
    _inherit = 'account.bank.statement'

    def importar_estado_de_cuenta(self):

        action = self.env.ref(
            'nutrula-tech-conciliacion-bancaria-automatica-mx.nutrula_teach_importar_estado_de_cuenta').read()[0]

        action['context'] = {
            'estado_de_cuenta': self.id
        }
        return action
