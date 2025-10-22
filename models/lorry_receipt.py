# -*- coding: utf-8 -*-
from odoo import models, fields, api
from datetime import datetime

class LorryReceipt(models.Model):
    _name = "lorry.receipt"
    _description = "Lorry Receipt (LR)"
    _inherit = ['mail.thread', 'mail.activity.mixin']

    name = fields.Char(
        string="LR No",
        required=True,
        copy=False,
        readonly=True,
        default=lambda self: self.env['ir.sequence'].next_by_code('lms.lorry.receipt')
    )

    dispatch_id = fields.Many2one('route.dispatch', string="Dispatch", ondelete="cascade", tracking=True)
    date = fields.Datetime(string="LR Date", default=fields.Datetime.now, tracking=True)

    # Consignor & Consignee Info
    consignor = fields.Char(string="Consignor Name", tracking=True)
    consignee = fields.Char(string="Consignee Name", tracking=True)
    consignee_address = fields.Text(string="Consignee Address")

    # Route/Transport Info
    source_location = fields.Char(string="Source")
    destination_location = fields.Char(string="Destination")
    vehicle_id = fields.Many2one('fleet.vehicle', string="Vehicle")
    driver_id = fields.Many2one('hr.employee', string="Driver")

    # Goods Info
    goods_description = fields.Text(string="Goods Description")
    total_packages = fields.Integer(string="No. of Packages")
    total_weight = fields.Float(string="Total Weight (KG)")
    freight_amount = fields.Float(string="Freight Amount")
    payment_mode = fields.Selection([
        ('to_pay', 'To Pay'),
        ('paid', 'Paid'),
        ('tbb', 'To Be Billed')
    ], string="Payment Mode", default='to_pay')

    # Status & Tracking
    status = fields.Selection([
        ('draft', 'Draft'),
        ('dispatched', 'Dispatched'),
        ('in_transit', 'In Transit'),
        ('delivered', 'Delivered'),
        ('cancelled', 'Cancelled')
    ], string="Status", default="draft", tracking=True)

    delivery_date = fields.Datetime(string="Delivery Date")
    remarks = fields.Text(string="Remarks")

    # Compute helper (for dashboard count etc.)
    @api.depends('status')
    def _compute_status_color(self):
        for rec in self:
            rec.status_color = {
                'draft': 'gray',
                'dispatched': 'blue',
                'in_transit': 'orange',
                'delivered': 'green',
                'cancelled': 'red'
            }.get(rec.status, 'gray')

    status_color = fields.Char(string="Status Color", compute="_compute_status_color")

    # Button Actions
    def action_dispatch(self):
        for rec in self:
            rec.status = 'dispatched'
            rec.dispatch_id = self.env['route.dispatch'].search([], limit=1)
            rec.message_post(body=f"📦 LR {rec.name} dispatched.")

    def action_mark_delivered(self):
        for rec in self:
            rec.status = 'delivered'
            rec.delivery_date = fields.Datetime.now()
            rec.message_post(body=f"✅ LR {rec.name} delivered successfully.")

# # -*- coding: utf-8 -*-
# from odoo import models, fields

# class LorryReceipt(models.Model):
#     _name = "lorry.receipt"
#     _description = "Lorry Receipt (LR)"

#     name = fields.Char(string="LR No", required=True)
#     # dispatch_id = fields.Many2one('route.dispatch', string="Dispatch", ondelete="cascade")
#     consignee = fields.Char(string="Consignee Name")
#     total_weight = fields.Float(string="Total Weight (KG)")
#     status = fields.Selection([
#         ('draft', 'Draft'),
#         ('dispatched', 'Dispatched'),
#         ('delivered', 'Delivered'),
#     ], string="Status", default="draft")
