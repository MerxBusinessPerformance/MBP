odoo.define('dynamic_odoo.PlanningView', function (require) {
"use strict";

/**
 * The Pivot View is a view that represents data in a 'pivot grid' form. It
 * aggregates data on 2 dimensions and displays the result, allows the user to
 * 'zoom in' data.
 */

var AbstractView = require('web.AbstractView');
var core = require('web.core');
var PlanningModel = require('dynamic_odoo.PlanningModel');
var PlanningController = require('dynamic_odoo.PlanningController');
var PlanningRenderer = require('dynamic_odoo.PlanningRenderer');
var view_registry = require('web.view_registry');
var pyUtils = require('web.py_utils');
var utils = require('web.utils');

var _t = core._t;
var _lt = core._lt;

// var controlPanelViewParameters = require('web.controlPanelViewParameters');
// var GROUPABLE_TYPES = controlPanelViewParameters.GROUPABLE_TYPES;
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
    searchMenuTypes: ['filter', 'groupBy', 'timeRange', 'favorite'],

    init: function (viewInfo, params) {
        this._super.apply(this, arguments);
        const arch = this.arch, fields = this.fields, fieldNames = [], mapping = {}, groupsBy = [];
        _.each(arch.children, function (child) {
            if (child.tag !== 'field') return;
            const {name, type} = child.attrs;
            if (name && type == "group") {
                groupsBy.push(child.attrs.name);
            }
        });
        _.each(fieldsToGather, function (field) {
            if (arch.attrs[field]) {
                var fieldName = arch.attrs[field];
                mapping[field] = fieldName;
                fieldNames.push(fieldName);
            }
        });
        this.withSearchPanel = false;
        this.rendererParams.mapping = mapping;
        this.rendererParams.fieldNames = fieldNames;
        this.rendererParams.fields = fields;
        this.rendererParams.label = arch.attrs.label || "display_name";
        this.controllerParams.mapping = mapping;
        this.controllerParams.readonly = params.readonly || false;
        this.loadParams.mapping = mapping;
        this.loadParams.groupBy = groupsBy;
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
