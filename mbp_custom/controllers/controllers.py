# -*- coding: utf-8 -*-
# from odoo import http


# class MbpCustom(http.Controller):
#     @http.route('/mbp_custom/mbp_custom', auth='public')
#     def index(self, **kw):
#         return "Hello, world"

#     @http.route('/mbp_custom/mbp_custom/objects', auth='public')
#     def list(self, **kw):
#         return http.request.render('mbp_custom.listing', {
#             'root': '/mbp_custom/mbp_custom',
#             'objects': http.request.env['mbp_custom.mbp_custom'].search([]),
#         })

#     @http.route('/mbp_custom/mbp_custom/objects/<model("mbp_custom.mbp_custom"):obj>', auth='public')
#     def object(self, obj, **kw):
#         return http.request.render('mbp_custom.object', {
#             'object': obj
#         })
