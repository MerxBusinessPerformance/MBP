odoo.define('dynamic_odoo.views_edit_base', function (require) {
    "use strict";

    const core = require('web.core');
    const Domain = require('web.Domain');
    const utils = require('web.utils');
    const viewUtils = require('web.viewUtils');
    const basic_fields = require('dynamic_odoo.basic_fields');
    const basic_widgets = require('dynamic_odoo.basic_widgets');
    const fieldRegistry = require('web.field_registry');
    const base = require("dynamic_odoo.base");
    const {View} = require("@web/views/view");
    const ViewContainer = require("dynamic_odoo.ViewContainer");

    var QWeb = core.qweb;
    var {mount} = owl;


    var NewNodeStore = base.WidgetBase.extend({
        init: function (parent, props) {
            this._super(parent, props);
            this.nodeStore = {
                field: this.newField, group: this.newGroup,
                notebook: this.newNotebook, title: this.newTitle,
                t_field: this.newTField,
                table: this.newTable,
                button: this.newButton,
                text: this.newText, image: this.newImage, grid: this.newGrid
            };
        },
        stringXmlToJSON: function (el) {
            return eval('utils.xml_to_json((new DOMParser()).parseFromString(el, "text/xml"), false)');
        },
        newNode: function (params = {}) {
            const {tag, props, content, children} = params;
            if (tag in this.nodeStore) {
                return this.nodeStore[tag].bind(this)(params);
            }
            const node = {tag: tag, children: content || children || []};
            node.attrs = {modifiers: {}, ...(props || {})};
            return node;
        },
        newField: function (params = {}) {
            const {props} = params, newField = {tag: "field"};
            newField.attrs = {modifiers: {}, ...(props || {})};
            newField.children = [];
            return newField;
        },
        newButton: function (params = {}) {
            const {props} = params, newButton = {tag: "button"};
            newButton.attrs = {
                modifiers: {},
                need_action: `btn_${Math.random()}`,
                type: "object",
                string: "New Button", ...(props || {}), name: "fnc_button_studio"
            };
            newButton.children = [];
            return newButton;
        },
        newGroup: function (params = {}) {
            const {childSize, props} = params, newGroup = {tag: "group", children: []};
            newGroup.attrs = {name: "new_group_" + moment().unix(), modifiers: {}, ...(props || {})};
            if (childSize && childSize > 1) {
                _.times(childSize, () => {
                    newGroup.children.push(this.newGroup())
                });
            }
            return newGroup;
        },
        newPage: function (props = {}) {
            let newPage = {tag: "page"};
            newPage.attrs = {string: "New Page", name: "new_page_" + moment().unix(), ...props};
            newPage.children = [this.newGroup()];
            return newPage;
        },
        newNotebook: function (props = {}) {
            let newNotebook = {tag: "notebook"};
            newNotebook.attrs = {modifiers: {}, ...props};
            newNotebook.children = [this.newPage()];
            return newNotebook;
        },
        newTable: function (props = {}) {
            let tableXml = QWeb.templates["Studio.Form.Component.Table"].children[0];
            tableXml = $(tableXml.cloneNode(true));
            tableXml.find("t[t-foreach]").attr("t-foreach", props.props.each_data);
            return this.stringXmlToJSON(tableXml[0].outerHTML);
        },
        newTitle: function (props = {}) {
            const res = this.stringXmlToJSON(QWeb.render("Studio.Form.Component.Title", {}));
            return res;
        },
        newText: function (props = {}) {
            return this.stringXmlToJSON(QWeb.render("Studio.Form.Component.Text", {}));
        },
        newImage: function (props = {}) {
            return this.stringXmlToJSON(QWeb.render("Studio.Form.Component.Image", {}));
        },
        newGrid: function (props = {}) {
            return this.stringXmlToJSON(QWeb.render("Studio.Form.Component.Grid", props.props));
        },
        newTField: function (props) {
            return this.stringXmlToJSON(QWeb.render("Studio.Form.Component.TField", {}));
        }
    });

    var EditProps = base.WidgetBase.extend({
        template: "ViewStudio.PropsView",
        init: function (parent, props) {
            this._super(parent, props);
            const {tab, node} = this.props;
            this.state = {node: node, tab: tab || "view"};
            const {viewInfo} = this.props;
            this.nodeProps = {};
            this.nodeViews = {};
            this.nodePropsView = [];
            this.viewPropsView = [];
            this.ref.props = {};

            this.nodeViews.img = {view: ["invisible", "style", "more"]};
            this.nodeViews.div = {view: (node) => this.prepareDivView(node)};
            this.nodeViews.span = {view: ["invisible", "text", "style", "more"]};
            this.nodeViews.p = {view: ["invisible", "text", "style", "more"]};
            this.nodeViews.a = {view: ["invisible", "href", "text", "style", "more"]};
        },
    });

    var EditContent = base.WidgetBase.extend({
        assetLibs: ['web_editor.compiled_assets_wysiwyg'],
    });

    var ViewProps = EditProps.extend({
        init: function (parent, props) {
            this._super(parent, props);
            const {tab, node, el} = this.props;
            this.state = {node: node, el: el, tab: tab || "view"};
            const {viewInfo} = this.props, {model} = viewInfo;
            this.nodeProps = {};
            this.nodeProps.widget = {
                name: 'widget', valType: "string", label: 'Widget',
                propChange: this.widgetChange.bind(this), widget: basic_fields.ChooseWidget
            };
            this.nodeProps.string = {
                name: 'string', valType: "string", label: 'String', widget: basic_fields.Input,
                propChange: this.stringChange.bind(this)
            };
            this.nodeProps.edit = {
                name: 'edit',
                valType: "boolean",
                label: 'Can Edit',
                widget: basic_fields.Radio,
                value: true
            };
            this.nodeProps.create = {
                name: 'create',
                valType: "boolean",
                label: 'Can Create',
                widget: basic_fields.Radio,
                value: true
            };
            this.nodeProps.delete = {
                name: 'delete',
                valType: "boolean",
                label: 'Can Delete',
                widget: basic_fields.Radio,
                value: true
            };
            this.nodeProps.required = {
                name: 'required', valType: "bool_list", label: 'Required',
                widget: basic_fields.RadioCondition, propChange: this.modifierChange.bind(this), props: {model: model}
            };
            this.nodeProps.invisible = {
                name: 'invisible', valType: "bool_list", label: 'Invisible',
                propChange: this.modifierChange.bind(this), widget: basic_fields.RadioCondition, props: {model: model}
            };
            this.nodeProps.readonly = {
                name: 'readonly', valType: "bool_list", label: 'Readonly',
                propChange: this.modifierChange.bind(this), widget: basic_fields.RadioCondition, props: {model: model}
            };
            this.nodeProps.groups = {
                name: 'groups',
                valType: "string",
                propChange: this.groupChange.bind(this),
                label: 'Groups',
                widget: basic_fields.Groups
            };
            this.nodeProps.show_invisible = {
                name: 'show_invisible',
                valType: "boolean",
                label: 'Show All Invisible',
                widget: basic_fields.ToggleSwitch
            };
            this.nodeProps.style = {
                name: "style",
                valType: "string",
                label: "Style",
                widget: basic_widgets.CssWidget,
                prepareProps: this.prepareStyleProps.bind(this)
            };
            this.nodeProps.href = {
                name: "href",
                valType: "string",
                label: "Link",
                placeholder: "https://",
                widget: basic_fields.Input
            };
            this.nodeProps.text = {
                name: "text",
                valType: "string",
                label: "Text",
                propChange: this.onChangeText.bind(this),
                widget: basic_fields.TextArea
            };
            this.nodeProps.grid_columns = {
                name: "grid_option",
                valType: "number",
                label: "Columns",
                propChange: this.onChangeGridColumns.bind(this),
                prepareProps: this.prepareGridColumnsProps.bind(this),
                widget: basic_fields.Input
            };
            this.nodeProps.grid_cols = {
                name: "grid_cols", valType: "number", label: "Cols", propChange: this.onChangeGridCols.bind(this),
                prepareProps: this.prepareGridColsProps.bind(this), widget: basic_fields.Input
            };
            this.nodeProps.choose_field = {
                name: 'choose_field',
                valType: "string",
                label: 'Choose Field',
                widget: basic_widgets.ChooseField,
                props: {model: model}
            };
            this.nodeProps.more = {
                name: 'more',
                valType: "string",
                label: 'More',
                widget: basic_widgets.ViewMoreProps,
                onRemoveNode: this.onRemoveNode.bind(this)
            };

            this.nodeViews = {};
            this.nodePropsView = [];
            this.viewPropsView = [];
            this.ref.props = {};

            this.nodeViews.img = {view: ["invisible", "style", "more"]};
            this.nodeViews.div = {view: (node) => this.prepareDivView(node)};
            this.nodeViews.span = {view: ["invisible", "text", "style", "more"]};
            this.nodeViews.p = {view: ["invisible", "text", "style", "more"]};
            this.nodeViews.a = {view: ["invisible", "href", "text", "style", "more"]};
        },
        initParams: function () {
            this._super();
            this.tabs = {view: {label: "View", render: this.renderViewProps.bind(this), name: "view", icon: "th"}};
            this.hideTab = false;
            this.nodeStore = new NewNodeStore(this, {});
        },
        prepareDivView: function (node) {
            const view = ["invisible", "style", "more"];
            if (node.attrs.component == "title") {
                view.splice(1, 0, ...["invisible_view_mode", "choose_field"]);
            } else if ((node.attrs.class || "").includes("gridCol")) {
                view.splice(1, 0, ...["grid_cols"]);
            } else if ((node.attrs.class || "").includes("wGrid")) {
                view.splice(1, 0, ...["grid_columns"]);
            }
            return view;
        },
        prepareGridColsProps: function (node, nodeProps) {
            (node.attrs.class || "").split(" ").map((cl) => {
                if (cl.includes("col-")) {
                    nodeProps.value = cl.replace("col-", "");
                }
            });
        },
        prepareGridColumnsProps: function (node, nodeProps) {
            nodeProps.value = node.children.filter((_node) => _node.tag == "div")[0].children.filter((_node) => _node.tag == "div").length;
        },
        prepareStyleProps: function (node, nodeProps) {
            const {onCopyNode, onRemoveNode} = this.props, {el} = this.state;
            nodeProps.el = el;
            nodeProps.onCopyNode = onCopyNode;
            nodeProps.onRemoveNode = onRemoveNode;
        },
        setNodeActive: function (node, el) {
            this.setState({node: node, el: el});
            this.renderElement();
        },
        onChangeGridColumns: function (node, prop, value, noCol = 0) {
            value = this.preparePropVal(prop, value);
            const row = node.children.filter((_node) => _node.tag == "div")[0],
                childCols = row.children.filter((_node) => _node.tag == "div"), columnsNeed = childCols.length - value;
            if (columnsNeed == 0) {
                return;
            }
            if (columnsNeed > 0) {
                const idCheck = childCols[value - 1].nodeId,
                    idxSplice = row.children.findIndex((_node) => _node.nodeId == idCheck);
                return row.children.splice(idxSplice + 1);
            }
            for (let i = 0; i < Math.abs(columnsNeed); i++) {
                const colClass = noCol ? "col-" + String(noCol) : "col";
                row.children.push(this.nodeStore.newNode({tag: "div", props: {class: colClass + " gridCol"}}));
            }
        },
        onChangeGridCols: function (node, prop, value) {
            let cls = (node.attrs.class || "").split(" ").filter((con) => {
                return !(con == "col" || (con.includes("col-") ? true : false));
            });
            cls.push(value ? "col-" + value : "col");
            node.attrs.class = cls.join(" ");
        },
        groupChange: function (node, prop, value) {
            value ? (node.attrs.groups = value) : (delete node.attrs.groups);
        },
        onChangeText: function (node, prop, value) {
            node.children = [value];
        },
        onChangeTab: function (tabName) {
            this.setState({tab: tabName});
            this.bindAction();
        },
        widgetChange: function (node, prop, value) {
            const {setNodeWidget} = this.props, {name} = prop;
            node.attrs[name] = value;
            setNodeWidget(node, node.attrs[name]);
        },
        stringChange: function (node, prop, value) {
            const {viewInfo} = this.props, {fieldsInfo, type} = viewInfo;
            node.attrs.string = value;
            if (node.tag == "field") {
                const fieldInfo = fieldsInfo[type][node.attrs.name];
                if (fieldInfo) {
                    fieldInfo.string = value;
                }
            }
        },
        modifierChange: function (node, prop, value) {
            const {name} = prop, parseVal = this.preparePropVal(prop, value);
            if (!node.attrs.modifiers) {
                node.attrs.modifiers = {};
            }
            if (!node.attrs.props_modifier) {
                node.attrs.props_modifier = {};
            }
            if (typeof node.attrs.props_modifier == "string") {
                node.attrs.props_modifier = JSON.parse(node.attrs.props_modifier);
            }
            delete node.attrs.props_modifier[name];
            node.attrs.modifiers[name] = parseVal;
            if (Array.isArray(parseVal)) {
                parseVal.length ? (node.attrs.props_modifier[name] = value) : (delete node.attrs.modifiers[name]);
            } else {
                node.attrs[name] = value;
            }
        },
        onChangeProp: function (node, prop, value) {
            const {onChangeProp, viewInfo} = this.props, {name} = prop, realVal = value;
            value = this.prepareValProp(prop, value);
            if (!prop.noUpdate) {
                if (prop.propChange) {
                    prop.propChange(node, prop, value);
                } else {
                    const isDel = prop.del && !realVal;
                    isDel ? (delete node.attrs[name]) : (node.attrs[name] = value);
                    if (node.tag == "field") {
                        const {type, fieldsInfo} = viewInfo, fieldInfo = fieldsInfo[type][node.attrs.name];
                        if (fieldInfo)
                            isDel ? (delete fieldInfo[name]) : (fieldInfo[name] = value);
                    }
                }
            }
            if (node.noReload) {
                delete node.noReload;
                return true;
            }
            if (onChangeProp) {
                onChangeProp(node);
            }
        },
        prepareValProp: function (prop, value) {
            const {valType} = prop;
            if (!prop.notPreVal) {
                switch (valType) {
                    case "bool_list":
                        if (JSON.stringify(value).indexOf("[") >= 0) {
                            break;
                        }
                    case "boolean":
                        value = ["True", "true", true, "1"].includes(value) ? "1" : "0";
                        break;
                    case "list":
                        value = JSON.stringify(value);
                        break;
                    case "string":
                        value = String(value);
                }
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
                    if (value) {
                        value = typeof value != "string" ? JSON.stringify(value || "") : value;
                    }
                    break;
                case "bool_list":
                    if (["true", "True", "1", true].includes(value)) {
                        value = true;
                    } else if (["false", "False", "0", false].includes(value)) {
                        value = false;
                    } else if (value.includes('[')) {
                        value = Domain.prototype.stringToArray(value);
                    }
                    break;
                case "list":
                    value = JSON.parse(value || '[]');
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
                const fieldName = node.attrs.name;
                if (!fieldName)
                    return data;
                const {fields, viewFields, model} = this.props.viewInfo,
                    field = fields[fieldName] || viewFields[fieldName];
                data.field = Object.assign({name: fieldName}, field);
                data.field_name = fieldName;
                switch (propName) {
                    case "widget":
                        Object.assign(data, {value: field.type, fieldType: field.type});
                        break;
                    case "domain":
                        data.model = field.relation;
                        break;
                    case "more":
                        data.model = model;
                        break;
                    case "selection":
                        data.options = field.selection;
                        break;
                }
            }
            return data;
        },
        getFieldInfo: function () {
            const {viewInfo} = this.props, fieldInfo = {};
            const loopNode = (nodes) => {
                nodes.map((node) => {
                    if (node.tag == "field") {
                        fieldInfo[node.attrs.name] = node;
                    }
                    loopNode(node.children || []);
                });
            }
            loopNode(viewInfo.arch.children);
            return fieldInfo;
        },
        getNodeView: function (node) {
            var propView = this.nodeViews[node.tag] || {}, view = propView.view || this.nodePropsView;
            if (typeof(view) == 'function') {
                view = view(node);
            }
            return view;
        },
        prepareParamsProp: function (node, propsView) {
            var nodeData = {}, propsProp = {};
            if (node) {
                const {viewInfo} = this.props, {arch} = viewInfo, tagNode = node.tag;
                if (tagNode == "field") {
                    const fieldName = node.attrs.name;
                    nodeData = Object.assign({}, viewInfo.fields[fieldName]);
                }
                propsView.map((propName) => {
                    if (typeof(propName) != "object") {
                        const propData = this.nodeProps[propName],
                            attrProps = Object.assign(this.getPropsDefault(node, propName), propData.props || {});
                        if (propName in node.attrs || propName in (node.attrs.modifiers || {}) || propName in nodeData) {
                            var propValues = [(node.attrs.modifiers || {})[propName], node.attrs[propName], nodeData[propName], attrProps.value].filter((d) => typeof d != "undefined");
                            if (propName == "invisible" && arch.tag == "tree") {
                                propValues = [(node.attrs.modifiers || {})["column_invisible"]].concat(propValues);
                            }
                            if (propValues.length) {
                                attrProps.value = this.preparePropVal(propData, propValues[0]);
                            }
                        }
                        attrProps.node = node;
                        propsProp[propName] = attrProps;
                        if (propData.prepareProps) {
                            propData.prepareProps(node, attrProps);
                        }
                    }
                });
                if (propsView.includes("text")) {
                    propsProp.text.value = node.children.filter((child) => typeof child == 'string').join(",").trim();
                }
            }
            return propsProp;
        },
        prepareDataTabFields: function (search) {
            const {viewInfo} = this.props, fieldsInfo = this.getFieldInfo(), {fieldsGet, fields} = viewInfo,
                fieldsAp = {}, withoutFields = ["activity_exception_icon"];
            search = search.toLowerCase();
            Object.keys((fieldsGet || fields)).map((fieldName) => {
                const field = (fieldsGet || fields)[fieldName], fieldNode = fieldsInfo[fieldName] || {};
                if (!withoutFields.includes(fieldName) && (!(fieldName in fieldsInfo) || fieldNode.willShow)
                    && field.string.toLowerCase().includes(search)) {
                    fieldsAp[fieldName] = Object.assign({name: fieldName}, field);
                }
            });
            return {fields: fieldsAp};
        },
        onSearchField: function (e) {
            e.stopPropagation();
            e.stopImmediatePropagation();
            const $el = $(e.currentTarget), value = $el.val(), {fields} = this.prepareDataTabFields(value);
            this.ref.tab.$el.find('.wFields').empty().append(Object.values(fields).map((field) => {
                return QWeb.render("ViewStudio.View.TabFields.item", {field: field, fieldName: field.name});
            }));
            this.bindAction();
        },
        onRemoveNode: function (e) {
            if (e) {
                e.stopPropagation();
                e.stopImmediatePropagation();
            }
            const {node} = this.state, {onRemoveNode} = this.props;
            if (node && onRemoveNode) {
                onRemoveNode([node.nodeId]);
            }
        },
        bindAction: function () {
            this._super();
            this.$el.find(".wRemoveNode a").click(this.onRemoveNode.bind(this));
            this.$el.find("._ipSearch").keyup(this.onSearchField.bind(this));
        },
        renderFieldsExist: function (search = "") {
            const {fields} = this.prepareDataTabFields(search);
            return QWeb.render("ViewStudio.View.TabFields", {fields: fields});
        },
        renderButtons: function () {
            return QWeb.render("ViewStudio.Buttons", {});
        },
        renderNodeProps: function (container) {
            const {node} = this.state;
            if (!node) {
                return [];
            }
            const nodeProps = this.renderProps(node, this.getNodeView(node), $("<div>"));
            nodeProps.after(this.renderButtons());
            if (container) {
                container.append(nodeProps);
            }
            return nodeProps;
        },
        renderViewProps: function () {
            const {viewInfo} = this.props;
            return $(QWeb.render("ViewStudio.Tree.TabView", {})).append(this.renderProps(viewInfo.arch, this.viewPropsView, $("<div>")));
        },
        renderProps: function (node, propsView, container) {
            const paramsProp = this.prepareParamsProp(node, propsView);
            propsView.map((propName) => {
                var wrapProp = null;
                if (typeof(propName) == "object") {
                    const {view, classes} = propName;
                    wrapProp = $("<div class='wrapGroup'>").addClass(classes);
                    this.renderProps(node, view, wrapProp);
                } else {
                    const propData = Object.assign({}, this.nodeProps[propName]);
                    if (propData) {
                        wrapProp = $("<div class='wrapField'>");
                        const params = Object.assign(paramsProp[propName] || {},
                            {onChange: (value) => this.onChangeProp.bind(this)(node, propData, value)});
                        const propView = new propData.widget(this, Object.assign(propData, params));
                        propView.appendTo(wrapProp);
                    }
                }
                container.append(wrapProp);
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
            this.reloadNodeProps();
            if (Object.keys(this.tabs).length) {
                this.hideTab ? this.$el.find(".wPViewCon").empty().append(this.renderViewProps()) : this.renderTabs();
            }
        },
        reloadNodeProps: function () {
            this.$el.find(".wPViewHead").empty().append(this.renderNodeProps());
        }
    });

    var ViewContent = EditContent.extend({
        init: function (parent, params) {
            this._super(parent, params);
            this.nodes = {};
            this.newFields = {};
            this.sortParams = {selector: []};
            this.state = {node: null};
            this.viewConfig = {};
            // this.nodeStore = {};
            this.viewHasChange = false;
            this.nodeStore = new NewNodeStore(this, {});
            // this.stackSubView = {};
        },
        initParams: function () {
            const {action} = this.props;
            this.action = action;
        },
        stringXmlToJSON: function (el) {
            return eval('utils.xml_to_json((new DOMParser()).parseFromString(el, "text/xml"), false)');
        },
        resetNode: function () {
            const {node} = this.state;
            if (this.willResetNode) {
                this.willResetNode = false;
                if (node && (node.nodeId in this.nodes)) {
                    this.setNodeActive(this.nodes[node.nodeId]);
                }
            }
        },
        getViewInfo: function () {
            return this.props.viewInfo;
        },
        setViewInfo: function (viewInfo, params = {}) {
            this.willResetNode = true;
            Object.assign(this.props.viewInfo, viewInfo);
            this.nodes = {};
            if (params.reset) {
                this.setState({node: null});
                this.renderViewProps();
            }
            return this.renderViewContent();
        },
        setNodeWidget: function (node, widgetName) {
            const {viewType, type, fieldsInfo} = this.props.viewInfo,
                {name} = node.attrs, fieldInfo = fieldsInfo[viewType || type][name];
            fieldInfo.Widget = fieldRegistry.getAny([viewType || type + "." + widgetName, widgetName]);
        },
        canSave: function () {
            return true;
        },
        getViewKey: function () {
            return ("VIEW_id" + Math.random()).replace(".", "");
        },
        getViewType: function (viewType) {
            return viewType == "list" ? "tree" : viewType
        },
        getViewStore: function () {
            var view = this, viewRoot = [], viewInParent = [], {inParent} = this.props.viewInfo;
            (inParent ? viewInParent : viewRoot).push(this);
            while (view.props.parentView) {
                view = view.props.parentView;
                const {inParent} = view.props.viewInfo;
                if (inParent) {
                    viewInParent.push(view);
                } else {
                    viewRoot.push(view);
                }
            }
            return {viewRoot: viewRoot, viewInParent: viewInParent};
        },
        resetPropsChange: function () {
            const {viewInfo, processFieldsView} = this.props, {arch_original} = viewInfo,
                {parentField, type} = viewInfo, {fieldNode, fieldInfo} = parentField;
            if (arch_original) {
                const index = fieldNode.children.findIndex((_view) => _view.tag == type), view = fieldInfo.views[type];
                Object.values(this.newFields).map((newField) => {
                    const fieldName = newField.attrs.name;
                    delete view.fields[fieldName];
                    delete view.viewFields[fieldName];
                });
                const viewInfoOriginal = processFieldsView({
                        arch: arch_original,
                        fieldsView: view.viewFields,
                        fields: view.fields
                    }, type),
                    {arch, fieldsInfo} = viewInfoOriginal;
                if (index >= 0) {
                    fieldNode.children.splice(index, 1, arch);
                }
                view.arch = arch;
                view.fieldsInfo = fieldsInfo;
            }
        },
        _prepareDataSave: function () {
            const {viewInfo, parentView} = this.props, {viewId, view_id, view_key, parentField, inParent, model, type} = viewInfo,
                viewKey = view_key || this.getViewKey(), {action} = $.bbq.getState(true), res = {
                    view_type: this.getViewType(type), action_id: action,
                    view_id: viewId || view_id, stack_id: this.stackId, model_name: model, view_key: viewKey
                };
            if (!res.view_id) {
                let _context = parentField.fieldNode.attrs.context || "{}";
                _context = JSON.parse(_context.replaceAll("'", "\""));
                _context[res.view_type + '_view_ref'] = 'odoo_studio.' + res.view_key;
                _context = JSON.stringify(_context);
                _context = _context.replaceAll("\"", "'");
                parentField.fieldNode.attrs.context = _context;
            }
            res.stack_id = this.stackId;
            if (parentView) {
                res.parent_stack_id = parentView.stackId;
            }
            if (inParent) {
                let viewCheck = this;
                while (viewCheck.props.parentView) {
                    viewCheck = viewCheck.props.parentView;
                    const {inParent} = viewCheck.props.viewInfo;
                    if (!inParent) {
                        res.stack_root_id = viewCheck.stackId;
                        break;
                    }
                }
                return res;
            }
            res.arch = this.jsonToXml();
            return res;
        },
        prepareDataToSave: function () {
            const self = this, {viewInfo} = this.props, {view_key} = viewInfo,
                res = [], {action} = $.bbq.getState(true);
            self.viewHasChange = false;
            const {viewRoot, viewInParent} = this.getViewStore();
            viewInParent.map((view) => {
                const {viewInfo} = view.props, {arch_base} = viewInfo;
                view.viewHasChange = false;
                res.push(view._prepareDataSave());
                if (arch_base) {
                    const {parentField} = viewInfo, {fieldNode, fieldInfo} = parentField, viewKey = this.getViewKey();
                    Object.values(fieldInfo.views).map((view) => {
                        res.push({
                            arch: view.arch_base, force: true, parent_stack_id: view.stack_id, action_id: action,
                            view_type: this.getViewType(view.type), view_key: viewKey
                        });
                    });
                    fieldNode.attrs.view_key = viewKey;
                }
            });
            viewRoot.map((view) => {
                view.viewHasChange = false;
                res.push(view._prepareDataSave());
            });
            return res;
        },
        prepareViewInParent: async function () {
            const {viewInfo, onGet} = this.props, {parentField, type} = viewInfo,
                {fieldNode} = parentField, {action} = $.bbq.getState(true);
            if (onGet) {
                const view_base = await onGet([['action_id', '=', action] ['view_type', 'in', [this.getViewType(type)]]]);
                view_base.map((view) => {
                    const {view_type, arch} = view,
                        index = fieldNode.children.findIndex((_view) => _view.tag == view_type);
                    if (index >= 0) {
                        fieldNode.children.splice(index, 1, viewUtils.parseArch(arch));
                    }
                });
            }
            return {store: true, values: this.prepareDataToSave()};
        },
        prepareDataToReset: async function () {
            this.viewHasChange = false;
            const {viewInfo} = this.props, {view_studio_id, inParent} = viewInfo;
            if (inParent) {
                return this.prepareViewInParent();
            }
            return {values: [view_studio_id]};
        },
        jsonToXml: function (data) {
            if (!data) {
                data = this.props.viewInfo.arch;
            }
            return utils["json_node_to_xml"](data);
        },
        prepareNewNode: function (params) {
            const node = this.nodeStore.newNode(params);
            this.setNodeId(node);
            return node;
        },
        preparePropsParams: function () {
            const {node, el} = this.state;
            const res = {
                ...this.props,
                bindSortable: this.bindSortable.bind(this),
                node: node,
                el: el,
                setNodeId: this.setNodeId.bind(this),
                onXpathNode: this.onXpathNode.bind(this),
                setNodeWidget: this.setNodeWidget.bind(this),
                nodes: this.nodes,
                onCopyNode: this.onCopyNode.bind(this),
                onChangeProp: this.onChangeProp.bind(this),
                newNodes: this.nodeStore,
                onRemoveNode: this.onRemoveNode.bind(this)
            };
            return res;
        },
        prepareViewParams: function () {
            const {viewInfo, loadParams, viewProps} = this.props,
                {context, domain, limit, filter} = this.action, {model} = viewInfo;
            const res = {
                ...this.props,
                action: this.action,
                context: {...(context || {})},
                domain: domain || [],
                groupBy: [],
                loadParams: loadParams || {},
                mode: "readonly",
                limit: limit,
                filter: filter || [],
                modelName: model,
                fromEdit: true,
                useSampleModel: false,
                nodes: this.nodes,
                bindAction: this.bindAction.bind(this),
                newNodes: this.nodeStore,
                setNodeId: this.setNodeId.bind(this),
                onClickNode: this.onClickNode.bind(this),
                setNodeActive: this.setNodeActive.bind(this),
                bindSortable: this.bindSortable.bind(this),
                withControlPanel: false,
                withSearchPanel: false,
                ...(viewProps || {})
            };
            if (this.action.id) {
                res.context.action = this.action.id;
            }
            return res;
        },
        getRandom: function () {
            return String(Math.random()).replace("0.", "PD");
        },
        setNodeId: function (node) {
            if (!node.tag) {
                return;
            }
            const nodeId = node.nodeId || (node.attrs || {})['node-id'] || "nodeId_" + this.getRandom();
            if (typeof node == 'object' && !node.attrs['no-node-id']) {
                node.nodeId = nodeId;
                node.attrs['node-id'] = nodeId; // use for find node (need delete when save)
            }
            this.nodes[nodeId] = node;
        },
        setNodeActive: function (node) {
            const el = this.$el.find("[node-id='" + node.nodeId + "']");
            this.setState({node: node, el: el});
            this.ref.viewProps.setNodeActive(node, el);
            this.$el.find("[node-id], .nodeActive").removeClass("nodeActive");
            el.addClass("nodeActive");
        },
        getNodeId: function (el) {
            var nodeId = [];
            if (el.length) {
                if (el.attr("node-id")) {
                    nodeId = [el.attr("node-id")];
                }
                if (!nodeId.length && el[0].tagName.toLowerCase() == "tr") {
                    el.find("> td > *[node-id]").map((idx, el) => {
                        const node_id = $(el).attr("node-id");
                        if (!nodeId.includes(node_id)) {
                            nodeId.push(node_id);
                        }
                    });
                }
            }
            return nodeId;
        },
        getHolderTemplate: function (type, tag) {
            const virtual = {
                field: "ViewStudio.View.CellVirtual", fieldNew: "ViewStudio.View.CellVirtual",
                component: {
                    group: "ViewStudio.View.GroupVirtual",
                    notebook: "ViewStudio.View.NotebookVirtual",
                    grid: "ViewStudio.View.GridVirtual"
                }
            };
            if (type == "component") {
                return virtual.component[tag];
            }
            return virtual[type];
        },
        checkPosition: function (event, ui) {
            const {item} = ui, {left, top} = item.offset(), itemWidth = item.width(), itemHeight = item.outerHeight(),
                pageX = event.pageX, pageY = event.pageY, itemPosition = item.position(), posLeft = itemPosition.left,
                posTop = itemPosition.top;
            var newLeft = posLeft + ((pageX - left) - itemWidth / 2),
                newTop = posTop + ((pageY - top) - itemHeight / 2);
            newTop -= this.$el.find(".viewView").scrollTop();
            item.attr({leftDiff: newLeft - posLeft, topDiff: (newTop - posTop)}).css({
                left: newLeft + "px",
                top: newTop + "px"
            });
        },
        resetPosition: function (ui) {
            const leftDiff = ui.item.attr("leftDiff"),
                topDiff = ui.item.attr("topDiff"), {left, top} = ui.item.position(), css = {};
            if (leftDiff) {
                const leftPos = (parseFloat(leftDiff) + left);
                css.left = leftPos + "px";
            }
            if (topDiff) {
                const topPos = (parseFloat(topDiff) + top);
                css.top = topPos + "px"
            }
            ui.item.css(css);
        },
        _changeNodeWhenChangeImg: function (node) {
        },
        onChangeImage: function (e) {
            e.stopPropagation();
            e.stopImmediatePropagation();
            const self = this, el = $(e.currentTarget).parent(), node = this.nodes[el.attr("node-id")];
            const MediaDialog = odoo.__DEBUG__.services['wysiwyg.widgets.MediaDialog'], $image = $('<img/>');
            const mediaDialog = new MediaDialog(this, {
                onlyImages: true,
            }, $image[0]);
            mediaDialog.open();
            mediaDialog.on('save', this, function (image) {
                node.children.map((child) => {
                    if (child.tag == "img") {
                        self._changeNodeWhenChangeImg(child);
                        child.attrs.src = $(image).attr("src");
                    }
                });
                self.onChangeProp(node).then(() => {
                    mediaDialog.destroy();
                });
            });
        },
        _copyNode: function (nodeId) {
            const node = $.extend(true, {}, this.nodes[nodeId]), resetNodeId = (nodes) => {
                nodes.map((child) => {
                    if (child.nodeId) {
                        delete child.nodeId;
                        delete child.attrs['node-id'];
                        this.setNodeId(child);
                    }
                    resetNodeId(child.children || []);
                });
            }
            resetNodeId([node]);
            return node;
        },
        onCopyNode: function (nodeId) {
            const node = this._copyNode(nodeId);
            this.onXpathNode(false, [nodeId], "before", {node: node});
            return this.reloadNode(node.parentId);
        },
        onClickNode: function (e) {
            var nodeId = e.nodeId;
            if (e.tag && (e.attrs || {})['no-node-id']) {
                nodeId = e.parentId;
            }
            if (!nodeId) {
                if (e.stopPropagation) {
                    e.stopPropagation();
                    e.stopImmediatePropagation();
                }
                const elNode = $(e.currentTarget);
                nodeId = elNode.attr("node-id");
            }
            if (nodeId && nodeId in this.nodes) {
                this.setNodeActive(this.nodes[nodeId]);
            }
        },
        onRemoveNode: function (nodeIds) {
            this.onXpathNode(nodeIds, false, "replace");
            this.setState({node: false, el: false});
            // this.ref.viewProps.setNodeActive(false, false);
            return this.renderView();
        },
        onXpathNode: function (idSelf, idXpath, position, props = {}) {
            this.viewHasChange = true;
            if (idXpath.length) {
                idXpath = idXpath[0];
            }
            const nodeXpath = this.nodes[idXpath], nodeSelf = idSelf.length ?
                idSelf.map((idS) => this.nodes[idS]) : (props.node ? [props.node] : [this.prepareNewNode(props)]);
            nodeSelf.map((node) => {
                if (node.parentId) {
                    const parentSelf = this.nodes[node.parentId], child = parentSelf.children,
                        idxSplice = child.findIndex((ch) => ch.nodeId == node.nodeId);
                    if (idxSplice >= 0) {
                        child.splice(idxSplice, 1);
                    }
                }
            });
            if (position == "replace") {
                return false;
            }
            if (nodeXpath) {
                if (["before", "after"].includes(position)) {
                    const {parentId} = nodeXpath, parentNode = this.nodes[parentId],
                        childIdx = parentNode.children.findIndex((ch) => ch.nodeId == idXpath);
                    parentNode.children.splice((position == "before" ? childIdx : childIdx + 1), 0, ...nodeSelf);
                } else if (position == "append") {
                    nodeXpath.children.push(...nodeSelf);
                }
            }
            return nodeSelf;
        },
        onChangeProp: function (node) {
            this.viewHasChange = true;
            return this.renderViewContent();
        },
        onStartSort: function (event, ui) {
        },
        onStopSort: function (event, ui) {
        },
        onChangeSort: function (event, ui) {
        },
        onBeforeStop: function (event, ui) {
        },
        onSort: function (event, ui) {
        },
        bindSortable: function (el) {
            const self = this, {selector, cancel, placeholder, tolerance} = this.sortParams;
            if (selector.length) {
                const sortParams = {
                    // containment: ".viewView",
                    tolerance: tolerance || "pointer",
                    sort: function (event, ui) {
                        self.onSort(event, ui);
                    },
                    start: function (event, ui) {
                        self.onStartSort(event, ui);
                    },
                    stop: function (event, ui) {
                        self.onStopSort(event, ui);
                    },
                    change: function (event, ui) {
                        event.stopPropagation();
                        event.stopImmediatePropagation();
                        self.onChangeSort(event, ui);
                    },
                    beforeStop: function (event, ui) {
                        self.onBeforeStop(event, ui);
                    }
                };
                if (placeholder) {
                    sortParams.placeholder = placeholder;
                }
                if (cancel) {
                    sortParams.cancel = cancel;
                }
                selector.map((data) => {
                    el.find(data[0]).sortable({
                        connectWith: data[1],
                        ...sortParams
                    }).disableSelection();
                });
            }
        },
        bindAction: function () {
            this._super();
            this.$el.find(".editImage").click(this.onChangeImage.bind(this));
            this.$el.find("[node-id]").click(this.onClickNode.bind(this));
            this.bindSortable(this.$el);
        },
        bindStyle: function () {
            const {node} = this.state;
            this._super();
            if (node && node.nodeId) {
                // this.$el.find("[node-id='"+node.nodeId+"']").addClass("active");
                // this.$el.find("[node-id], .nodeActive").removeClass("nodeActive");
                this.$el.find("[node-id='" + node.nodeId + "']").addClass("nodeActive");
            }
        },
        reloadNode: function (nodeReload) {
            this.viewHasChange = true;
        },
        renderSubView: function (widget) {
        },
        renderViewProps: function () {
            const _viewProps = this.ref.viewProps, params = this.preparePropsParams();
            if (_viewProps) {
                params.tab = _viewProps.state.tab;
            }
            const viewProps = new this.viewConfig.prop(this, params);
            this.ref.viewProps = viewProps;
            this.ref.viewProps.renderElement();
            this.$el.find('.viewProps').empty().append(this.ref.viewProps.$el);
        },
        renderViewSimple: async function () {
            const {viewInfo} = this.props;
            var viewView = new this.viewConfig.view(viewInfo, this.prepareViewParams());
            await viewView.appendTo(this.$el.find(".viewView").empty());
            this.resetNode();
            this.bindAction();
            this.bindStyle();
            this.ref.widget = viewView;
        },
        renderViewContent: async function () {
            if (this.viewConfig.view.isSimple) {
                return this.renderViewSimple();
            }
            const {viewInfo} = this.props, {context} = this.action, {model, fields, type} = viewInfo;
            const props = {
                resModel: model,
                type: type,
                context: context,
                arch: utils["json_node_to_xml"](viewInfo.arch),
                fields: fields,
                loadActionMenus: false,
                display: {
                    controlPanel: false,
                }
            }
            const info = {
                Component: View,
                componentProps: props
            }, env = odoo['rootStudio'].env;
            if (this.isLegacy) {
                info.View = info.Component = this.viewConfig.view;
                info.viewInfo = viewInfo;
                info.componentProps = Object.assign(info.componentProps, this.prepareViewParams());
            }
            const viewContainer = await mount(ViewContainer, {
                env: Object.assign(Object.create(env), {config: {}}),
                props: {info: info, isLegacy: this.isLegacy || false},
                target: this.$el.find(".viewView").empty()[0],
                position: "first-child"
            });
            this.resetNode();
            this.bindAction();
            this.bindStyle();
            this.ref.container = viewContainer;
            const {component} = viewContainer.__owl__.refs;
            this.ref.widget = this.isLegacy ? component.widget : component;
        },
        renderView: function () {
            this.renderViewProps();
            this.renderViewContent();
        },
    });


    return {ViewProps: ViewProps, ViewContent: ViewContent};
});
