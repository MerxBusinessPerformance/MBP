# -*- coding: utf-8 -*-
from odoo import api, fields, models, _
#import datetime
from datetime import datetime, timedelta
import logging
_logger = logging.getLogger(__name__)

class Contract(models.Model):
    _inherit = "hr.contract"
    
    @api.onchange('wage')
    def _compute_sueldo(self):
        if self.wage:
            dias_de_mes = 30.4
            values = {
                'sueldo_diario': self.wage/dias_de_mes,
                'sueldo_hora': self.wage/dias_de_mes/8,
                'sueldo_diario_integrado': self.calculate_sueldo_diario_integrado(),
                'sueldo_base_cotizacion': self.calculate_sueldo_base_cotizacion(),
            }
            self.update(values)
