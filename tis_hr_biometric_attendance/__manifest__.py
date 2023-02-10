# -*- coding: utf-8 -*-
# This module and its content is copyright of Technaureus Info Solutions Pvt. Ltd.
# - © Technaureus Info Solutions Pvt. Ltd 2020. All rights reserved.


{
    'name': 'ZKteco Biometric Attendance Integration',
    'version': '15.0.1.1',
    'category': 'Human Resources',
    'sequence': 1,
    'author': 'Technaureus Info Solutions Pvt. Ltd.',
    'summary': 'Biometric attendance integration',
    'website': 'http://www.technaureus.com/',
    'price': 99,
    'currency': 'EUR',
    'license': 'Other proprietary',
    'description': """
 Synchronization of employee attendance with biometric machine ...""",
    'depends': ['hr_attendance'],
    'data': [
        'security/ir.model.access.csv',
        'security/security.xml',
        'data/biometric_data.xml',
        'views/biometric_device_config_view.xml',
        'views/biometric_attnd_log_view.xml',
        'wizard/attendance_calc_wizard_view.xml',
        'wizard/biometric_device_view.xml',
        'wizard/attendance_report_wizard_view.xml',
        'views/hr_attendance_view.xml',
        'views/hr_employee_view.xml',

    ],
    'demo': [
    ],
    'images': ['images/main_screenshot.png'],
    'installable': True,
    'application': True,
    'auto_install': False,
    'live_test_url': 'https://www.youtube.com/watch?v=GCq-7WzserA&t=104s'
}
