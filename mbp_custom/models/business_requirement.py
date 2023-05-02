# -*- coding: utf-8 -*-

from odoo import models, fields, api, _


class BusinessArea(models.Model):
    _name = 'business.area'
    _description = 'Business area to tackle in the requirements'

    name = fields.Char()
    type = fields.Char()

class BusinessProcess(models.Model):
    _name = 'business.process'
    _description = 'Business process related to the requirements'

    name = fields.Char()
    parent_id = fields.Many2one('business.process', string='Proceso padre')
    business_area_id = fields.Many2one('business.area', string='Area de negocio')

class OdooModules(models.Model):
    _name = 'odoo.modules'
    _description = 'Modules enabled in the project'

    name = fields.Char()
    technical_name = fields.Char()
    category = fields.Char()
    type = fields.Selection([
        ('1','Community'),
        ('2', 'Enterprise'),
        ('3', 'OCA'),
        ('4', 'App Store'),
        ('5', 'Custom'),
    ], string='Tipo de modulo'
    )

class BusinessRequirementExtend(models.Model):
    _inherit = 'business.requirement.deliverable'

    business_process_id = fields.Many2many('business.process', string='Procesos de negocio involucrados')
    business_area_id = fields.Many2many('business.area', string='Areas de negocio involucradas')
    odoo_modules_id = fields.Many2many('odoo.modules', string='Modulos afectados')
    task_ids = fields.One2many('project.task', 'business_requirement_deliverable_id', string='Tareas', )
