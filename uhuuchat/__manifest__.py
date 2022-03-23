# -*- coding: utf-8 -*-
{
    'name': "uhuuchat",

    'summary': """
        Powerfull app to manage internal collaboration, get leads and give postsales support.""",

    'description': """
        Improve your communication with customers and team mates, you can handle conversations from different channels like Twitter, Telegram, WhatsApp, FB Messenger and websites.
    """,

    'author': "MyUhuu",
    'website': "https://myuhuu.com",

    # Categories can be used to filter modules in modules listing
    # Check https://github.com/odoo/odoo/blob/14.0/odoo/addons/base/data/ir_module_category_data.xml
    # for the full list
    'category': 'Productivity',
    'version': '0.2',
    'license':'LGPL-3',
    # any module necessary for this one to work correctly
    'depends': ['base','web','crm'],

    # always loaded
    'data': [
        # 'security/ir.model.access.csv',
        'views/views.xml',
        'views/templates.xml',
    ],
    # only loaded in demonstration mode
    'demo': [
        'demo/demo.xml',
    ],
    
    'application': False,
    
    'assets': {
        #'web.assets_backend': [
        #    'web/static/src/xml/**/*',
        #],
        'web.assets_common': [
            'uhuuchat/static/lib/js/myuhuu.js'
        ]
        #'web.qunit_suite_tests': [
        #    'web/static/src/js/webclient_tests.js',
        #],
    },
}
