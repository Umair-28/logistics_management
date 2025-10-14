# lms_logistics/models/lms_module.py
from odoo import models, fields




class LmsModule(models.Model):
    _name = "lms.module"
    _description = "LMS Module - container for top-level records"


    name = fields.Char(string="Title", required=True)
    active = fields.Boolean(string="Active", default=True)
    code = fields.Char(string="Code")
    description = fields.Text(string="Description")
    # simple one2many placeholder for related modules (example)
    child_ids = fields.One2many("lms.module", "parent_id", string="Children")
    parent_id = fields.Many2one("lms.module", string="Parent")




class LmsDashboard(models.Model):
    _name = "lms.dashboard"
    _description = "Simple dashboard placeholder"


    name = fields.Char(required=True)
    summary = fields.Text()
    created_on = fields.Datetime(default=lambda self: fields.Datetime.now())