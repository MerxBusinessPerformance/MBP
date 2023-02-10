from odoo.models import BaseModel, AbstractModel
from odoo import api
from lxml import etree

_fields_view_get = AbstractModel.fields_view_get


class Http(AbstractModel):
    _inherit = 'ir.http'

    def session_info(self):
        result = super(Http, self).session_info()
        if self.env.user.has_group('dashboard_studio.group_dashboard_studio'):
            result['showDashboardEdit'] = True
        return result


@api.model
def fields_view_get(self, view_id=None, view_type='form', toolbar=False, submenu=False):
    res = _fields_view_get(self, view_id=view_id, view_type=view_type, toolbar=toolbar, submenu=submenu)
    res['fieldsGet'] = self.env[self._name].fields_get()
    if view_type == "plan" and 'view.center' in self.env.registry.models and res and 'view_id' in res:
        ui_view = self.env['ir.ui.view']
        view_center = self.env['view.center'].search([['view_id', '=', res['view_id']]], limit=1)
        if len(view_center):
            x_arch, x_fields = ui_view.with_context(DynamicOdo=True).postprocess_and_fields(
                etree.fromstring(view_center.arch), model=self._name)
            res['arch'] = x_arch
            res['fields'] = x_fields

    return res


AbstractModel.fields_view_get = fields_view_get
