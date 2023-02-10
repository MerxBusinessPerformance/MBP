odoo.define('dashboard_studio.views_edit_base', function (require) {
    "use strict";

    var core = require('web.core');
    var Domain = require('web.Domain');
    var utils = require('web.utils');
    var basic_fields = require('dashboard_studio.basic_fields');
    var basic_widgets = require('dashboard_studio.basic_widgets');
    var fieldRegistry = require('web.field_registry');
    var base = require("dashboard_studio.base");
    var {View} = require("@web/views/view");
    var {ViewContainer} = require('dashboard_studio.ViewContainer');
    const {mount} = owl;

    var QWeb = core.qweb;

    var NewNodeStore = base.WidgetBase.extend({
        init: function (parent, props) {
            this._super(parent, props);
        },
        nodeField: function (params = {}) {
            const {fieldName, props} = params;
            let newField = {tag: "field"}, attributes = {...(props || {}), modifiers: {}, name: fieldName};
            newField.attrs = attributes;
            newField.children = [];
            return newField;
        },
    });

    var ViewProps = base.WidgetBase.extend({
        template: "DashboardStudio.PropsView",
        init: function (parent, props) {
            this._super(parent, props);
            this.state = {node: null, tab: "view"};
            const {viewInfo} = this.props, {model} = viewInfo;
            this.nodeProps = {};
            this.nodeProps.widget = {
                name: 'widget',
                valType: "string",
                label: 'Widget',
                widget: basic_fields.ChooseWidget
            };
            this.nodeProps.string = {name: 'string', valType: "string", label: 'String', widget: basic_fields.Input};
            this.nodeProps.create = {
                name: 'create',
                valType: "boolean",
                label: 'Create',
                widget: basic_fields.Radio,
                value: true
            };
            this.nodeProps.delete = {
                name: 'delete',
                valType: "boolean",
                label: 'Delete',
                widget: basic_fields.Radio,
                value: true
            };
            this.nodeProps.required = {
                name: 'required',
                valType: "bool_list",
                label: 'Required',
                widget: basic_fields.RadioCondition,
                props: {model: model}
            };
            this.nodeProps.model = {
                name: 'model',
                valType: "string",
                label: 'Model',
                field: {model: "model", relation: 'ir.model', name: "model", string: "Model"},
                widget: basic_fields.FieldMany2one
            };
            this.nodeProps.invisible = {
                name: 'invisible',
                valType: "bool_list",
                label: 'Invisible',
                widget: basic_fields.RadioCondition,
                props: {model: model}
            };
            this.nodeProps.readonly = {
                name: 'readonly',
                valType: "bool_list",
                label: 'Readonly',
                widget: basic_fields.RadioCondition,
                props: {model: model}
            };
            this.nodeProps.groups = {name: 'groups', valType: "string", label: 'Groups', widget: basic_fields.Groups};

            this.nodePropsView = [];
            this.viewPropsView = [];
            this.ref.props = {};
        },
        start: function () {
            this._super();
            this.tabs = {view: {label: "View", render: this.renderViewProps.bind(this), name: "view"}};
            this.hideTab = false;
            this.newNodeStore = new NewNodeStore(this, {});
        },
        setNodeActive: function (node) {
            this.setState({node: node});
            this.renderElement();
        },
        onChangeTab: function (tabName) {
            this.setState({tab: tabName});
            this.bindAction();
        },
        setNodeWidget: function (node, widgetName) {
            const {viewType, type, fieldsInfo} = this.props.viewInfo,
                {name} = node.attrs, fieldInfo = fieldsInfo[viewType || type][name];
            fieldInfo.Widget = fieldRegistry.getAny([viewType || type + "." + widgetName, widgetName]);
        },
        onChangeProp: function (node, prop, value) {
            const {onChangeProp} = this.props, {name} = prop;
            if (name == "model") {
                return this.onChangeModel(node, value);
            }
            node.attrs[name] = this.prepareValProp(prop, value);
            if (["readonly", "invisible", "required"].includes(name)) {
                node.attrs.modifiers[name] = value;
            } else if (["widget"].includes(name)) {
                this.setNodeWidget(node, node.attrs[name]);
            }
            if (onChangeProp) {
                onChangeProp(node);
            }
        },
        onChangeModel: async function (node, value) {
            const {jsonToXml, processFieldsView, onChangeProp} = this.props, viewInfo = this.props.viewInfo;
            // node.attrs.model = value.id;
            node.children = [];
            viewInfo.archXml = jsonToXml();
            viewInfo.arch = viewInfo.archXml;
            viewInfo.model = value.model;
            viewInfo.base_model = value.model;
            // fields_get
            viewInfo.fields = await this['_rpc']({
                model: value.model,
                method: 'fields_get',
                args: [],
                kwargs: {},
            });
            delete viewInfo.viewFields;
            const {arch, fieldsInfo, viewFields} = processFieldsView();
            viewInfo.arch = arch;
            viewInfo.fieldsInfo = fieldsInfo;
            viewInfo.viewFields = viewFields;
            onChangeProp(node, true);
        },
        setNodeId: function (node) {
            const nodeId = node.nodeId || "nodeId_" + this.getRandom();
            if (typeof node == 'object') {
                node.nodeId = nodeId;
            }
            this.nodes[nodeId] = node;
        },
        getRandom: function () {
            return String(Math.random()).replace("0.", "PD");
        },
        prepareValProp: function (prop, value) {
            const {valType} = prop;
            switch (valType) {
                case "boolean":
                    value = value ? "True" : "False";
                case "bool_list":
                    value = value ? "True" : "False";
                    break;
            }
            return value;
        },
        preparePropVal: function (prop, value) {
            const {valType} = prop;
            if (typeof value == "undefined") {
                value = false;
            }
            switch (valType) {
                case "string":
                    value = value ? String(value) : "";
                    break;
                case "bool_list":
                    if (["true", "True", "1", true].includes(value)) {
                        value = true;
                    } else if (["false", "False", "0", false].includes(value)) {
                        value = false;
                    } else if (Array.isArray(value)) {
                        value = Domain.prototype.arrayToString(value);
                    }
                    break;
                case "boolean":
                    value = ["true", "True", "1", true].includes(value);
                    break;
                case "number":
                    value = parseInt(value) || 0;
                    break;
            }
            return value;
        },
        getPropsDefault: function (node, propName) {
            const data = {};
            if (node.tag == "field") {
                const fieldName = node.attrs.name, field = this.props.viewInfo.fields[fieldName];
                switch (propName) {
                    case "widget":
                        Object.assign(data, {value: field.type, fieldType: field.type});
                        break;
                }
            }
            if (propName == "model") {
                const modelData = odoo['studio'].models.filter((model) => model.model == this.props.viewInfo.model);
                if (modelData.length) {
                    data.value = modelData[0].id;
                }
            }
            return data;
        },
        prepareParamsProp: function (node, propsView) {
            let nodeData = {};
            const propsProp = {}, {viewInfo} = this.props, tagNode = node.tag;
            if (tagNode == "field") {
                const fieldName = node.attrs.name;
                nodeData = Object.assign({}, viewInfo.fields[fieldName]);
            }
            propsView.map((propName) => {
                const propData = this.nodeProps[propName],
                    attrProps = Object.assign(this.getPropsDefault(node, propName), propData.props || {});
                if (propName in node.attrs || propName in nodeData) {
                    const propValue = (node.attrs.modifiers || {})[propName] || node.attrs[propName] || nodeData[propName] || attrProps.value;
                    attrProps.value = this.preparePropVal(propData, propValue);
                }
                propsProp[propName] = attrProps;
            });
            return propsProp;
        },
        onRemoveNode: function (e) {
            e.stopPropagation();
            e.stopImmediatePropagation();
            const {node} = this.state, {onRemoveNode} = this.props;
            if (node && onRemoveNode) {
                onRemoveNode(node);
            }
        },
        bindAction: function () {
            this._super();
            this.$el.find(".wRemoveNode a").click(this.onRemoveNode.bind(this));
        },
        renderButtons: function () {
            return QWeb.render("DashboardStudio.Buttons", {});
        },
        renderNodeProps: function () {
            const {node} = this.state;
            if (!node) {
                return [];
            }
            const nodeProps = this.renderProps(node, this.nodePropsView);
            nodeProps.push(this.renderButtons());
            return nodeProps;
        },
        renderViewProps: function () {
            const {viewInfo} = this.props;
            return $(QWeb.render("DashboardStudio.Tree.TabView", {})).append(this.renderProps(viewInfo.arch, this.viewPropsView));
        },
        renderProps: function (node, propsView) {
            const paramsProp = this.prepareParamsProp(node, propsView), container = [];
            propsView.map((propName) => {
                const propData = Object.assign({}, this.nodeProps[propName]);
                if (propData) {
                    const params = Object.assign(paramsProp[propName] || {},
                        {onChange: (value) => this.onChangeProp.bind(this)(node, propData, value)});
                    const propView = new propData.widget(this, Object.assign(propData, params));
                    propView.renderElement();
                    container.push(propView.$el);
                }
            });
            return container;
        },
        renderTabs: function () {
            const {tab} = this.state;
            this.ref.tab = new basic_widgets.Tab(this, {
                tabs: this.tabs,
                value: tab,
                onRender: this.onChangeTab.bind(this)
            });
            this.ref.tab.renderElement();
            this.$el.find('.wPViewCon').empty().append(this.ref.tab.$el)
        },
        renderView: function () {
            this.$el.find(".wPViewHead").empty().append(this.renderNodeProps());
            this.hideTab ? this.$el.find(".wPViewCon").empty().append(this.renderViewProps()) : this.renderTabs();
        }
    });

    var ViewContent = base.WidgetBase.extend({
        init: function (parent, params) {
            this._super(parent, params);
            this.nodes = {};
            this.sortParams = {selector: []};
            this.viewConfig = {};
        },
        start: function () {
            const {action} = this.props;
            this.action = action;
        },
        setViewInfo: function (viewInfo) {
            this.props.viewInfo = viewInfo;
            this.renderView();
        },
        prepareDataToSave: function () {
            const {viewInfo} = this.props, {view_id, model} = viewInfo;
            return {arch: this.jsonToXml(), view_id: view_id, model_name: model};
        },
        prepareDataToReset: function () {
            const {viewInfo} = this.props, {view_id} = viewInfo;
            return {view_id: view_id};
        },
        jsonToXml: function () {
            return utils["json_node_to_xml"](this.props.viewInfo.arch);
        },
        _processFieldsView: function () {
            return this.getParent()._getViewInfo(this.props.viewInfo);
        },
        prepareNewField: function (params = {}) {
            const {fieldName} = params;
            let newField = {tag: "field"}, props = {modifiers: {}, name: fieldName};
            newField.attrs = props;
            newField.children = [];
            return newField;
        },
        preparePropsParams: function () {
            return {
                ...this.props,
                processFieldsView: this._processFieldsView.bind(this),
                bindSortable: this.bindSortable.bind(this),
                jsonToXml: this.jsonToXml.bind(this),
                onChangeProp: this.onChangeProp.bind(this),
                onRemoveNode: this.onRemoveNode.bind(this)
            };
        },
        prepareViewParams: function () {
            const {context, domain, limit, res_model, filter} = this.action;
            return {
                action: this.action,
                context: context,
                domain: domain || [],
                groupBy: [],
                limit: limit,
                filter: filter || [],
                modelName: res_model,
                fromEdit: true,
                withButtons: false,
                withControlPanel: false,
                withSearchPanel: false,
                setNodeId: this.setNodeId.bind(this),
                onClickNode: this.onClickNode.bind(this),
            };
        },
        getRandom: function () {
            return String(Math.random()).replace("0.", "PD");
        },
        setNodeId: function (node) {
            const nodeId = node.nodeId || "nodeId_" + this.getRandom();
            if (typeof node == 'object') {
                node.nodeId = nodeId;
            }
            this.nodes[nodeId] = node;
        },
        onClickNode: function (node) {
            this.ref.viewProps.setNodeActive(node);
        },
        onRemoveNode: function (node) {
        },
        onChangeProp: function (node, reload = false) {
            if (reload) {
                return this.renderView();
            }
            this.renderViewContent();
        },
        onStartSort: function (ui) {
        },
        onStopSort: function (ui) {
        },
        onChangeSort: function (ui) {
        },
        bindSortable: function (el) {
            const self = this, {selector, placeholder} = this.sortParams;
            if (selector.length) {
                const sortParams = {
                    start: function (event, ui) {
                        self.onStartSort(ui);
                    },
                    stop: function (event, ui) {
                        self.onStopSort(ui);
                    },
                    change: function (event, ui) {
                        self.onChangeSort(ui);
                    }
                };
                if (placeholder) {
                    sortParams.placeholder = placeholder;
                }
                selector.map((data) => {
                    el.find(data[0].replace("-", "")).sortable({
                        connectWith: data[1].replace("-", ""),
                        ...sortParams
                    }).disableSelection();
                });
            }
        },
        bindAction: function () {
            this._super();
            this.bindSortable(this.$el);
        },
        renderViewProps: function () {
            const viewProps = new this.viewConfig.prop(this, this.preparePropsParams());
            this.ref.viewProps = viewProps;
            this.ref.viewProps.renderElement();
            this.$el.find('.viewProps').empty().append(this.ref.viewProps.$el);
        },
        renderLegacyView: async function () {
            const self = this, {res_model} = this.action, {viewInfo} = this.props;
            let params = {
                // action: this.action,
                context: {},
                domain: [],
                groupBy: [],
                filter: [],
                modelName: viewInfo.model,
                withControlPanel: false,
                withSearchPanel: false,
            };
            const info = {
                View: this.viewConfig.view,
                viewInfo: viewInfo,
                viewParams: Object.assign(this.prepareViewParams(), params)
            }
            const env = odoo.__WOWL_DEBUG__.root.env;
            const viewContainer = await mount(ViewContainer, {
                env,
                props: {info: info, isLegacy: true},
                target: self.$el.find(".viewView").empty()[0],
                position: "first-child"
            });
            this.bindAction();
            this.bindStyle();
            const {component} = viewContainer.__owl__.refs;
            this.ref.viewContent = component.widget;
        },
        getSearchParams: function () {
            const {viewInfo} = this.props, arch = typeof(viewInfo.arch) == "string" ? $(viewInfo.arch) : viewInfo.arch;
            const getProp = (prop) => (arch.attrs ? arch.attrs[prop] : arch.attr(prop));
            return {
                domain: Domain.prototype.stringToArray(getProp("filter") || '[]'),
            }
        },
        renderTrendView: async function () {
            const self = this, {viewInfo} = this.props;
            const {fields} = viewInfo;
            const {viewType} = this.getParent().state;
            const archXml = this.jsonToXml();
            const props = {
                arch: archXml,
                fields: fields,
                resModel: viewInfo.model,
                type: viewType,
                context: {},
                display: {
                    controlPanel: false,
                },
                ...this.getSearchParams(),
            }
            const env = odoo.__WOWL_DEBUG__.root.env;
            const viewContainer = await mount(View, {
                env,
                props: props,
                target: self.$el.find(".viewView").empty()[0],
                position: "first-child"
            });
            this.bindAction();
            this.bindStyle();
            this.ref.viewContent = viewContainer;
        },
        renderViewContent: function () {
            if (this.viewConfig.view) {
                this.renderLegacyView();
            } else {
                this.renderTrendView();
            }
        },
        renderView: function () {
            this.renderViewContent();
            this.renderViewProps();
        },
    });

    return {ViewProps: ViewProps, ViewContent: ViewContent};
});
