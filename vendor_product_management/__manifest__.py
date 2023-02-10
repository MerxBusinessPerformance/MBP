# -*- coding: utf-8 -*-
{
    "name": "Vendor Product Management",
    "version": "15.0.1.0.3",
    "category": "Purchases",
    "author": "faOtools",
    "website": "https://faotools.com/apps/15.0/vendor-product-management-634",
    "license": "Other proprietary",
    "application": True,
    "installable": True,
    "auto_install": False,
    "depends": [
        "purchase",
        "base_import"
    ],
    "data": [
        "data/data.xml",
        "security/ir.model.access.csv",
        "views/res_config_settings.xml",
        "views/vendor_quant.xml",
        "views/vendor_location.xml",
        "views/product_supplierinfo.xml",
        "views/vendor_product.xml",
        "views/product_template.xml",
        "views/product_product.xml",
        "views/res_partner.xml",
        "wizard/vendor_import_result.xml",
        "wizard/vendor_product_import.xml",
        "wizard/vendor_stock_import.xml",
        "views/menu.xml"
    ],
    "assets": {},
    "demo": [
        
    ],
    "external_dependencies": {},
    "summary": "The tool to administrate vendor data about products, prices and available stocks",
    "description": """
For the full details look at static/description/index.html
- Involve suppliers in product management using the optional extension &lt;a href='https://apps.odoo.com/apps/modules/15.0/vendor_portal_management/'&gt;Vendor Products Portal&lt;/a&gt;

* Features * 

- Vendor inventories control
- Vendor data import



#odootools_proprietary

    """,
    "images": [
        "static/description/main.png"
    ],
    "price": "86.0",
    "currency": "EUR",
    "post_init_hook": "post_init_hook",
    "live_test_url": "https://faotools.com/my/tickets/newticket?&url_app_id=100&ticket_version=15.0&url_type_id=3",
}