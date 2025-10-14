# lms/__manifest__.py
{
"name": "LMS Logistics",
"version": "1.0.0",
"summary": "Logistics Management System (minimal scaffold)",
"description": "Minimal Logistics Management System module: Lead, Warehouse, Inventory, Dispatch, Fleet, Tracking, Finance overview.",
"author": "Dev",
"category": "Operations/Logistics",
"depends": [
"crm",
"base",
"mail",
"stock",
"account",
],
"data": [
'views/lms_dashboard_action.xml',
"security/ir.model.access.csv",
# "views/lms_views.xml",
"views/menu_views.xml",
],
'assets': {
    'web.assets_backend': [
        'lms/static/src/xml/dashboard.xml',
        'lms/static/src/js/dashboard.js',
        'lms/static/src/css/dashboard.css',
    ],
},
"installable": True,
"application": True,
}