# -*- coding: utf-8 -*-
from odoo import models, fields, api
from datetime import datetime

class TripSheet(models.Model):
    _name = "trip.sheet"
    _description = "Trip Sheet"
    _inherit = ['mail.thread', 'mail.activity.mixin']
    _order = "id desc"

    name = fields.Char(
        string="Trip No",
        required=True,
        copy=False,
        readonly=True,
        default=lambda self: self.env['ir.sequence'].next_by_code('trip.sheet')
    )

    vehicle_id = fields.Many2one(
        "fleet.vehicle",
        string="Vehicle",
        required=True,
        tracking=True
    )

    driver_id = fields.Many2one(
        "res.partner",
        string="Driver",
        domain=[('is_company', '=', False)],
        required=True,
        tracking=True
    )

    date_start = fields.Datetime(
        string="Start Date",
        default=lambda self: fields.Datetime.now(),
        tracking=True
    )

    date_end = fields.Datetime(
        string="End Date",
        tracking=True
    )

    total_distance = fields.Float(string="Total Distance (km)", tracking=True)
    remarks = fields.Text(string="Remarks")

    status = fields.Selection([
        ('draft', 'Draft'),
        ('in_progress', 'In Progress'),
        ('completed', 'Completed'),
        ('cancelled', 'Cancelled'),
    ], string="Status", default="draft", tracking=True)

    duration_hours = fields.Float(
        string="Duration (hrs)",
        compute="_compute_duration_hours",
        store=True
    )

    @api.depends('date_start', 'date_end')
    def _compute_duration_hours(self):
        for record in self:
            if record.date_start and record.date_end:
                delta = record.date_end - record.date_start
                record.duration_hours = round(delta.total_seconds() / 3600, 2)
            else:
                record.duration_hours = 0.0

    # === Actions ===
    def action_start(self):
        for rec in self:
            rec.status = 'in_progress'

    def action_complete(self):
        for rec in self:
            rec.status = 'completed'
            rec.date_end = fields.Datetime.now()

    def action_cancel(self):
        for rec in self:
            rec.status = 'cancelled'
