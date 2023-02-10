odoo.define('dashboard_studio.calendar', function (require) {
"use strict";

    var Domain = require('web.Domain');
    var CalendarView = require('web.CalendarView');
    var CalendarController = require('web.CalendarController');
    var basic_fields = require('dashboard_studio.basic_fields');
    var basic_widgets = require('dashboard_studio.basic_widgets');
    var baseEdit = require('dashboard_studio.views_edit_base');

    CalendarView.include({
        init: function (viewInfo, params) {
            if (params.fromEdit) {
                const {domain} = this.getViewInfoParams(viewInfo);
                params.domain = Domain.prototype.stringToArray(domain);
            }
            this._super(viewInfo, params);
        },
        getViewInfoParams: function (viewInfo) {
            const arch = typeof(viewInfo.arch) == "string" ? $(viewInfo.arch) : viewInfo.arch;
            const getProp = (prop) => (arch.attrs ? arch.attrs[prop] : arch.attr(prop));
            return {
                domain: getProp("filter") || '[]',
            }
        },
    });

    CalendarController.include({
        init: function (parent, model, renderer, params) {
            this._super(parent, model, renderer, params);
            this.props = params;
        },
        _pushState: function () {
            const {fromEdit} = this.props;
            if (!fromEdit) {
                this._super();
            }
        }
    });

    var CalendarProps = baseEdit.ViewProps.extend({
        init: function(parent, props) {
            this._super(parent, props);
            const {fields, model} = props.viewInfo;
            this.hideTab = true;
            this.nodeProps.date_start = {name: 'date_start', valType: "string", label: 'Date Start', widget: basic_fields.ChooseField, fields: fields, fieldTypes: ["date", "datetime"]};
            this.nodeProps.date_stop = {name: 'date_stop', valType: "string", label: 'Date Stop', widget: basic_fields.ChooseField, fields: fields, fieldTypes: ["date", "datetime"]};
            this.nodeProps.date_delay = {name: 'date_delay', valType: "string", label: 'Date Delay', widget: basic_fields.ChooseField, fields: fields, fieldTypes: ["date", "datetime"]};
            this.nodeProps.color = {name: 'color', valType: "string", label: 'Color', widget: basic_fields.ChooseField, fields: fields, fieldTypes: ["many2one"]};
            this.nodeProps.mode = {name: 'mode', valType: "string", label: 'Mode', widget: basic_fields.Selection, fields: fields};
            this.nodeProps.filter = {name: 'filter', valType: "string", label: 'Filter', widget: basic_widgets.ButtonDomain, props: {model: model}};
            this.nodeProps.event_limit = {name: 'event_limit', valType: "integer", label: 'Open Popup', widget: basic_fields.Input};
            this.nodeProps.quick_add = {name: 'quick_add', valType: "boolean", label: 'Quick Add', widget: basic_fields.Radio};
            this.nodeProps.hide_time = {name: 'hide_time', valType: "boolean", label: 'Hide Time', widget: basic_fields.Radio};
            this.nodeProps.event_open_popup = {name: 'event_open_popup', valType: "boolean", label: 'Open Popup', widget: basic_fields.Radio};
            this.viewPropsView = ["date_start", "date_stop", "date_delay", "color", "mode", "event_limit", "filter", "quick_add", "hide_time", "event_open_popup"];
        },
        prepareParamsProp: function (node, viewPropsView) {
            const propsProp = this._super(node, viewPropsView);
            propsProp.mode.options = [{label: 'Day', value: 'day'}, {label: 'Week', value: 'week'}, {label: 'Month', value: 'month'}];
            propsProp['event_limit'].type = "number";
            return propsProp;
        },
    });

    var FormEditContent = baseEdit.ViewContent.extend({
        template: 'DashboardStudio.View.Calendar',
        init: function(parent, params) {
            this._super(parent, params);
            this.viewConfig.prop = CalendarProps;
            this.viewConfig.view = CalendarView;
        },
        renderViewContent: function () {
            const {viewInfo} = this.props;
            viewInfo.arch.children.map((child) => {
                const options = child.attrs.options;
                if (!child.attrs.invisible && typeof options == "object") {
                    child.attrs.options = JSON.stringify(options);
                }
            });
            this._super();
        }
    });

    return FormEditContent;

});
