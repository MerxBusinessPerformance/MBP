odoo.define('dashboard_studio.PlanningView', function (require) {
"use strict";

/**
 * The Pivot View is a view that represents data in a 'pivot grid' form. It
 * aggregates data on 2 dimensions and displays the result, allows the user to
 * 'zoom in' data.
 */

var AbstractView = require('web.AbstractView');
var core = require('web.core');
var PlanningModel = require('dashboard_studio.PlanningModel');
var PlanningController = require('dashboard_studio.PlanningController');
var PlanningRenderer = require('dashboard_studio.PlanningRenderer');
var view_registry = require('web.view_registry');
var pyUtils = require('web.py_utils');
var utils = require('web.utils');

var _t = core._t;
var _lt = core._lt;

var fieldsToGather = [
    "date_start",
    "date_end",
    "default_group",
];

var PlanningView = AbstractView.extend({
    display_name: _lt('Planning'),
    icon: 'fa-tasks',
    viewType: 'plan',
    config: _.extend({}, AbstractView.prototype.config,{
        Model: PlanningModel,
        Controller: PlanningController,
        Renderer: PlanningRenderer,
    }),
    // viewType: 'kanban',
    searchMenuTypes: ['filter', 'groupBy', 'timeRange', 'favorite'],
    /**
     * @override
     * @param {Object} params
     */
    init: function (viewInfo, params) {
        this._super.apply(this, arguments);
        var arch = this.arch;
        var fields = this.fields;
        var attrs = arch.attrs;
        const {date_end, date_start} = arch.attrs;
        const filters = {}, fieldNames = [];

        var mapping = {};
        var displayFields = {};

        _.each(arch.children, function (child) {
            if (child.tag !== 'field') return;
            var fieldName = child.attrs.name;
            fieldNames.push(fieldName);
            if (!child.attrs.invisible) {
                child.attrs.options = typeof child.attrs.options == "string" ? pyUtils.py_eval(child.attrs.options) : {};
                displayFields[fieldName] = {attrs: child.attrs};
            }

        });
        _.each(fieldsToGather, function (field) {
            if (arch.attrs[field]) {
                var fieldName = attrs[field];
                mapping[field] = fieldName;
                fieldNames.push(fieldName);
            }
        });
        // this.withControlPanel = false;
        this.withSearchPanel = false;
        this.rendererParams.mapping = mapping;
        this.rendererParams.fieldNames = fieldNames;
        this.rendererParams.fields = fields;
        this.controllerParams.mapping = mapping;
        this.loadParams.mapping = mapping;
        this.loadParams.displayFields = displayFields;
        if (arch.attrs.scale && arch.attrs.scale != 'undefined') {
            this.loadParams.scale = arch.attrs.scale;
        }
        this.loadParams.fieldNames = fieldNames;
        this.loadParams.arch = this.arch;
        this.loadParams.fields = this.fields;
    },
});


view_registry.add('plan', PlanningView);

return PlanningView;

});
