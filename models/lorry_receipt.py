# -*- coding: utf-8 -*-
from odoo import models, fields

class LorryReceipt(models.Model):
    _name = "lorry.receipt"
    _description = "Lorry Receipt (LR)"

    name = fields.Char(string="LR No", required=True)
    dispatch_id = fields.Many2one('route.dispatch', string="Dispatch", ondelete="cascade")
    consignee = fields.Char(string="Consignee Name")
    total_weight = fields.Float(string="Total Weight (KG)")
    status = fields.Selection([
        ('draft', 'Draft'),
        ('dispatched', 'Dispatched'),
        ('delivered', 'Delivered'),
    ], string="Status", default="draft")
