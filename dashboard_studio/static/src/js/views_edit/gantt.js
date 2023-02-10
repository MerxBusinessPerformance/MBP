odoo.define('dashboard_studio.gantt', function (require) {
"use strict";

    var core = require('web.core');
    var GanttView = require('dashboard_studio.GanttView');
    var session = require('web.session');
    var basic_fields = require('dashboard_studio.basic_fields');
    var baseEdit = require('dashboard_studio.views_edit_base');
    var base = require('dashboard_studio.base');


    var GanttProps = baseEdit.ViewProps.extend({
        init: function(parent, props) {
            this._super(parent, props);
            const {fields} = props.viewInfo;
            this.nodeProps.start_date = {
                name: 'start_date',
                valType: "string",
                label: 'Date Start',
                widget: basic_fields.ChooseField,
                fields: fields,
                fieldTypes: ["date", "datetime"]
            };
            this.nodeProps.stop_date = {
                name: 'stop_date',
                valType: "string",
                label: 'Date End',
                widget: basic_fields.ChooseField,
                fields: fields,
                fieldTypes: ["date", "datetime"]
            };
            this.nodeProps.default_group = {
                name: 'default_group',
                valType: "string",
                label: 'Default Group',
                widget: basic_fields.ChooseField,
                fields: fields,
                fieldTypes: ["many2one", "int", "selection", "boolean"]
            };
            this.nodeProps.scale = {
                name: 'scale',
                valType: "string",
                label: 'Scale',
                widget: basic_fields.Selection,
                fields: fields
            };
            this.viewPropsView = ["start_date", "stop_date", "default_group", "scale"];
        },
        prepareParamsProp: function (node, viewPropsView) {
            const propsProp = this._super(node, viewPropsView);
            propsProp.scale.options = [{label: 'Hour', value: 'Hour'}, {label: 'Two Hour', value: 'Two Hour'}, {label: 'Quarter Day', value: 'Quarter Day'},
                {label: 'Half Day', value: 'Half Day'}, {label: 'Day', value: 'Day'}, {label: 'Week', value: 'Week'}, {label: 'Month', value: 'Month'}];
            return propsProp;
        },
    });

    var GanttViewContent = baseEdit.ViewContent.extend({
        template: 'DashboardStudio.View.Planning',
        init: function(parent, params) {
            this._super(parent, params);
            this.viewConfig.prop = GanttProps;
            this.viewConfig.view = GanttView;
        }
    });

    return GanttViewContent;

});
