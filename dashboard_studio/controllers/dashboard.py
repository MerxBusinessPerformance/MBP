import json
from odoo import http
from odoo.addons.web.controllers import main
from odoo.http import content_disposition, dispatch_rpc, request,Response

serialize_exception = main.serialize_exception

class DashboardExporter(main.ExcelExport):

    @http.route('/web/dashboard/xlsx', type='http', auth="user")
    @serialize_exception
    def test(self, data, token):
        params = json.loads(data)
        response_data = self.from_data(params['data']['labels'], params['data']['rows'])
        return request.make_response(response_data,
                                     headers=[('Content-Disposition', content_disposition(params['file_name'])),
                                              ('Content-Type', self.content_type)],
                                     cookies={'fileToken': token})
