# -*- coding: utf-8 -*-
{
    'name': "Nutrula Tech | Conciliación bancaria automatica MX",

    'summary': """
        Analisis gramatical de estados de cuenta para su importación automatica. 
        """,

    'description': """
        Analisis gramatical de estados de cuenta para su importación automatica. 

        Bancos soportados: 
        - BBVA
        - Banamex
        - Santander
        - American Express (Solo pagos)
        - Banorte
    """,

    'author': "Rafael Ramírez | Nutrula Tech",
    'website': "https://www.nutrulatech.com",

    'category': 'Uncategorized',
    'version': '0.1',

    'depends': ['base', 'account', 'account_accountant'],

    # always loaded
    'data': [
        'views/wizard/importar_estado_de_cuenta_wizard.xml',
        'views/account_bank_statement.xml',
    ],
}
