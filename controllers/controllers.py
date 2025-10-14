# -*- coding: utf-8 -*-
# from odoo import http


# class Lms(http.Controller):
#     @http.route('/lms/lms', auth='public')
#     def index(self, **kw):
#         return "Hello, world"

#     @http.route('/lms/lms/objects', auth='public')
#     def list(self, **kw):
#         return http.request.render('lms.listing', {
#             'root': '/lms/lms',
#             'objects': http.request.env['lms.lms'].search([]),
#         })

#     @http.route('/lms/lms/objects/<model("lms.lms"):obj>', auth='public')
#     def object(self, obj, **kw):
#         return http.request.render('lms.object', {
#             'object': obj
#         })

