from odoo import fields, models, api


class ApprovalButton(models.Model):
    _name = "studio.button"

    name = fields.Char(string="Button Id")
    model_id = fields.Many2one(comodel_name="ir.model", string="Model")
    rule_ids = fields.One2many('studio.approval.rule', 'button_id', string='Rules')


ApprovalButton()


class ApprovalRule(models.Model):
    _name = "studio.approval.rule"

    group_id = fields.Many2one(comodel_name="res.groups", string="Groups")
    button_id = fields.Many2one(comodel_name="studio.button", string="Button")
    description = fields.Char(string="Description")
    # active = fields.Boolean(string="Active")


ApprovalRule()


class ApprovalDetails(models.Model):
    _name = "studio.approval.details"

    res_id = fields.Integer(string="Record Id")
    model_id = fields.Many2one(comodel_name="ir.model", string="Model")
    rule_id = fields.Many2one(comodel_name="studio.approval.rule", string="Rule")
    state = fields.Selection(selection=[['wait', 'Wait'], ['accept', 'Accept'], ['decline', 'Decline']],
                             ondelete='cascade', default="wait")
    user_accepted = fields.Many2one(comodel_name="res.users", string="User Accepted")
    date_accepted = fields.Datetime(string="Date Accepted")

    @api.model
    def get_approval(self, res_id, model):
        model = self.env['ir.model'].search([['model', '=', model]])
        buttons = self.env["studio.button"].search([["model_id", "=", model.id]])
        approval = self.search([["res_id", "=", res_id], ["model_id", "=", model.id]])
        rule_ids, result = [ap.rule_id.id for ap in approval], {}
        for button in buttons:
            for rule in button.rule_ids:
                if rule.id not in rule_ids:
                    self.create({'res_id': res_id, 'model_id': model.id, 'rule_id': rule.id})
        for approval in self.search([["res_id", "=", res_id], ["model_id", "=", model.id]]):
            button_name = approval.rule_id.button_id.name
            if button_name not in result:
                result[button_name] = []
            result[button_name].append({'id': approval.id, 'button': button_name, 'state': approval.state,
                                        'group_id': approval.rule_id.group_id.id,
                                        'group_name': approval.rule_id.group_id.name,
                                        'user_accepted': approval.user_accepted.display_name,
                                        'date_accepted': approval.date_accepted, 'user_id': approval.user_accepted.id})
        return result

    def approval_update(self, values):
        self.write(values)
        notifications, approval = [], self.get_approval(self.res_id, self.model_id.model)
        for user in self.env.user.search([]):
            notifications.append([
                (self._cr.dbname, 'res.partner', user.partner_id.id),
                {'type': 'approval_data', 'approval': approval, 'partner_id': user.partner_id.id}
            ])
        self.env['bus.bus']._sendmany(notifications)


ApprovalDetails()
