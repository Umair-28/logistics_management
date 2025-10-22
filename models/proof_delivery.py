# -*- coding: utf-8 -*-
from odoo import models, fields

class ProofOfDelivery(models.Model):
    _name = "proof.delivery"
    _description = "Proof of Delivery (POD)"

    name = fields.Char(string="POD Reference", required=True)
    dispatch_id = fields.Many2one('route.dispatch', string="Dispatch", ondelete="cascade")
    received_by = fields.Char(string="Received By")
    delivery_date = fields.Datetime(string="Delivery Date")
    remarks = fields.Text(string="Remarks")
