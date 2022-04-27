# -*- coding: utf-8 -*-
##############################################################################
#                 @author IT Admin
#
##############################################################################
{
    'name': 'Auto Price Update',
    'version': '10.0.0',
    'description': ''' Cambia el precio de venta con base en el tipo de cambio
    ''',
    'author': 'IT Admin',
    'website': '',
    'depends': [
        'sale'
    ],
    'data': [
             'data/cron.xml',
             'views/product.xml'
    ],
    'application': False,
    'installable': True,
}
