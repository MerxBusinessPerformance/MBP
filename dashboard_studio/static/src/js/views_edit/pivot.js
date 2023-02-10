odoo.define('dashboard_studio.pivot', function (require) {
"use strict";

    var Domain = require('web.Domain');
    // var PivotView = require('web.PivotView');
    // var PivotController = require('web.PivotController');
    var basic_fields = require('dashboard_studio.basic_fields');
    var baseEdit = require('dashboard_studio.views_edit_base');
    var basic_widgets = require('dashboard_studio.basic_widgets');
    var searchUtils = require('web.searchUtils');
    var GROUP_ABLE_TYPES = searchUtils.GROUPABLE_TYPES;


    // PivotView.include({
    //     init: function (viewInfo, params) {
    //         if (params.fromEdit) {
    //             const {domain} = this.getViewInfoParams(viewInfo);
    //             params.domain = Domain.prototype.stringToArray(domain);
    //         }
    //         this._super(viewInfo, params);
    //     },
    //     getViewInfoParams: function (viewInfo) {
    //         const arch = typeof(viewInfo.arch) == "string" ? $(viewInfo.arch) : viewInfo.arch;
    //         const getProp = (prop) => (arch.attrs ? arch.attrs[prop] : arch.attr(prop));
    //         return {
    //             domain: getProp("filter") || '[]',
    //         }
    //     },
    // });

    // PivotController.include({
    //     init: function (parent, model, renderer, params) {
    //         this._super(parent, model, renderer, params);
    //         this.props = params;
    //     },
    //     _pushState: function () {
    //         const {fromEdit} = this.props;
    //         if (!fromEdit) {
    //             this._super();
    //         }
    //     }
    // });

    var PivotProps = baseEdit.ViewProps.extend({
        init: function(parent, props) {
            this._super(parent, props);
            this.hideTab = true;
            const {fields, model} = props.viewInfo;
            this.nodeProps.measure = {name: 'measure', valType: "string", label: 'Measure', widget: basic_fields.FieldM2mRaw};
            this.nodeProps.col = {name: 'col', valType: "string", label: 'Cols Group', widget: basic_fields.FieldM2mRaw};
            this.nodeProps.row = {name: 'row', valType: "string", label: 'Rows Group', widget: basic_fields.FieldM2mRaw};
            this.nodeProps.filter = {name: 'filter', valType: "string", label: 'Filter', widget: basic_widgets.ButtonDomain, props: {model: model}};
            this.nodeProps.display_quantity = {name: 'display_quantity', valType: "boolean", label: 'Display Count', widget: basic_fields.Radio};
            this.nodeProps.disable_linking = {name: 'disable_linking', valType: "boolean", label: 'Allow Link to List View', widget: basic_fields.Radio};
            this.nodeProps.stacked = {name: 'stacked', valType: "boolean", label: 'Stacked', widget: basic_fields.Radio};
            this.viewPropsView = [ "measure", "col", "row", "filter", "display_quantity", "stacked"];
        },
        preparePropsVal: function (node) {
            const data = {measure: [], col: [], row: []}, {fields} = this.props.viewInfo;
            node.children.map((child) => {
                if (child.tag == "field") {
                    const {type} = child.attrs, fieldName = child.attrs.name, field = fields[fieldName];
                    if (type in data) {
                        data[type].push({label: field.string, value: fieldName});
                    }
                }
            });
            return data;
        },
        _onChangeProp: function (node, options, propName) {
            const children = node.children.filter((child) => {
                const {type} = child.attrs;
                return type != propName;
            });
            const fieldsGroup = options.map((option) => {
                return this.newNodeStore.nodeField({fieldName: option.value, props: {type: propName}});
            });
            node.children = children.concat(fieldsGroup);
        },
        onChangeProp: function (node, prop, value) {
            const {onChangeProp} = this.props;
            if (["col", "row", "measure", "mode"].includes(prop.name)) {
                if (["col", "row", "measure"].includes(prop.name)) {
                    this._onChangeProp(node, value, prop.name);
                }
                if (prop.name == "mode") {
                    ["area", "stacked", "smooth"].map((prop) => {
                        if (prop in node.attrs) {
                            delete node.attrs[prop];
                        }
                    });
                    Object.entries(value || {}).map((data) => {
                        node.attrs[data[0]] = data[1];
                    });
                }
                if (onChangeProp) {
                    onChangeProp(node);
                }
                return true;
            }
            return this._super(node, prop, value);
        },
        _prepareOptionsProp: function (acceptType=[]) {
            const {fields} = this.props.viewInfo, options = [];
            Object.keys(fields).map((fieldName) => {
                const field = fields[fieldName]
                if (acceptType.includes(field.type) && field.store && fieldName != 'id') {
                    options.push({label: field.string, value: fieldName});
                }
            });
            return options;
        },
        prepareParamsProp: function (node, viewPropsView) {
            const propsProp = this._super(node, viewPropsView), propsVal = this.preparePropsVal(node);
            if (viewPropsView.includes("col")) {
                const options = this._prepareOptionsProp(GROUP_ABLE_TYPES);
                propsProp.col.options = options;
                propsProp.col.value = propsVal.col;
            }
            if (viewPropsView.includes("row")) {
                const options = this._prepareOptionsProp(GROUP_ABLE_TYPES);
                propsProp.row.options = options;
                propsProp.row.value = propsVal.row;
            }
            if (viewPropsView.includes("measure")) {
                const options = this._prepareOptionsProp(['integer', 'float', 'monetary']);
                propsProp.measure.options = options;
                propsProp.measure.value = propsVal.measure;
            }
            return propsProp;
        },
    });

    var PivotEditContent = baseEdit.ViewContent.extend({
        template: 'DashboardStudio.View.Pivot',
        init: function(parent, params) {
            this._super(parent, params);
            this.viewConfig.prop = PivotProps;
            this.viewConfig.view = false;
        },
    });

    return PivotEditContent;

});
