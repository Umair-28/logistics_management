# -*- coding: utf-8 -*-
from odoo import models, fields, api, _
from datetime import datetime

class ProofOfDelivery(models.Model):
    _name = "proof.delivery"
    _description = "Proof of Delivery (POD)"
    _rec_name = "name"
    _order = "delivery_date desc"

    # POD Reference (Auto Sequence)
    name = fields.Char(
        string="POD Reference",
        required=True,
        copy=False,
        readonly=True,
        default=lambda self: self.env['ir.sequence'].next_by_code('lms.proof.delivery')
    )

    # Relationships
    dispatch_id = fields.Many2one('route.dispatch', string="Dispatch", ondelete="set null")
    lorry_receipt_id = fields.Many2one('lorry.receipt', string="Lorry Receipt (LR)", ondelete="set null")

    # Delivery Details
    received_by = fields.Char(string="Received By", required=True)
    delivery_date = fields.Datetime(string="Delivery Date", default=lambda self: fields.Datetime.now())
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
        ('cancelled', 'Cancelled'),
    ], string="Status", default="draft", tracking=True)

    verified_by = fields.Many2one('res.users', string="Verified By", readonly=True)
    verified_date = fields.Datetime(string="Verified Date", readonly=True)

    # ----------------------------------------------
    # LIFECYCLE ACTIONS
    # ----------------------------------------------
    @api.model
    def create(self, vals):
        """Auto-generate sequence for POD"""
        if vals.get('name', _('New')) == _('New'):
            vals['name'] = self.env['ir.sequence'].next_by_code('proof.delivery') or _('New')
        return super(ProofOfDelivery, self).create(vals)

    def action_mark_delivered(self):
        """Mark POD as Delivered"""
        for record in self:
            record.write({
                'status': 'delivered',
                'delivery_date': fields.Datetime.now(),
            })

    def action_verify(self):
        """Mark POD as Verified"""
        for record in self:
            record.write({
                'status': 'verified',
                'verified_by': self.env.user.id,
                'verified_date': fields.Datetime.now(),
            })

    def action_cancel(self):
        """Cancel POD"""
        for record in self:
            record.write({'status': 'cancelled'})
