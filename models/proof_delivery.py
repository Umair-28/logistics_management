# -*- coding: utf-8 -*-
from odoo import models, fields, api
from datetime import datetime

class ProofOfDelivery(models.Model):
    _name = "proof.delivery"
    _description = "Proof of Delivery (POD)"
    _rec_name = "name"
    _order = "delivery_date desc"

    name = fields.Char(string="POD Reference", required=True, copy=False, default=lambda self: self.env['ir.sequence'].next_by_code('proof.delivery'))
    
    # Relationships
    dispatch_id = fields.Many2one('route.dispatch', string="Dispatch", ondelete="set null")
    lorry_receipt_id = fields.Many2one('lorry.receipt', string="Lorry Receipt (LR)", ondelete="set null")

    # Delivery Details
    received_by = fields.Char(string="Received By", required=True)
    delivery_date = fields.Datetime(string="Delivery Date", default=lambda self: datetime.now())
    remarks = fields.Text(string="Remarks")

    # Supporting Evidence
    pod_document = fields.Binary(string="POD Document (e.g., Signed Copy)")
    pod_filename = fields.Char(string="File Name")
    signature = fields.Binary(string="Receiver Signature")

    # Status Management
    status = fields.Selection([
        ('draft', 'Draft'),
        ('delivered', 'Delivered'),
        ('verified', 'Verified'),
    ], string="Status", default="draft")

    verified_by = fields.Many2one('res.users', string="Verified By")
    verified_date = fields.Datetime(string="Verified Date")

    @api.model
    def create(self, vals):
        if not vals.get('name'):
            vals['name'] = self.env['ir.sequence'].next_by_code('proof.delivery')
        return super(ProofOfDelivery, self).create(vals)

    def action_mark_delivered(self):
        """Mark POD as delivered"""
        self.write({
            'status': 'delivered',
            'delivery_date': datetime.now()
        })

    def action_verify(self):
        """Mark POD as verified by a user"""
        self.write({
            'status': 'verified',
            'verified_by': self.env.user.id,
            'verified_date': datetime.now()
        })
