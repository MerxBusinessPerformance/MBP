odoo.define('dynamic_odoo.planning', function (require) {
    "use strict";

    var Domain = require('web.Domain');
    var PlanningView = require('dynamic_odoo.PlanningView');
    var PlanningController = require('dynamic_odoo.PlanningController');
    var basic_fields = require('dynamic_odoo.basic_fields');
    var basic_widgets = require('dynamic_odoo.basic_widgets');
    var baseEdit = require('dynamic_odoo.views_edit_base');

    //
    // var PlanningEditController = PlanningController.extend({
    //     _pushState: function () {
    //     },
    // });

    // var PlanningViewEdit = PlanningView.extend({
    //     // config: _.extend({}, PlanningView.prototype.config, {
    //     //     Controller: PlanningEditController,
    //     // }),
    //     init: function (viewInfo, params) {
    //         params.readonly = true;
    //         this._super(viewInfo, params);
    //         // if (params.fromEdit) {
    //         //     const {domain} = this.getViewInfoParams(viewInfo);
    //         //     this.loadParams.domain = Domain.prototype.stringToArray(domain);
    //         // }
    //     },
    //     // getViewInfoParams: function (viewInfo) {
    //     //     const arch = typeof(viewInfo.arch) == "string" ? $(viewInfo.arch) : viewInfo.arch;
    //     //     const getProp = (prop) => (arch.attrs ? arch.attrs[prop] : arch.attr(prop));
    //     //     return {
    //     //         domain: getProp("filter") || '[]',
    //     //     }
    //     // },
    // });

    var PlanningProps = baseEdit.ViewProps.extend({
        init: function (parent, props) {
            this._super(parent, props);
            const {fields, arch, model} = props.viewInfo;
            this.state.node = arch;
            this.nodeProps.date_start = {
                name: 'date_start',
                valType: "string",
                label: 'Date Start',
                widget: basic_fields.ChooseField,
                fields: fields,
                fieldTypes: ["datetime", "date"]
            };
            this.nodeProps.date_end = {
                name: 'date_end',
                valType: "string",
                label: 'Date End',
                widget: basic_fields.ChooseField,
                fields: fields,
                fieldTypes: ["datetime", "date"]
            };
            this.nodeProps.label = {
                name: 'label',
                valType: "string",
                label: 'Label',
                propChange: this.onChangeLabel.bind(this),
                filter: (field) => ['many2one', 'char', 'selection', 'datetime', 'date'].includes(field.type),
                widget: basic_widgets.ChooseField,
                props: {model: model}
            };

            this.nodeProps.group_by = {
                name: 'group_by',
                valType: "string",
                label: 'Group By',
                widget: basic_fields.FieldM2mRaw,
                fields: fields,
                propChange: this.onChangeGroup.bind(this),
                fieldTypes: ["many2one"]
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
            this.viewPropsView = ["date_start", "date_end", "label", "group_by", "scale"];
            this.nodeViews.kanban = {view: this.viewPropsView};
            this.tabs = {};
        },
        prepareGroupsVal: function (node) {
            const data = [], {fields} = this.props.viewInfo;
            node.children.map((child) => {
                if (child.tag == "field") {
                    const fieldName = child.attrs.name, field = fields[fieldName];
                    data.push({label: field.string, value: fieldName});
                }
            });
            return data;
        },
        prepareParamsProp: function (node, viewPropsView) {
            const propsProp = this._super(node, viewPropsView);
            propsProp.scale.options = [{label: 'Day', value: 'day'}, {label: 'Week', value: 'week'}, {
                label: 'Month',
                value: 'month'
            }];
            if (viewPropsView.includes("group_by")) {
                propsProp.group_by.value = this.prepareGroupsVal(node);
            }
            return propsProp;
        },
        onChangeLabel: function (node, prop, value) {
            if (value) {
                node.attrs.label = value;
            } else {
                delete node.attrs.label;
            }
        },
        onChangeGroup: function (node, prop, value) {
            node.children = value.map((option) => this.nodeStore.newField({
                props: {
                    name: option.value,
                    type: "group"
                }
            }));
        },
    });

    var PlanningViewContent = baseEdit.ViewContent.extend({
        template: 'ViewStudio.View.Planning',
        isLegacy: true,
        init: function (parent, params) {
            this._super(parent, params);
            this.viewConfig.prop = PlanningProps;
            this.viewConfig.view = PlanningView;
        },
        prepareViewParams: function () {
            const res = this._super();
            res.readonly = true;
            return res;
        }
    });

    return PlanningViewContent;

});
