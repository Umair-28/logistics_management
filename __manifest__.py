{
    "name": "Logistics Management System",
    "version": "1.0.0",
    "summary": "Logistics Management System",
    "description": "Minimal Logistics Management System module: Lead, Warehouse, Inventory, Dispatch, Fleet, Tracking, Finance overview.",
    "author": "Dev",
    "category": "Operations/Logistics",
    "depends": [
        "crm",
        "base",
        "mail",
        "stock",
        "account",
        "fleet"
    ],
    "data": [
        "views/lms_dashboard_action.xml",  
        "views/menu_views.xml",            
        "security/ir.model.access.csv",
        'data/sequence_data.xml',
        'data/sequence_trip_sheet_data.xml',
        'data/sequence_lorry_receipt.xml',
        'data/sequence_proof_delivery.xml',
        'data/sequence_eway_bill.xml',
        'views/eway_bill_view.xml',
        "views/trip_sheet_views.xml",
        'views/route_dispatch_views.xml',
        'views/lorry_receipt_views.xml',
        'views/proof_delivery_views.xml'

    ],
    'assets': {
        'web.assets_backend': [
            'lms/static/src/js/dashboard.js',
            'lms/static/src/xml/dashboard.xml',
            'lms/static/src/css/dashboard.css',
        ],
    },
    "installable": True,
    "application": True,
}
