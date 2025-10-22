# -*- coding: utf-8 -*-
from odoo import models, fields

class EWayBill(models.Model):
    _name = "eway.bill"
    _description = "E-Way Bill"

    name = fields.Char(string="Reference", required=True)
    # dispatch_id = fields.Many2one('route.dispatch', string="Dispatch", ondelete="cascade")
    ewaybill_no = fields.Char(string="E-Way Bill Number")
    valid_upto = fields.Datetime(string="Valid Upto")
    status = fields.Selection([
        ('draft', 'Draft'),
        ('active', 'Active'),
        ('expired', 'Expired'),
    ], string="Status", default="draft")
