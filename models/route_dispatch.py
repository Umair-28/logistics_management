# -*- coding: utf-8 -*-
from odoo import models, fields, api
from datetime import datetime

class RouteDispatch(models.Model):
    _name = "route.dispatch"
    _description = "Route Dispatch"
    _inherit = ['mail.thread', 'mail.activity.mixin']  # Adds chatter + activities

    # Basic Info
    name = fields.Char(string="Dispatch No", copy=False, readonly=True,default=lambda self: self.env['ir.sequence'].next_by_code('lms.route.dispatch'))

    dispatch_date = fields.Datetime(string="Dispatch Date", default=fields.Datetime.now, tracking=True)
    vehicle_id = fields.Many2one('fleet.vehicle', string="Vehicle", tracking=True)
    driver_id = fields.Many2one('hr.employee', string="Driver", domain=[('is_driver', '=', True)], tracking=True)
    route_id = fields.Many2one('lms.route.master', string="Route", tracking=True)

    # Route Details
    source_location = fields.Char(string="Source Location")
    destination_location = fields.Char(string="Destination Location")
    distance_km = fields.Float(string="Distance (KM)")
    estimated_time = fields.Float(string="Estimated Time (Hours)")

    # Trip Status
    status = fields.Selection([
        ('draft', 'Draft'),
        ('in_transit', 'In Transit'),
        ('completed', 'Completed'),
        ('cancelled', 'Cancelled'),
    ], string="Status", default='draft', tracking=True)

    # Related documents
    trip_sheet_id = fields.Many2one('trip.sheet', string="Trip Sheet")
    lr_ids = fields.One2many('lorry.receipt', 'dispatch_id', string="Lorry Receipts")
    pod_ids = fields.One2many('proof.delivery', 'dispatch_id', string="Proof of Delivery")
    ewaybill_ids = fields.One2many('eway.bill', 'dispatch_id', string="E-Way Bills")

    # Performance & Fuel
    total_fuel = fields.Float(string="Fuel Consumed (L)")
    mileage = fields.Float(string="Mileage (KM/L)")
    remarks = fields.Text(string="Remarks")

    # Computed fields
    total_lr = fields.Integer(string="Total LRs", compute="_compute_total_lr", store=True)

    @api.depends('lr_ids')
    def _compute_total_lr(self):
        for record in self:
            record.total_lr = len(record.lr_ids)

    # Actions
    def action_start_trip(self):
        for rec in self:
            rec.status = 'in_transit'
            rec.message_post(body=f"🚚 Trip started for Dispatch {rec.name}")

    def action_complete_trip(self):
        for rec in self:
            rec.status = 'completed'
            rec.message_post(body=f"✅ Trip completed for Dispatch {rec.name}")

    def action_cancel_trip(self):
        for rec in self:
            rec.status = 'cancelled'
            rec.message_post(body=f"❌ Dispatch {rec.name} cancelled.")

