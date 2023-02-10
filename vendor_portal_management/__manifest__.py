# -*- coding: utf-8 -*-
{
    "name": "Vendor Products Portal",
    "version": "15.0.1.0.1",
    "category": "Purchases",
    "author": "faOtools",
    "website": "https://faotools.com/apps/15.0/vendor-products-portal-635",
    "license": "Other proprietary",
    "application": True,
    "installable": True,
    "auto_install": False,
    "depends": [
        "vendor_product_management",
        "website"
    ],
    "data": [
        "data/data.xml",
        "security/ir.model.access.csv",
        "security/security.xml",
        "views/res_config_settings.xml",
        "views/core_templates.xml",
        "views/vendor_product_template.xml",
        "views/vendor_location_template.xml"
    ],
    "assets": {
        "web.assets_frontend": [
                "vendor_portal_management/static/src/css/style.css",
                "vendor_portal_management/static/src/js/vendor_portal.js"
        ],
        "web.assets_qweb": [
                "vendor_portal_management/static/src/xml/*.xml"
        ]
},
    "demo": [
        
    ],
    "external_dependencies": {},
    "summary": "The tool to motivate vendors to prepare product catalog in Odoo. Vendor portal",
    "description": """
For the full details look at static/description/index.html

* Features * 

- Odoo supplier portal
- Vendor inventories control
- Vendor data import



#odootools_proprietary

    """,
    "images": [
        "static/description/main.png"
    ],
    "price": "90.0",
    "currency": "EUR",
    "live_test_url": "https://faotools.com/my/tickets/newticket?&url_app_id=101&ticket_version=15.0&url_type_id=3",
}