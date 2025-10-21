# -*- coding: utf-8 -*-

from odoo import models, fields, api
from datetime import datetime, timedelta
from dateutil.relativedelta import relativedelta


class LMSDashboard(models.Model):
    _name = 'lms.dashboard'
    _description = 'Logistics Management Dashboard'

    @api.model
    def get_dashboard_data(self):
        """
        Fetch all dashboard data in a single RPC call for better performance
        """
        today = fields.Date.today()
        first_day_of_month = today.replace(day=1)
        last_month = today - relativedelta(months=1)
        last_month_first_day = last_month.replace(day=1)
        
        # Active Shipments
        active_shipments = self.env['stock.picking'].search_count([
            ('state', 'in', ['assigned', 'confirmed', 'waiting'])
        ])
        
        # Previous month shipments for comparison
        last_month_shipments = self.env['stock.picking'].search_count([
            ('state', 'in', ['assigned', 'confirmed', 'waiting']),
            ('create_date', '>=', last_month_first_day),
            ('create_date', '<', first_day_of_month)
        ])
        
        shipments_change = self._calculate_percentage_change(
            active_shipments, last_month_shipments
        )
        
        # Fleet Vehicles
        fleet_vehicles = self.env['fleet.vehicle'].search_count([])
        
        # Fleet Status Distribution
        fleet_status = self._get_fleet_status()
        
        # Monthly Revenue
        invoices = self.env['account.move'].search([
            ('move_type', '=', 'out_invoice'),
            ('state', '=', 'posted'),
            ('invoice_date', '>=', first_day_of_month),
        ])
        monthly_revenue = sum(invoices.mapped('amount_total'))
        
        # Previous month revenue
        last_month_invoices = self.env['account.move'].search([
            ('move_type', '=', 'out_invoice'),
            ('state', '=', 'posted'),
            ('invoice_date', '>=', last_month_first_day),
            ('invoice_date', '<', first_day_of_month),
        ])
        last_month_revenue = sum(last_month_invoices.mapped('amount_total'))
        
        revenue_change = self._calculate_percentage_change(
            monthly_revenue, last_month_revenue
        )
        
        # Active Customers
        active_customers = self.env['res.partner'].search_count([
            ('customer_rank', '>', 0)
        ])
        
        # New customers this week
        week_ago = today - timedelta(days=7)
        new_customers_this_week = self.env['res.partner'].search_count([
            ('customer_rank', '>', 0),
            ('create_date', '>=', week_ago)
        ])
        
        # Shipment Trends (last 7 days)
        shipment_trends = self._get_shipment_trends(7)
        
        # Recent Activities
        recent_activities = self._get_recent_activities()
        
        # Alerts
        alerts = self._get_alerts()
        
        return {
            'activeShipments': active_shipments,
            'shipmentsChange': shipments_change,
            'fleetVehicles': fleet_vehicles,
            'fleetUtilization': fleet_status.get('utilization', 0),
            'monthlyRevenue': monthly_revenue / 1000000,  # Convert to millions
            'revenueChange': revenue_change,
            'activeCustomers': active_customers,
            'newCustomersThisWeek': new_customers_this_week,
            'shipmentTrends': shipment_trends,
            'fleetStatus': fleet_status,
            'recentActivities': recent_activities,
            'alerts': alerts,
        }
    
    def _calculate_percentage_change(self, current, previous):
        """Calculate percentage change between two values"""
        if previous == 0:
            return 100 if current > 0 else 0
        return round(((current - previous) / previous) * 100, 1)
    
    def _get_fleet_status(self):
        """Get fleet vehicle status distribution"""
        vehicles = self.env['fleet.vehicle'].search([])
        total = len(vehicles)
        
        if total == 0:
            return {
                'active': 0,
                'maintenance': 0,
                'idle': 0,
                'utilization': 0
            }
        
        # Count by state
        active_count = len(vehicles.filtered(lambda v: v.vehicle_status == 'active'))
        maintenance_count = len(vehicles.filtered(lambda v: v.vehicle_status == 'maintenance'))
        idle_count = total - active_count - maintenance_count
        
        return {
            'active': round((active_count / total) * 100),
            'maintenance': round((maintenance_count / total) * 100),
            'idle': round((idle_count / total) * 100),
            'utilization': round((active_count / total) * 100)
        }
    
    def _get_shipment_trends(self, days=7):
        """Get shipment trends for the last N days"""
        trends = []
        today = fields.Date.today()
        
        for i in range(days - 1, -1, -1):
            date = today - timedelta(days=i)
            count = self.env['stock.picking'].search_count([
                ('scheduled_date', '>=', date.strftime('%Y-%m-%d 00:00:00')),
                ('scheduled_date', '<=', date.strftime('%Y-%m-%d 23:59:59')),
            ])
            trends.append({
                'date': date.strftime('%Y-%m-%d'),
                'count': count
            })
        
        return trends
    
    def _get_recent_activities(self):
        """Get recent system activities"""
        activities = []
        
        # Recent shipments
        recent_pickings = self.env['stock.picking'].search(
            [],
            order='create_date desc',
            limit=2
        )
        
        for picking in recent_pickings:
            activities.append({
                'id': f'picking_{picking.id}',
                'icon': '📦',
                'title': f'New shipment created: {picking.name}',
                'time': self._format_relative_time(picking.create_date)
            })
        
        # Recent paid invoices
        recent_invoices = self.env['account.move'].search([
            ('move_type', '=', 'out_invoice'),
            ('payment_state', '=', 'paid')
        ], order='write_date desc', limit=2)
        
        for invoice in recent_invoices:
            activities.append({
                'id': f'invoice_{invoice.id}',
                'icon': '💰',
                'title': f'Invoice {invoice.name} paid',
                'time': self._format_relative_time(invoice.write_date)
            })
        
        # Recent vehicle updates
        recent_vehicles = self.env['fleet.vehicle'].search(
            [],
            order='write_date desc',
            limit=1
        )
        
        for vehicle in recent_vehicles:
            if vehicle.vehicle_status == 'maintenance':
                activities.append({
                    'id': f'vehicle_{vehicle.id}',
                    'icon': '🔧',
                    'title': f'Maintenance scheduled for {vehicle.name}',
                    'time': self._format_relative_time(vehicle.write_date)
                })
        
        return activities[:4]
    
    def _get_alerts(self):
        """Get system alerts and notifications"""
        alerts = []
        
        # Vehicles due for maintenance
        maintenance_vehicles = self.env['fleet.vehicle'].search_count([
            ('vehicle_status', '=', 'maintenance')
        ])
        
        if maintenance_vehicles > 0:
            alerts.append({
                'id': 'maintenance_alert',
                'type': 'warning',
                'icon': '⚠️',
                'title': f'{maintenance_vehicles} vehicles due for maintenance',
                'time': 'Action required'
            })
        
        # Delayed shipments
        today = fields.Datetime.now()
        delayed_shipments = self.env['stock.picking'].search_count([
            ('state', 'in', ['assigned', 'confirmed']),
            ('scheduled_date', '<', today)
        ])
        
        if delayed_shipments > 0:
            alerts.append({
                'id': 'delayed_shipments',
                'type': 'danger',
                'icon': '🚨',
                'title': f'{delayed_shipments} delayed shipments',
                'time': 'Urgent attention needed'
            })
        
        # Pending invoices
        pending_invoices = self.env['account.move'].search_count([
            ('move_type', '=', 'out_invoice'),
            ('state', '=', 'posted'),
            ('payment_state', '!=', 'paid')
        ])
        
        if pending_invoices > 0:
            alerts.append({
                'id': 'pending_invoices',
                'type': 'info',
                'icon': '📋',
                'title': f'{pending_invoices} pending invoices',
                'time': 'Review required'
            })
        
        # Low stock alerts (if using inventory)
        low_stock_products = self.env['product.product'].search_count([
            ('type', '=', 'product'),
            ('qty_available', '<', 10),
            ('qty_available', '>', 0)
        ])
        
        if low_stock_products > 0:
            alerts.append({
                'id': 'low_stock',
                'type': 'warning',
                'icon': '📉',
                'title': f'{low_stock_products} products low in stock',
                'time': 'Reorder recommended'
            })
        
        return alerts
    
    def _format_relative_time(self, dt):
        """Format datetime as relative time string"""
        if not dt:
            return 'Unknown'
        
        now = fields.Datetime.now()
        diff = now - dt
        
        minutes = diff.total_seconds() / 60
        
        if minutes < 1:
            return 'Just now'
        elif minutes < 60:
            return f'{int(minutes)} minutes ago'
        
        hours = minutes / 60
        if hours < 24:
            return f'{int(hours)} hours ago'
        
        days = hours / 24
        if days < 7:
            return f'{int(days)} days ago'
        
        weeks = days / 7
        return f'{int(weeks)} weeks ago'


class FleetVehicle(models.Model):
    _inherit = 'fleet.vehicle'
    
    vehicle_status = fields.Selection([
        ('active', 'Active'),
        ('maintenance', 'Maintenance'),
        ('idle', 'Idle')
    ], string='Vehicle Status', default='active', tracking=True)


class StockPicking(models.Model):
    _inherit = 'stock.picking'
    
    # Add any custom fields for shipment tracking if needed
    is_delayed = fields.Boolean(
        string='Is Delayed',
        compute='_compute_is_delayed',
        store=True
    )
    
    @api.depends('scheduled_date', 'state')
    def _compute_is_delayed(self):
        for picking in self:
            if picking.scheduled_date and picking.state in ['assigned', 'confirmed']:
                picking.is_delayed = picking.scheduled_date < fields.Datetime.now()
            else:
                picking.is_delayed = False