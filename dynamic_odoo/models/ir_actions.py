from odoo import fields, models, api
import random
import json


class ActionView(models.Model):
    _inherit = 'ir.actions.act_window.view'

    view_mode = fields.Selection(selection_add=[('plan', 'Planning')], ondelete={'plan': 'cascade'})


ActionView()


class IrActionsActions(models.Model):
    _inherit = "ir.actions.act_window"

    @api.model
    def set_virtual_data(self, record, action_id):
        action_virtual = self.env['ir.actions.center'].search([('action_id', '=', action_id)], limit=1)
        if not len(action_virtual):
            return
        views_order, virtual_views_order = [], eval(action_virtual.views_order or '[]')
        for ac in virtual_views_order:
            ac_exist = list(filter(lambda x: (x[1] == ac), record['views']))
            if len(ac_exist):
                views_order.append(ac_exist[0])
        if len(views_order):
            for ro in record['views']:
                if ro[1] not in virtual_views_order:
                    views_order.append(ro)
        record['name'] = record['display_name'] = action_virtual.name
        if len(views_order):
            record['views'] = views_order

    def read(self, fields=None, load='_classic_read'):
        res = super(IrActionsActions, self).read(fields=fields, load=load)
        for item in res:
            if item.get('id', False) and item.get('views', False):
                self.set_virtual_data(item, item['id'])
        return res


IrActionsActions()


class IrActionsReport(models.Model):
    _inherit = 'ir.actions.report'

    @api.model
    def _render_qweb_html(self, docids, data=None):
        return super(IrActionsReport, self.with_context(REPORT_ID=self.id))._render_qweb_html(docids, data=data)

    def copy_report(self):
        new = self.copy()
        template_view = self.env['ir.ui.view'].search([('key', '=', new.report_name)], limit=1)
        new_template = template_view.with_context(lang=None).duplicate_template(self.id, new.id)
        new.write({
            'xml_id': '%s_cp_%s' % (new.xml_id.split("_cp_")[0], random.getrandbits(30)),
            'name': '%s Copy' % new.name,
            'report_name': new_template.key,
            'report_file': new_template.key,
        })


IrActionsReport()
