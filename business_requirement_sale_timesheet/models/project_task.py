# Copyright 2019 Tecnativa - Victor M.M. Torres
# License AGPL-3.0 or later (https://www.gnu.org/licenses/agpl).

from odoo import models, fields, api, _


class ProjectTask(models.Model):
    _inherit = "project.task"

    business_requirement_deliverable_id = fields.Many2one(
        comodel_name="business.requirement.deliverable",
        string="Deliverable",
    )
    business_requirement_id = fields.Many2one(
        "business.requirement", string="Business requirement"
    )

    def action_view_deliverable(self):
        action = self.env.ref(
            "business_requirement_deliverable.action_deliverable_lines"
        ).read()[0]
        action.update(
            {
                "view_mode": "form",
                "views": [],
                "view_id": False,
                "res_id": self.business_requirement_deliverable_id.id,
            }
        )
        return action


class BusinessRequirementExtend(models.Model):
    _inherit = "business.requirement"

    task_ids = fields.One2many('project.task', 'business_requirement_id', string='Tasks', )
    project_id = fields.Many2one(
        comodel_name='project.project',
        string='Project')
