# models/contract_management.py
from odoo import models, fields, api
from datetime import date

class LogisticsContract(models.Model):
    _name = "logistics.contract"
    _description = "Logistics Contract"
    _inherit = ['mail.thread', 'mail.activity.mixin']

    name = fields.Char(string="Contract No.", required=True, copy=False, readonly=True,
                       default=lambda self: self.env['ir.sequence'].next_by_code('logistics.contract'))
    partner_id = fields.Many2one('res.partner', string="Party", required=True)
    contract_type = fields.Selection([
        ('customer', 'Customer Contract'),
        ('vendor', 'Vendor Contract'),
        ('transporter', 'Transporter Contract'),
        ('lease', 'Vehicle Lease'),
        ('fuel', 'Fuel Supply'),
    ], string="Type", required=True)
    start_date = fields.Date(string="Start Date", required=True)
    end_date = fields.Date(string="End Date", required=True)
    amount = fields.Float(string="Contract Value")
    status = fields.Selection([
        ('draft', 'Draft'),
        ('active', 'Active'),
        ('expired', 'Expired'),
        ('terminated', 'Terminated'),
    ], string="Status", default='draft', tracking=True)
    route_ids = fields.Many2many('route.dispatch', string="Related Routes")
    vehicle_ids = fields.Many2many('fleet.vehicle', string="Vehicles")
    remarks = fields.Text(string="Remarks")
    attachment_ids = fields.Many2many('ir.attachment', string="Attachments")

    is_expired = fields.Boolean(string="Expired", compute="_compute_is_expired", store=True)

    @api.depends('end_date')
    def _compute_is_expired(self):
        today = date.today()
        for record in self:
            record.is_expired = record.end_date and record.end_date < today

    def action_activate(self):
        self.write({'status': 'active'})

    def action_terminate(self):
        self.write({'status': 'terminated'})
