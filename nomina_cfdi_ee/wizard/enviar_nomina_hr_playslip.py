from odoo import fields,models



class EnviarNomina(models.TransientModel):
    _name='enviar.nomina'
    _description = 'Enviar nomina'
    
    todos = fields.Boolean(string='Rango')
    rango_de_empleados1 = fields.Integer(string='Rango de empleados')
    rango_de_empleados2 = fields.Integer(string='a')
    
    def envire_de_nomina(self):
        payslip_obj = self.env['hr.payslip']
        self.ensure_one()
        ctx = self._context.copy()
        payslip_id = ctx.get('payslips')
        payslips = payslip_obj.browse(payslip_id)
        if not payslips:
            return 
        
        template = self.env.ref('nomina_cfdi_ee.email_template_payroll', False)
        for payslip in payslips:
            emp_no = int(payslip.employee_id.no_empleado)
            if self.todos:
               if self.rango_de_empleados1 and self.rango_de_empleados2:
                  if emp_no >= self.rango_de_empleados1 and emp_no <= self.rango_de_empleados2:
                     ctx.update({
                        'default_model': 'hr.payslip',
                        'default_res_id': payslip.id,
                        'default_use_template': bool(template),
                        'default_template_id': template.id,
                        'default_composition_mode': 'comment',
                     })
                     vals = self.env['mail.compose.message']._onchange_template_id(template.id, 'comment', 'hr.payslip', payslip.id)
                     mail_message  = self.env['mail.compose.message'].with_context(ctx).create(vals.get('value',{}))
                     mail_message.send_mail()
            else:
               ctx.update({
                        'default_model': 'hr.payslip',
                        'default_res_id': payslip.id,
                        'default_use_template': bool(template),
                        'default_template_id': template.id,
                        'default_composition_mode': 'comment',
               })
               vals = self.env['mail.compose.message']._onchange_template_id(template.id, 'comment', 'hr.payslip', payslip.id)
               mail_message  = self.env['mail.compose.message'].with_context(ctx).create(vals.get('value',{}))
               mail_message.send_mail()
        return True
