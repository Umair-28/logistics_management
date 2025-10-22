# -*- coding: utf-8 -*-
from odoo import models, fields, api
from datetime import datetime

class EWayBill(models.Model):
    _name = "eway.bill"
    _description = "E-Way Bill"
    _inherit = ['mail.thread', 'mail.activity.mixin']
    _order = 'id desc'

    name = fields.Char(
        string="Reference",
        required=True,
        copy=False,
        readonly=True,
        default=lambda self: self.env['ir.sequence'].next_by_code('eway.bill')
    )
    dispatch_id = fields.Many2one(
        'route.dispatch',
        string="Route Dispatch",
        ondelete="cascade",
        tracking=True
    )
    ewaybill_no = fields.Char(
        string="E-Way Bill Number",
        required=True,
        tracking=True
    )
    generated_date = fields.Datetime(
        string="Generated Date",
        default=lambda self: fields.Datetime.now(),
        tracking=True
    )
    valid_upto = fields.Datetime(
        string="Valid Upto",
        tracking=True
    )
    vehicle_no = fields.Char(string="Vehicle No")
    transporter_name = fields.Char(string="Transporter Name")
    transporter_gstin = fields.Char(string="Transporter GSTIN")
    total_distance = fields.Float(string="Distance (KM)")
    status = fields.Selection([
        ('draft', 'Draft'),
        ('active', 'Active'),
        ('expired', 'Expired'),
        ('cancelled', 'Cancelled'),
    ], string="Status", default="draft", tracking=True)

    remarks = fields.Text(string="Remarks")

    # Computed field for expiry
    is_expired = fields.Boolean(
        string="Is Expired",
        compute="_compute_is_expired",
        store=True
    )

    @api.depends('valid_upto')
    def _compute_is_expired(self):
        for record in self:
            record.is_expired = bool(record.valid_upto and record.valid_upto < datetime.now())


    # -----------------------------
    # STATUS UPDATE BUTTON ACTIONS
    # -----------------------------
    def action_activate(self):
        for record in self:
            if record.status == 'draft':
                record.status = 'active'
                record.message_post(body="✅ E-Way Bill activated.")
            else:
                raise ValueError("Only draft E-Way Bills can be activated.")

    def action_expire(self):
        for record in self:
            if record.status in ['active']:
                record.status = 'expired'
                record.message_post(body="⚠️ E-Way Bill marked as expired.")
            else:
                raise ValueError("Only active E-Way Bills can be expired.")

    def action_cancel(self):
        for record in self:
            if record.status in ['draft', 'active']:
                record.status = 'cancelled'
                record.message_post(body="🚫 E-Way Bill cancelled.")
            else:
                raise ValueError("Only draft or active E-Way Bills can be cancelled.")
