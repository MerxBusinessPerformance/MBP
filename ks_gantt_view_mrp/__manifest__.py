# -*- coding: utf-8 -*-
{
	'name': 'Odoo Gantt View Manufacturing',

	'summary': """
This module provides you a Gantt View while scheduling different manufacturing tasks, which helps you to effectively manage your tasks with time. You can keep track of dependent tasks, prioritize a task over another, and see the availability of resources to complete a task within a time limit. Gantt Native Web view,Gantt Native view for Projects,Gantt Native Exchange for Project,Gantt Native PDF Advance,Gantt Native view for MRP,Gantt Native view for Manufacture,Gantt Native view for Leave,Gantt Native view for Leave Holidays,Gantt Native,Gantt chart,Project Gantt View,Gantt view for Projects,Project Gantt Native Web View,Odoo Gantt View,Leaves Gantt View,HR Employee Holiday,Web Gantt Chart View,Web Gantt View for Project,Odoo Gantt View Manufacturing,Odoo Gantt View Time Off,Base for Gantt view,Meeting Gantt View,MRP Gantt View,Manufaturing Gantt View,Gantt View Base,Odoo Gantt View Base,Web Gantt View,Odoo Gantt,Manufacturing Gantt,Gantt View Pro,Gantt Chart Project,Odoo Project Gantt Chart,Odoo Project Gantt View,Gantt View for Project Task,Gantt chart on the web,Gantt Native Report for Project,Track Leaves,Plan Leaves,ksolves gantt view,gantt chart widget view,Web gantt view for projects,Gantt View for Project tasks,Gantt view for Project Issue,fastest Gantt chart,project management,Manage leaves,leave dependencies,Planning view,Gantt Tasks,Odoo Web Gantt chart view,Odoo Project Web Gantt Chart View,All in one Odoo gantt view,Odoo Gantt Chart, 
Odoo Construction, Odoo Manufacturing,Gantt chart view,Project Web Gantt,Gantt View Base module,Gantt View App,Gantt view to Odoo 14,Gantt view to Odoo 15,Odoo timeoff
""",

	'description': """
work orders management system in odoo
        work orders in odoo
        manage / edit work orders in odoo
        odoo manufacturing app  
        odoo manufacturing module
        manufacturing module odoo
        manufacturing modules in odoo
        employee work schedule in odoo
        apps for odoo manufacturing
        manufacturing apps for odoo
        odoo work orders apps
        odoo 15 manufacturing management
        odoo manufacturing 14
        manufacturing gantt chart
        manufacturing managers odoo app
        manufacturing order management in odoo
        gantt view in work orders 
        gantt view in manufacturing
        work orders  in manufacturing module 
        manufacturing app for odoo
""",

	'author': 'Ksolves India Ltd.',

	'license': 'OPL-1',

	'currency': 'EUR',

	'price': 0.0,

	'live_test_url': 'https://ganttview.kappso.com/web/demo_login',

	'website': 'https://store.ksolves.com',

	'maintainer': 'Ksolves India Ltd.',

	'category': 'Tools',

	'version': '15.0.1.0.0',

	'support': 'sales@ksolves.com',

	'depends': ['ks_gantt_view_base', 'mrp', 'hr'],

	'images': ['static/description/ks_gantt_view.gif'],

	'data': ['data/data.xml', 'views/ks_mrp_production.xml', 'views/ks_mrp_production_view.xml', 'security/ir.model.access.csv', 'views/ks_mrp_gantt_settings.xml', 'views/ks_import_mrp_production.xml', 'views/ks_import_work_order.xml', 'views/ks_gantt_mrp_wo.xml'],

	'assets': {'web.assets_backend': ['ks_gantt_view_mrp/static/src/js/ks_gantt_renderer_inherit.js']},
}
