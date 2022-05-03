# -*- coding: utf-8 -*-
from odoo import api, fields, models

class ProductTemplate(models.Model):
    _inherit = 'product.template'

    precio_usd = fields.Float('Venta USD')
    costo_usd = fields.Float('Costo USD')

    @api.model
    def price_update(self):
        for product in self.search([]):
           if product.costo_usd > 0:
               product.standard_price = product.costo_usd * (1 / self.env.ref('base.USD').rate)
       	   if product.precio_usd > 0:
               product.list_price = product.precio_usd * (1 / self.env.ref('base.USD').rate)
       	   	