odoo.define('dashboard_studio.DashboardView', function (require) {
"use strict";

/**
 * The Pivot View is a view that represents data in a 'pivot grid' form. It
 * aggregates data on 2 dimensions and displays the result, allows the user to
 * 'zoom in' data.
 */

var AbstractView = require('web.AbstractView');
var core = require('web.core');
var DashboardModel = require('dashboard_studio.DashboardModel');
var DashboardController = require('dashboard_studio.DashboardController');
var DashboardRenderer = require('dashboard_studio.DashboardRenderer');
var view_registry = require('web.view_registry');

var _t = core._t;
var _lt = core._lt;


var DashboardView = AbstractView.extend({
    display_name: _lt('Dashboard'),
    icon: 'fa-tachometer',
    viewType: 'dashboard',
    jsLibs: [
        '/dashboard_studio/static/lib/jspdf.min.js',
        '/dashboard_studio/static/lib/gridstackjs/gridstack-h5.min.js',
    ],
    cssLibs: ['/dashboard_studio/static/lib/gridstackjs/gridstack.min.css'],
    config: _.extend({}, AbstractView.prototype.config,{
        Model: DashboardModel,
        Controller: DashboardController,
        Renderer: DashboardRenderer,
    }),
    searchMenuTypes: ['filter', 'groupBy', 'timeRange', 'favorite'],
    /**
     * @override
     * @param {Object} params
     */
    init: function (viewInfo, params) {
        // params.searchMenuTypes = [];
        // params.withSearchBar = false;
        this._super.apply(this, arguments);
        this.controllerParams.viewInfo = viewInfo;
        this.rendererParams.dbView = this;
        this.loadParams.viewInfo = viewInfo;
    },
});


view_registry.add('dashboard', DashboardView);

return DashboardView;

});
