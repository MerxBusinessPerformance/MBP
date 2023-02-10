odoo.define('dashboard_studio.planning', function (require) {
"use strict";

    var Domain = require('web.Domain');
    var PlanningView = require('dashboard_studio.PlanningView');
    var session = require('web.session');
    var basic_fields = require('dashboard_studio.basic_fields');
    var basic_widgets = require('dashboard_studio.basic_widgets');
    var baseEdit = require('dashboard_studio.views_edit_base');


    PlanningView.include({
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

    var PlanningProps = baseEdit.ViewProps.extend({
        init: function(parent, props) {
            this._super(parent, props);
            const {fields} = props.viewInfo;
            this.nodeProps.date_start = {
                name: 'date_start',
                valType: "string",
                label: 'Date Start',
                widget: basic_fields.ChooseField,
                fields: fields,
                fieldTypes: ["date", "datetime"]
            };
            this.nodeProps.date_end = {
                name: 'date_end',
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
                fieldTypes: ["many2one", "integer", "selection", "boolean"]
            };
            this.nodeProps.scale = {
                name: 'scale',
                valType: "string",
                label: 'Scale',
                widget: basic_fields.Selection,
                fields: fields
            };
            this.nodeProps.filter = {
                name: 'filter',
                valType: "string",
                label: 'Filter',
                widget: basic_widgets.ButtonDomain
            };
            this.hideTab = true;
            this.viewPropsView = ["date_start", "date_end", "default_group", "scale", "filter"];
        },
        prepareParamsProp: function (node, viewPropsView) {
            const propsProp = this._super(node, viewPropsView);
            propsProp.scale.options = [{label: 'Day', value: 'day'}, {label: 'Week', value: 'week'}, {label: 'Month', value: 'month'}];
            return propsProp;
        },
    });

    var PlanningViewContent = baseEdit.ViewContent.extend({
        template: 'DashboardStudio.View.Planning',
        init: function(parent, params) {
            this._super(parent, params);
            this.viewConfig.prop = PlanningProps;
            this.viewConfig.view = PlanningView;
        }
    });

    return PlanningViewContent;

});
