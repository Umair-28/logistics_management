from odoo import models, fields

class TripSheet(models.Model):
    _name = "trip.sheet"
    _description = "Trip Sheet"

    name = fields.Char("Trip No", required=True, copy=False, readonly=True, default=lambda self: "New")
    vehicle_id = fields.Many2one("fleet.vehicle", string="Vehicle")
    driver_id = fields.Many2one("res.partner", string="Driver")
    date_start = fields.Datetime("Start Date")
    date_end = fields.Datetime("End Date")
    total_distance = fields.Float("Total Distance (km)")
    remarks = fields.Text("Remarks")

    def create(self, vals):
        if vals.get("name", "New") == "New":
            vals["name"] = self.env["ir.sequence"].next_by_code("trip.sheet") or "New"
        return super().create(vals)
