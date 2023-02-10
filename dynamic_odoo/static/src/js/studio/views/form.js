odoo.define('dynamic_odoo.form', function (require) {
    "use strict";

    var core = require('web.core');
    var Domain = require('web.Domain');
    var QWeb = core.qweb;
    var FormView = require('web.FormView');
    var FormRenderer = require('web.FormRenderer');
    var FormController = require('web.FormController');
    var BasicModel = require('web.BasicModel');
    var basic_fields = require('dynamic_odoo.basic_fields');
    var baseEdit = require('dynamic_odoo.views_edit_base');
    var basic_widgets = require('dynamic_odoo.basic_widgets');
    var Dialog = require("web.Dialog");

    var QWeb = core.qweb;
    var _t = core._t;


    var FormEditRenderer = FormRenderer.extend({
        init: function (parent, state, params) {
            this._super(parent, state, params);
            this.props = params;
            this.ref = {nodes: {}, approval: {}};
            const {setNodeId, arch, nodes} = this.props;
            if (setNodeId) {
                setNodeId(arch);
            }
            this.nodes = nodes;
            this.setRenderVisible();
        },
        setNodeId: function (node) {
            const {setNodeId} = this.props;
            if (setNodeId) {
                setNodeId(node);
            }
        },
        setParentForChild: function (node) {
            if (node.children && node.children.length) {
                node.children.map((child) => {
                    if (child.tag) {
                        child.parentId = node.nodeId;
                    }
                });
            }
        },
        setRenderVisible: function () {
            const {arch} = this.props;
            this.renderInvisible = ["1", true].includes(arch.attrs.show_invisible);
        },
        getRandom: function () {
            return String(Math.random()).replace("0.", "PD");
        },
        _addOnClickAction: function () {
        },
        _postProcessField: function (widget, node) {
            const {fieldsInfo, viewType} = this.state, {name} = node.attrs,
                fieldInfo = fieldsInfo[viewType][name];
            widget._canQuickEdit = false;
            this.setNodeId(node);
            this._super(widget, node);
            if (widget.$el.parents(".o_inner_group").length && widget.$el.hasClass("o_invisible_modifier")) {
                widget.$el.parents("tr").addClass("_rowInvisible");
            }
            if (fieldInfo.views && Object.keys(fieldInfo.views).length) {
                widget.$el.append(this._renderWrapEditO2m(fieldInfo));
            }
            widget.$el.addClass("_olEdit").attr({'node-id': node.nodeId}).removeAttr("href");
            widget._onClick = () => {
            };
        },
        _renderChild: function (children, wrap) {
            children.map((child) => {
                wrap.append(this._renderNode(child));
            });
        },
        onNewPage: function (nodeNotebook) {
            const {newNodes, prBindAction, setNodeActive} = this.props, newPage = newNodes.newPage();
            this.setNodeId(newPage);
            newPage.parentId = nodeNotebook.nodeId;
            newPage.attrs.name = "page_" + this.getRandom();
            nodeNotebook.children.push(newPage);
            const noteNTBook = this.ref.nodes[nodeNotebook.nodeId];
            if (noteNTBook) {
                noteNTBook.state.value = newPage.attrs.name;
            }
            this.reloadNode(newPage.nodeId).then(() => {
                setNodeActive(newPage);
            }).then(() => {
                prBindAction();
            });
        },
        _renderPage: function (page) {
            const res = this._renderNode(page), {prBindAction, setNodeActive} = this.props;
            if (this.defs) {
                const refNoteBook = this.ref.nodes[page.parentId];
                Promise.all(this.defs).then(() => {
                    if (refNoteBook && !refNoteBook.isFirst) {
                        setNodeActive(page);
                    }
                }).then(() => {
                    prBindAction();
                });
            }
            return res;
        },
        _renderTagNotebook: function (node) {
            this.setNodeId(node);
            const self = this, {prBindAction} = this.props, tabs = {}, oldRef = this.ref.nodes[node.nodeId];
            const showInvisible = self.arch.attrs.show_invisible == "1";
            node.children.map((page) => {
                const {string} = page.attrs, name = page.attrs.name || "page_" + this.getRandom();
                let modifiers = self._registerModifiers(page, this.state);
                if (showInvisible || !modifiers.invisible) {
                    self.setNodeId(page);
                    page.parentId = node.nodeId;
                    page.attrs.name = name;
                    tabs[name] = {
                        label: string,
                        name: name,
                        classes: modifiers.invisible ? "page_invisible" : "",
                        render: () => this._renderPage.bind(this)(page),
                        nodeId: page.nodeId
                    };
                }
            });
            tabs.add = {icon: "plus", name: "add", render: () => this.onNewPage(node)};
            const wrapNode = new basic_widgets.Tab(this, {
                tabs: tabs, node: node,
                onRender: prBindAction,
                value: oldRef ? oldRef.state.value : Object.keys(tabs)[0]
            });
            wrapNode.renderElement();
            this.ref.nodes[node.nodeId] = wrapNode;
            return wrapNode.$el;
        },
        _renderTagPage: function (node) {
            const wrapNode = $(QWeb.render("Form.TagPage", {}));
            this._renderChild(node.children, wrapNode);
            this._handleAttributes(wrapNode, node);
            this._registerModifiers(node, this.state, wrapNode);
            return wrapNode;
        },
        reloadNode: function (nodeId) {
            var {prBindAction} = this.props, node = this.nodes[nodeId], parentId = node.parentId;
            this.setRenderVisible();
            if (node.tag == "form") {
                return this._renderView();
            }
            this.defs = [];
            if (parentId in this.nodes) {
                var parentNode = this.nodes[parentId];
                switch (parentNode.tag) {
                    case "group":
                        var stopCheck = false;
                        nodeId = parentId, node = parentNode;
                        if (parentNode.parentId) {
                            while (!stopCheck) {
                                const _parentNode = this.nodes[parentNode.parentId];
                                if (_parentNode.tag !== 'group' || !_parentNode.parentId) {
                                    nodeId = parentNode.nodeId;
                                    node = parentNode;
                                    stopCheck = true;
                                } else if (_parentNode.tag == 'group' || _parentNode.parentId) {
                                    parentNode = _parentNode;
                                }
                            }
                        }
                        break;
                    case "notebook":
                        nodeId = parentId;
                        node = parentNode;
                        break;
                }
            }
            this.allModifiersData = [];
            this.$el.find("[node-id='" + nodeId + "']").replaceWith(this._renderNode(node));

            return Promise.all(this.defs || []).then(() => {
                prBindAction();
            });
        },
        _renderWrapEditO2m: function (fieldInfo) {
            return QWeb.render("Edit.wrapAb", {
                name: fieldInfo.name, views: [{type: "list", label: "Edit List"}, {type: "form", label: "Edit Form"}]
            });
        },
        _renderOuterGroup: function (node) {
            let res = this._super(node);
            node.children.map((child) => {
                child.parentId = node.nodeId;
            });
            return res;
        },
        _renderInnerGroup: function (node) {
            let res = this._super(node), children = node.children;
            children.map((child) => {
                if (child.tag) {
                    child.parentId = node.nodeId;
                }
            });
            res.find("tr").map((i, tr) => {
                if (!$(tr).find("td:not(:empty)").length || !$(tr).find("td").filter((i, td) => $(td).find("> *:not(.o_invisible_modifier)").length).length) {
                    $(tr).addClass("_rowInvisible");
                }
            });
            return res;
        },
        _renderHeaderButton: function (node) {
            let res = this._super(node);
            this.setNodeId(node);
            res.addClass("_olEdit").attr({"node-id": node.nodeId});
            return res;
        },
        _renderStatButton: function (node) {
            const res = this._super(node);
            this.setNodeId(node);
            res.attr({"node-id": node.nodeId});
            this.setParentForChild(node);
            const checkFieldBox = (_node) => _node.children.map((_n) => {
                if (_n.tag == "field") {
                    _n.inBox = true;
                }
                if (_n.children) {
                    checkFieldBox(_n);
                }
            });
            checkFieldBox(node)
            _.map(node.children, {})
            return res;
        },
        _renderButtonBox: function (node) {
            const res = this._super(node);
            res.prepend(QWeb.render("Form.AddButtonBox", {}));
            return res;
        },
        _renderInnerGroupLabel: function (node) {
            let res = this._super(node);
            this.setNodeId(node);
            res.find(" > *").attr({"node-id": node.nodeId});
            return res;
        },
        _renderTagLabel: function (node) {
            let res = this._super(node);
            if (node.tag == 'label') {
                res.addClass("_olEdit");
            }
            return res;
        },
        _renderFieldWidget: function (node, state) {
            if (typeof this.defs == "undefined") {
                this.defs = [];
            }
            return this._super(node, state);
        },
        _renderGenericTag: function (node) {
            const res = this._super(node);
            res.removeAttr("href");
            return res;
        },
        _renderNode: function (node) {
            this.setNodeId(node);
            let res = this._super(node);
            if (node.nodeId) {
                res.attr({'node-id': node.nodeId});
            }
            this.setParentForChild(node);
            return res;
        },
        _updateView: function ($newContent) {
            const formNodeId = $newContent.parents(".o_form_view").attr("node-id");
            if (formNodeId) {
                const showInvisible = this.arch.attrs.show_invisible;
                this.$el.attr({"node-id": formNodeId})[showInvisible == "1" ? "addClass" : "removeClass"]("showInvisible");
            }
            this._super($newContent);
        },
    });

    var FormEditController = FormController.extend({
        init: function (parent, model, renderer, params) {
            this._super(parent, model, renderer, params);
            this.ref = {view: params.view};
        },
        _pushState: function () {
        },
    });

    var FormEditModel = BasicModel.extend({
        _applyDefaultValues: function (field, data) {
            var value = null;
            if (["float", "integer", "monetary"].includes(field.type)) {
                value = 0;
            } else if (["many2many", "one2many"].includes(field.type)) {
                value = [];
            } else if (["date", "datetime".includes(field.type)]) {
                value = false;
            }
            data[field.name] = value;
        },
        _onChangWithoutNewField: function (dataCheck) {
            const newFields = this.getParent().newFields || {};
            let fnCheck = (fieldName) => delete dataCheck[fieldName];
            if (Array.isArray(dataCheck)) {
                fnCheck = (fieldName) => {
                    const index = dataCheck.findIndex((fName) => fName == fieldName);
                    if (index >= 0) {
                        dataCheck.splice(index, 1);
                    }
                }
            }
            Object.keys(newFields).map((nodeId) => {
                fnCheck(newFields[nodeId].attrs.name)
            });
        },
        _fetchRecord: async function (record, options) {
            const res = await this._super(record, options), newFields = this.getParent().newFields || {};
            Object.keys(newFields).map((nodeId) => {
                this._applyDefaultValues(newFields[nodeId].attrs, record.data)
            });
            return res;
        },
        _performOnChange: function (record, fields, viewType) {
            this._onChangWithoutNewField(fields);
            return this._super(record, fields, viewType);
        },
        _buildOnchangeSpecs: function (record, viewType) {
            const res = this._super(record, viewType);
            this._onChangWithoutNewField(res);
            return res;
        },
        _generateOnChangeData: function (record, options) {
            const res = this._super(record, options);
            this._onChangWithoutNewField(res);
            return res;
        }
    });

    var FormEditView = FormView.extend({
        config: _.extend({}, FormView.prototype.config, {
            Renderer: FormEditRenderer,
            Controller: FormEditController,
            Model: FormEditModel,
        }),
        init: function (viewInfo, params) {
            this._super(viewInfo, params);
            const {newNodes, setNodeId, bindAction, setNodeActive, nodes, action} = params;
            this.rendererParams.setNodeId = setNodeId;
            this.rendererParams.newNodes = newNodes;
            this.rendererParams.setNodeActive = setNodeActive;
            this.rendererParams.prBindAction = bindAction;
            this.rendererParams.nodes = nodes;
            this.controllerParams.view = this;
        },
    });

    var FormProps = baseEdit.ViewProps.extend({
        init: function (parent, props) {
            this._super(parent, props);
            const {fields, model} = this.props.viewInfo;
            this.nodeProps.string.prepareProps = this.prepareStringProps.bind(this);
            this.nodeProps.nolabel = {
                name: 'nolabel',
                valType: "boolean",
                label: 'Hide String',
                widget: basic_fields.ToggleSwitch
            };
            this.nodeProps.can_create = {
                name: 'can_create',
                valType: "boolean",
                label: 'Can Create',
                prepareProps: (node, nodeProps) => {
                    this.prepareCanEditCreateProps(node, nodeProps, "no_create")
                },
                propChange: (node, prop, value) => {
                    this.onChangeCanEditCreate(node, prop, value, "no_create");
                },
                widget: basic_fields.Radio
            };
            this.nodeProps.can_write = {
                name: 'can_write',
                valType: "boolean",
                prepareProps: (node, nodeProps) => {
                    this.prepareCanEditCreateProps(node, nodeProps, "no_open");
                },
                propChange: (node, prop, value) => {
                    this.onChangeCanEditCreate(node, prop, value, "no_open");
                },
                label: 'Can Write',
                widget: basic_fields.Radio
            };
            this.nodeProps.help = {name: 'help', valType: "string", label: 'Help', widget: basic_fields.Input};
            this.nodeProps.context = {name: 'context', valType: "string", label: 'Context', widget: basic_fields.Input};
            this.nodeProps.placeholder = {
                name: 'placeholder',
                valType: "string",
                label: 'Placeholder',
                widget: basic_fields.Input
            };
            this.nodeProps.selection = {
                name: 'selection',
                valType: "string",
                label: 'Selection',
                widget: basic_widgets.OptionsEdit
            };
            this.nodeProps.relation = {
                name: 'relation', valType: "string", label: 'Relation', widget: basic_fields.Relation,
                props: {model: "ir.model.fields", relation: "ir.model"}
            };
            this.nodeProps.domain = {
                name: 'domain',
                valType: "string",
                label: 'Domain',
                widget: basic_widgets.ButtonDomain,
                props: {kind: "input"}
            };
            this.nodeProps.relation_field = {
                name: 'relation_field',
                valType: "string",
                label: 'Relation Field',
                widget: basic_fields.Input
            };
            this.nodeProps.col = {name: 'col', valType: "string", label: 'Col Group', widget: basic_fields.Input};
            this.nodeProps.columns = {name: 'columns', valType: "string", label: 'Columns', widget: basic_fields.Input};
            this.nodeProps.colspan = {name: 'colspan', valType: "string", label: 'Colspan', widget: basic_fields.Input};
            // this.nodeProps.style = {name: "style", valType: "string", label: "Style", widget: basic_widgets.Button, icon: "css3"}
            // this.nodeProps.text = {name: "text", valType: "string", label: "Style", widget: basic_widgets.ButtonDomain, icon: "trash"}
            // this.nodeProps.style = {name: "style", valType: "string", label: "Style", widget: basic_widgets.CssWidget, prepareProps: this.prepareStyleProps.bind(this)};
            // this.nodeProps.href = {name: "href", valType: "string", label: "Link", placeholder: "https://",widget: basic_fields.Input};
            this.nodeProps.use_label = {
                name: "use_label",
                valType: "boolean",
                label: "Use Label",
                prepareProps: this.prepareUseLabel.bind(this),
                propChange: this.onChangeUseLabel.bind(this),
                widget: basic_fields.ToggleSwitch
            };
            // this.nodeProps.text = {name: "text", valType: "string", label: "Text", propChange: this.onChangeText.bind(this), widget: basic_fields.TextArea};
            this.nodeProps.choose_field.propChange = this.onChangeChooseField.bind(this);
            this.nodeProps.invisible_view_mode = {
                name: 'invisible_view_mode', valType: "boolean", label: 'Invisible in View Mode',
                propChange: this.onChangeIViewMode.bind(this), widget: basic_fields.ToggleSwitch
            };
            this.nodeProps.choose_icon = {
                name: 'choose_icon',
                valType: "string",
                label: "Icons",
                propChange: this.chooseIcons.bind(this),
                widget: basic_widgets.ChooseIcon
            };
            this.nodeProps.choose_stat_field = {
                name: "choose_stat_field",
                valType: "string",
                label: "Choose Field",
                propChange: this.onChangeStatField.bind(this),
                widget: basic_fields.FieldMany2one,
                props: {
                    model: "no",
                    relation: "ir.model.fields",
                    domain: [['ttype', '=', 'many2one'], ['relation', '=', model]]
                }
            };
            this.nodeProps.button_approval = {
                name: "button_approval", valType: "boolean", label: "Set Approval",
                propChange: this.onChangeButtonProp.bind(this), widget: basic_fields.ToggleSwitch
            };
            this.nodeProps.button_action = {
                name: "button_action", valType: "number", propChange: this.onChangeButtonAction.bind(this),
                label: "Button Action", widget: basic_widgets.ActionStudio, no_xml: true, props: {modelName: model}
            }
            this.nodeProps.active_confirm = {
                name: "active_confirm",
                prepareProps: this.prepareActiveConfirm.bind(this),
                valType: "boolean",
                label: "Active Confirm",
                propChange: this.onChangeButtonProp.bind(this),
                widget: basic_fields.ToggleSwitch
            };
            this.nodeProps.confirm = {
                name: "confirm",
                valType: "string",
                label: "Text Confirm",
                popup: true,
                widget: basic_widgets.TextWidget
            };
            this.nodeProps.approval_groups = Object.assign({}, this.nodeProps.groups, {
                name: "approval_groups",
                label: "Approval Groups", no_xml: true, valType: "list", propChange: this.changePropDetails.bind(this)
            });
            this.nodeProps.more.prepareProps = (node, nodeProps) => {
                if (node.attrs._new) {
                    nodeProps.noEdit = true;
                }
            }
            this.viewPropsView = ["create", "edit", "delete", "show_invisible"];
            this.nodeViews.form = {view: this.viewPropsView};
            this.nodeViews.field = {view: (node) => this.prepareFieldView(node)};
            this.nodeViews.label = {view: (node) => this.prepareLabelView(node)};
            this.nodeViews.button = {view: (node) => this.prepareButtonView(node)};
            this.nodeViews.group = {view: (node) => this.prepareGroupView(node)};
            this.nodeViews.page = {view: ["invisible", "string", "groups", "more"]};
            this.nodeViews.notebook = {view: ["more"]};
            // this.nodeViews.img = {view: ["invisible", "style"]};
            // this.nodeViews.div = {view: (node) => this.prepareDivView(node)};
            // this.nodeViews.span = {view: ["invisible", "text", "style"]};
            // this.nodeViews.p = {view: ["invisible", "text", "style"]};
            // this.nodeViews.a = {view: ["invisible", "href", "text", "style"]};
        },
        initParams: function () {
            this._super();
            this.tabs.fields = {
                label: "Fields",
                render: this.renderFieldsExist.bind(this),
                name: "fields",
                icon: "foursquare"
            };
            this.tabs.components = {
                label: "Components",
                render: this._renderTabComponent.bind(this),
                name: "components",
                icon: "tags"
            };

            this.components = {
                component: {label: "Tags", class: "_wComTag", type: "component"},
                fields: {label: "Fields", class: "_wComField", type: "fieldNew"}
            };
            this.components.component.child = {
                title: {name: "title", label: "Title", icon: "gg"},
                text: {name: "text", label: "Text", icon: "font"},
                image: {name: "image", label: "Image", icon: "image"},
                button: {name: "button", label: "Button", icon: "gg"},
                grid: {name: "grid", label: "Grid", icon: "th-large"},
                group: {name: "group", label: "Group", icon: "object-group"},
                notebook: {name: "notebook", label: "Notebook", icon: "leanpub"}
            };
            this.components.fields.child = {
                datetime: {name: "datetime", label: "Datetime", icon: "clock-o"},
                date: {name: "date", label: "Date", icon: "calendar"},
                char: {name: "char", label: "Char", icon: "font"},
                text: {name: "text", label: "Text", icon: "arrows-alt"},
                many2one: {name: "many2one", label: "Many2one", icon: "envira"},
                one2many: {name: "one2many", label: "One2many", icon: "bars"},
                many2many: {name: "many2many", label: "Many2many", icon: "pagelines"},
                integer: {name: "integer", label: "Integer", icon: "yelp"},
                monetary: {
                    name: "monetary",
                    label: "Monetary",
                    icon: "modx",
                    props: {type: "float", widget: "monetary"}
                },
                float: {name: "float", label: "Float", icon: "fire"},
                binary: {name: "binary", label: "Binary", icon: "file"},
                selection: {name: "selection", label: "Selection", icon: "file"},
                boolean: {name: "boolean", label: "Boolean", icon: "check-square"},
                html: {name: "html", label: "Html", icon: "code"},
            };
        },
        prepareLabelView: function (node) {
            const view = ["invisible", "string", "style", "more"];
            return view;
        },
        prepareGroupView: function (node) {
            const {nodes} = this.props, parentNode = nodes[node.parentId];
            var view = ["invisible", "string", "groups"], colView = {view: ["col", "colspan"], classes: "groupCol"};
            if (node.children.filter((child) => child.tag == "group").length || (parentNode && parentNode.tag != "group")) {
                colView.view.push("columns");
            }
            view.push(colView);
            view.push("more");
            return view;
        },
        prepareButtonView: function (node) {
            const view = ["invisible", "string", "choose_icon", "groups", "style", "more"];
            if ((node.attrs.class || "").includes("oe_stat_button")) {
                node.attrs.needField ? view.splice(2, 0, "choose_stat_field") : view.splice(1, 1);
            } else {
                view.splice(1, 0, ...["button_approval", "active_confirm"]);
                if (node.attrs.button_approval) {
                    view.splice(3, 0, "approval_groups");
                }
                if (node.attrs.confirm) {
                    view.splice(2, 1);
                    view.splice(2, 0, {view: ["active_confirm", "confirm"], classes: "grConfirm"});
                }
                if (node.attrs.need_action) {
                    view.splice(3, 0, "button_action");
                }
            }
            return view;
        },
        prepareFieldView: function (node) {
            const {fields, viewFields} = this.props.viewInfo, {name, _new} = node.attrs,
                field = fields[name] || viewFields[name], fieldType = field.type;
            const fieldViewStore = {
                    char: ["required", "invisible", "readonly", "string", "widget", "groups", "help", "placeholder", "context"],
                    date: ["required", "invisible", "readonly", "string", "widget", "groups", "help", "context"],
                    datetime: ["required", "invisible", "readonly", "string", "widget", "groups", "help", "context"],
                    selection: ["required", "invisible", "readonly", "string", "selection", "widget", "groups", "help", "context"],
                    boolean: ["required", "invisible", "readonly", "string", "widget", "groups", "help", "context"],
                    binary: ["required", "invisible", "readonly", "string", "widget", "groups", "help", "context"],
                    many2one: ["required", "invisible", "readonly", "string", "domain", "widget", "groups", {
                        view: ["can_create", "can_write"],
                        classes: "m2o_group"
                    }, "help", "context"],
                    one2many: ["required", "invisible", "readonly", "string", "widget", "groups", "help", "context"],
                    many2many: ["required", "invisible", "readonly", "string", "domain", "widget", "groups", "help", "context"],
                },
                view = fieldViewStore[fieldType] || ["required", "invisible", "readonly", "string", "widget", "groups", "help", "placeholder", "context"];
            if (_new) {
                switch (fieldType) {
                    case "many2one":
                        view.splice(4, 0, ...["relation"]);
                        break;
                    case "one2many":
                        view.splice(4, 0, ...["relation", "relation_field"]);
                        break;
                    case "many2many":
                        view.splice(4, 0, ...["relation"]);
                        break;
                }
            }
            view.push("more");
            if (!node.inBox) {
                view.splice(3, 0, ...["use_label", "nolabel"]);
            }
            return view;
        },
        prepareParamsProp: function (node, propsView) {
            const propProps = this._super(node, propsView), {findNode} = this.props;
            if (propsView.includes("use_label") && node.attrs.use_label && findNode("label[for='" + node.attrs.name + "']")) {
                // with field base use label, we will don't support use_label attr
                propProps.use_label.readonly = true;
            }
            if (node.attrs.component == "title") {
                const findName = (nodes, tag, fn) => nodes.map((child) => {
                    if (child.tag == tag) {
                        fn(child);
                    }
                    findName(child.children || [], tag, fn);
                });
                if (propsView.includes("choose_field")) {
                    findName(node.children, "field", (node) => propProps.choose_field.value = node.attrs.name);
                }
                if (propsView.includes("invisible_view_mode")) {
                    findName(node.children, "label", (node) => propProps.invisible_view_mode.value = (node.attrs.class || "").includes("oe_edit_only"));
                }
            }
            return propProps;
        },
        prepareUseLabel: function (node, nodeProps) {
            if (this.preparePropVal({valType: "boolean"}, node.attrs.nolabel)) {
                nodeProps.value = true;
            }
        },
        prepareActiveConfirm: function (node, nodeProps) {
            nodeProps.value = node.attrs.confirm ? true : false;
        },
        prepareStringProps: function (node, nodeProps) {
            if (node.tag == "label" && node.attrs.for) {
                const fieldName = node.attrs.for, {fields} = this.props.viewInfo, field = fields[fieldName];
                if (field) {
                    nodeProps.value = nodeProps.value || field.string;
                }
            }
        },
        chooseIcons: function (node, prop, value) {
            if (node.tag == "button") {
                node.attrs.icon = "fa-" + value;
            }
        },
        changePropDetails: function (node, prop, value) {
            var {setButtonData} = this.props, type = "approval";
            if (prop.name == "confirm") {
                type = "confirm";
            }
            setButtonData(node.attrs.button_id, JSON.parse(value), type);
            node.attrs[prop.name] = value;
        },
        prepareCanEditCreateProps: function (node, nodeProps, propName) {
            const fieldsInfo = this.props.viewInfo.fieldsInfo.form, fieldInfo = fieldsInfo[node.attrs.name];
            if (fieldInfo) {
                const options = fieldInfo.options || {};
                nodeProps.value = !options[propName];
            }
        },
        onChangeCanEditCreate: function (node, prop, value, propName) {
            value = this.preparePropVal(prop, value);
            const fieldsInfo = this.props.viewInfo.fieldsInfo.form, fieldInfo = fieldsInfo[node.attrs.name];
            if (fieldInfo) {
                const options = fieldInfo.options || {};
                options[propName] = !value;
                node.attrs.options = JSON.stringify(options);
            }
        },
        onChangeButtonAction: function (node, prop, value) {
            node.attrs.button_action = value;
        },
        onChangeButtonProp: function (node, prop, value) {
            if (!node.attrs.button_id) {
                node.attrs.button_id = ("BT_ID" + Math.random()).replace(".", "");
            }
            node.reloadProps = true;
            const val = this.preparePropVal(prop, value);
            if (["active_confirm"].includes(prop.name)) {
                val ? (node.attrs.confirm = "Text Confirm") : (delete node.attrs.confirm)
            } else {
                val ? (node.attrs[prop.name] = value) : (delete node.attrs[prop.name]);
            }
        },
        onChangeStatField: function (node, prop, value) {
            const {prepareNewNode} = this.props, {name, model} = value,
                fieldName = "x_" + name + "_" + model.replaceAll(".", "_") + "_count_" + (new moment()).second(),
                newNode = prepareNewNode({
                    tag: "field",
                    type: "integer",
                    props: {name: fieldName, string: node.attrs.string, widget: "statinfo", _new: true}
                });
            newNode.model = model;
            newNode._compute = true;
            newNode.field_relation = name;
            newNode.field_name = fieldName;
            newNode.action_name = "act_" + fieldName;
            node.attrs.name = newNode.action_name;
            node.children = [newNode];
            node._new = true;
            node.reloadProps = true;
            delete node.attrs.string;
            delete node.attrs.needField;
        },
        onChangeIViewMode: function (node, prop, value) {
            const loopNode = (nodes) => nodes.map((child) => {
                if (child.tag == "label") {
                    Boolean(eval(value)) ? (child.attrs.class = "oe_edit_only") : (delete child.attrs.class);
                }
                loopNode(child.children || []);
            });
            loopNode(node.children);
        },
        onChangeChooseField: function (node, prop, value) {
            const {fields} = this.props.viewInfo;
            const loopNode = (nodes) => nodes.map((child) => {
                if (child.tag == "label" && child.attrs.for) {
                    child.attrs.for = value;
                    child.attrs.string = fields[value].string || "Field Title";
                }
                if (child.tag == "field") {
                    child.attrs.name = value;
                }
                loopNode(child.children || []);
            });
            loopNode(node.children);
        },
        onChangeUseLabel: function (node, prop, value) {
            const {onXpathNode, findNode} = this.props;
            delete node.attrs.nolabel;
            delete node.attrs.use_label;
            if (Boolean(eval(value))) {
                node.attrs.nolabel = "1";
                node.attrs.use_label = "1";
                onXpathNode(false, [node.nodeId], "before", {
                    node: this.nodeStore.newNode({
                        tag: "label",
                        props: {for: node.attrs.name}
                    })
                });
            } else {
                onXpathNode([findNode("label[for='" + node.attrs.name + "']").nodeId], false, "replace", {});
            }
            this.reloadNodeProps();
        },
        onChangeProp: function (node, prop, value) {
            const {onChangeCol, viewInfo} = this.props, {viewFields, fieldsInfo} = viewInfo;
            if (node.tag == "group" && prop.name == "columns" && onChangeCol) {
                return onChangeCol(node, value);
            } else if (node.tag == "field" && node.attrs._new) {
                const field = viewFields[node.attrs.name], fieldInfo = fieldsInfo.form[node.attrs.name],
                    {type} = field, propName = prop.name;
                if (["many2one", "many2many"].includes(type) && propName == "relation") {
                    field.relation = value;
                    if (type == "many2many") {
                        fieldInfo.mode = "list";
                    }
                    delete node.attrs.widget;
                } else if (["one2many"].includes(type) && ["relation", "relation_field"].includes(propName)) {
                    field[propName] = value;
                    if ("relation" in field && "relation_field" in field) {
                        node.attrs.widget = "one2many";
                        fieldInfo.mode = "list";
                    }
                } else if (type == "selection" && propName == "selection") {
                    const options = JSON.parse(value);
                    field.selection = options;
                    node.attrs.widget = "selection";
                }
            }
            this._super(node, prop, value);
        },
        onChangeTab: function (tabName) {
            this._super(tabName);
            const {bindSortable} = this.props;
            bindSortable(this.ref.tab.$el.find(".wTabCon"));
        },
        _renderTabComponent: function () {
            const wConComponent = $(QWeb.render("ViewStudio.View.TabComponent", {}));
            wConComponent.find('._wComCon').append(Object.keys(this.components).map((comName) => {
                    let com = Object.assign({}, this.components[comName]);
                    return QWeb.render("ViewStudio.View.TabComponent.Com", com)
                }
            ));
            return wConComponent;
        },
    });

    var FormEditContent = baseEdit.ViewContent.extend({
        template: 'ViewStudio.View.Form',
        isLegacy: true,
        // assetLibs: ['web_editor.compiled_assets_wysiwyg'],
        init: function (parent, params) {
            this._super(parent, params);
            this.viewConfig.prop = FormProps;
            this.viewConfig.view = FormEditView;
            this.sortParams.selector = [
                ["._wComField ._wSortable, .wFields, .o_inner_group > tbody", ".o_inner_group > tbody"],
                ["._wComTag ._wSortable[name='grid'], ._wComTag ._wSortable[name='group'], " +
                "._wComTag ._wSortable[name='notebook'], .o_form_sheet, .o_form_nosheet, ._wPage",
                    ".o_form_sheet, .o_form_nosheet, ._wPage"],
                ["._wComTag ._wSortable[name='image'], ._wComTag ._wSortable[name='text'], " +
                ".wGrid > .row > div[class*=col]", ".wGrid > .row > div[class*=col]"],
                ["._wComTag ._wSortable[name='title'], .wGrid > .row > div[class*=col], .o_form_sheet, .o_form_nosheet",
                    "._wPage, .wGrid > .row > div[class*=col]"],
                ["._wComField ._wSortable[name='selection'], .o_form_statusbar, .wFields, .o_inner_group > tbody",
                    ".o_inner_group > tbody, .o_form_statusbar"],
                ["._wComTag ._wSortable[name='button'], .o_statusbar_buttons", ".o_statusbar_buttons"]
                // ["._wComTag ._wSortable[name='group'], ._wComTag ._wSortable[name='notebook'], " +
                // ".o_form_sheet, .o_form_nosheet, ._wPage",".o_form_sheet, .o_form_nosheet, ._wPage"],
            ];
            this.checkField = {};
            this.checkField.many2one = [{
                stop: (node) => !node.attrs.relation,
                warning: _t("Please fill 'Relation' params before save!")
            }];
            this.checkField.many2many = [this.checkField.many2one[0]];
            this.checkField.one2many = [this.checkField.many2one[0], {
                stop: (node) => !node.attrs.relation_field,
                warning: _t("Please fill 'Relation Field' params before save!")
            }];
            this.checkField.selection = [{
                stop: (node) => !node.attrs.selection,
                warning: _t("Please fill 'Options' params before save!")
            }];
            this.resetAttr();
        },
        resetAttr: function () {
            this.newFields = {};
            this.buttonData = {approval: {}, confirm: {}};
        },
        _changeStateData: function (fieldName, fieldInfo) {
            const {model, handle, renderer, viewType} = this.ref.widget, state = model.localData[handle],
                fieldsInfo = state.fieldsInfo[viewType];
            if (state) {
                state.fields[fieldName] = fieldInfo;
                if (!(fieldName in fieldsInfo)) {
                    const {viewInfo} = this.props;
                    fieldsInfo[fieldName] = viewInfo.fieldsInfo[viewType][fieldName];
                }
                model._applyDefaultValues({...fieldInfo, name: fieldName}, renderer.state.data);
            }
        },
        prepareNewNode: function (props) {
            const {viewInfo} = this.props, {type} = props, node = this._super(props);
            if (node.attrs.component == "title") {
                this.ref.widget.ref.view._processArch(node, viewInfo);
            }
            if (props.props._new) {
                const fieldInfo = {string: "New Field", type: type, ...(props.props || {})},
                    fieldName = node.attrs.name;
                viewInfo.viewFields[fieldName] = fieldInfo;
                viewInfo.fields[fieldName] = fieldInfo;
                node.attrs.string = fieldInfo.string;
                this.ref.widget.ref.view._processNode(node, viewInfo);
                this._changeStateData(fieldName, fieldInfo);
                this.newFields[node.nodeId] = node;
                return node;
            }
            return node;
        },
        preparePropsParams: function () {
            const res = this._super();
            res.setButtonData = this.setButtonData.bind(this);
            res.onChangeCol = this.onChangeColumns.bind(this);
            res.onRemoveNode = this.onRemoveNode.bind(this);
            res.findNode = this.findNode.bind(this);
            res.prepareNewNode = this.prepareNewNode.bind(this);
            return res;
        },
        prepareDataToReset: function () {
            const res = this._super();
            this.resetAttr();
            return res;
        },
        _prepareDataSave: function () {
            const newFields = this.prepareNewFields(), res = this._super();
            res.button_data = this.buttonData;
            res.new_fields = newFields;
            return res;
        },
        prepareNewFields: function () {
            const {viewInfo} = this.props, {viewFields, model} = viewInfo;
            return Object.values(this.newFields).map((field) => {
                const viewField = viewFields[field.attrs.name];
                if (!viewField) return;
                const {name, string, type, help, required, readonly, relation, relation_field, selection} = field.attrs;
                const valField = {
                    name: name,
                    field_description: string,
                    ttype: type || viewField.type,
                    help: help,
                    required: required || false,
                    readonly: readonly || false
                };
                if (valField.ttype == "one2many") {
                    const fieldM2one = {
                        model_name: relation, relation: model, name: relation_field,
                        ttype: "many2one", field_description: "Field Relation"
                    };
                    valField.relation = relation;
                    valField.fieldM2one = fieldM2one;
                    valField.relation_field = relation_field;
                } else if (valField.ttype == "selection") {
                    valField.selection = selection;
                } else if (["many2one", "many2many"].includes(valField.ttype)) {
                    valField.relation = relation;
                } else if (field._compute) {
                    valField.compute = true;
                    valField.model = field.model;
                    valField.field_relation = field.field_relation;
                    valField.field_name = field.field_name;
                    valField.action_name = field.action_name;
                }
                delete field.attrs._new;
                delete this.newFields[field.nodeId];
                return valField;
            });
        },
        setButtonData: function (button, data, type) {
            this.buttonData[type][button] = data;
        },
        getNodeStop: function (type, nodes) {
            if (nodes.length <= 1) {
                return nodes[0];
            }
            var result = null;
            if (!type) {
                const check = (_nodes) => {
                    _nodes.map((node) => {
                        if (!result) {
                            node.tag == "field" ? result = node : check(node.children || []);
                        }
                    });
                };
                check(nodes);
            }
            return result || nodes[0];
        },
        canSave: function () {
            var listCheck = [];
            Object.values(this.newFields).map((field) => {
                const check = this.checkField[field.attrs.type] || [];
                check.map((ck) => ck.stop(field) ? listCheck.push(ck.warning) : null)
            });
            if (listCheck.length) {
                Dialog.alert(this, listCheck[0], {title: _t('Warning')});
                return false;
            }
            return true;
        },
        onShowSubView: async function (e) {
            e.stopPropagation();
            e.stopImmediatePropagation();
            const el = $(e.currentTarget), viewType = el.attr("view-type"), fieldName = el.attr("for");
            const {viewInfo, renderSubView} = this.props, {fieldsInfo, fields} = viewInfo, {node} = this.state,
                fieldInfo = fieldsInfo.form[fieldName], field = fields[fieldName];
            if (renderSubView) {
                var subViewInfo = fieldInfo.views[viewType];
                if (!subViewInfo) {
                    const relation = fieldInfo.relation || field.relation;
                    let _context = {action: $.bbq.getState(true).action}, regex = /'([a-z]*_view_ref)' *: *'(.*?)'/g, matches;
                    while (matches = regex.exec(node.attrs.context)) {
                        _context[matches[1]] = matches[2];
                    }
                    subViewInfo = await this.ref.widget.loadFieldView(relation, _context, false, viewType, {});
                    subViewInfo = this.ref.widget.ref.view._processFieldsView(subViewInfo, viewType);
                    subViewInfo = {...subViewInfo, fields: {...subViewInfo.fields}};
                    fieldInfo.views[viewType] = subViewInfo;
                }
                fieldInfo.string = fieldInfo.string || field.string;
                subViewInfo.viewType = viewType;
                subViewInfo.model = field.relation;
                subViewInfo.isSubView = true;
                subViewInfo.parentField = {fieldInfo: fieldInfo, field: field, fieldNode: node, parentView: this};
                renderSubView(subViewInfo);
            }
        },
        onClickTR: function (e) {
            e.stopPropagation();
            e.stopImmediatePropagation();
            var nodeEl = $(e.currentTarget), nodeId = nodeEl.find("> td:not(.o_td_label) > *[node-id]").attr("node-id");
            if (!nodeId) {
                nodeId = nodeEl.find("> td > *[node-id]").attr("node-id");
            }
            if (nodeId && nodeId in this.nodes) {
                this.onClickNode(this.nodes[nodeId]);
                this.$el.find(".nodeActive").removeClass("nodeActive");
                nodeEl.addClass("nodeActive");
            }
        },
        onChangeProp: function (node) {
            const self = this;
            return this.reloadNode(node.nodeId).then(() => {
                if (node.changeTag || node.reloadProps) {
                    delete node.reloadProps;
                    self.ref.viewProps.renderNodeProps(self.$el.find(".wPViewHead").empty());
                }
                self.bindStyle();
            });
        },
        onAddButtonBox: function (e) {
            e.stopPropagation();
            e.stopImmediatePropagation();
            const self = this, el = $(e.currentTarget), nodeBox = this.nodes[el.parent().attr("node-id")];
            if (nodeBox) {
                const node = this.nodeStore.newNode({
                    tag: "button", props:
                        {type: "action", needField: true, class: "oe_stat_button"}
                });
                this.setNodeId(node);
                nodeBox.children.push(node);
                this.reloadNode(nodeBox.nodeId).then(() => {
                    self.onClickNode(node);
                });
            }
        },
        onChangeColumns: function (node, value) {
            value = parseInt(value);
            var children = node.children, groupNeed = value - children.length,
                parentNode = this.nodes[node.parentId], moveChildren = [];
            if (children.length && !children.filter((child) => child.tag == "group").length
                && parentNode && parentNode.tag != "group") {
                moveChildren = children;
                children = [];
                groupNeed = value;
            }
            if (groupNeed > 0) {
                for (let i = 0; i < groupNeed; i++) {
                    children.push(this.nodeStore.newGroup());
                }
                if (moveChildren.length) {
                    children[0].children = moveChildren;
                }
            } else {
                for (let i = children.length - 1; i >= value; i--) {
                    children.splice(i, 1);
                }
            }
            node.children = children;
            node.attrs.col = value;
            this.reloadNode(node.nodeId);
        },
        onRemoveNode: function (nodeIds) {
            var self = this, nodesReload = [], nodeWillActive = false;
            (nodeIds || []).map((nodeId) => {
                const node = this.nodes[nodeId];
                if (node && node.parentId) {
                    const parentNode = this.nodes[node.parentId],
                        children = parentNode.children.filter((child) => child.nodeId != nodeId);
                    nodesReload.push(parentNode.nodeId);
                    nodeWillActive = children.length ? children[0] : parentNode;
                    if (typeof nodeWillActive == "string") {
                        nodeWillActive = nodeWillActive.trim();
                    }
                }
                delete this.newFields[nodeId];
            });
            this.onXpathNode(nodeIds, false, "replace", {});
            return nodesReload.map((nodeReload) => {
                self.reloadNode(nodeReload).then(() => {
                    if (nodeWillActive) {
                        self.onClickNode(nodeWillActive);
                    }
                });
            });
        },
        findNode: function (selector) {
            const elements = $(this.jsonToXml()).find(selector), nodeId = elements.attr("node-id");
            return this.nodes[nodeId];
        },
        setStyle: function (el, style, without = []) {
            style.split(";").map((attr) => {
                attr = attr.split(":");
                if (attr.length > 1 && !without.includes(attr[0].trim())) {
                    el.css({[attr[0].trim()]: attr[1].trim()});
                }
            });
        },
        onStartSort: function (event, ui) {
            var itemVirtual = null, {item, placeholder} = ui, component = item.attr("component");
            placeholder.addClass("uiSort-placeholder").html(item.html());
            if (item.hasClass("o_group")) {
                itemVirtual = QWeb.render("ViewStudio.View.GroupVirtual", {cols: [{label: "Col"}, {label: "Col 2"}]});
            } else if (item.hasClass("wTab")) {
                itemVirtual = QWeb.render("ViewStudio.View.NotebookVirtual", {});
            } else if (component == "text") {
                this.setStyle(placeholder, ui.item.attr("style"), ["position"]);
            } else if (component == "image") {
                this.setStyle(placeholder, ui.item.attr("style"), ["position"]);
                itemVirtual = QWeb.render("ViewStudio.View.ImageVirtual", {});
            } else if (component == "title") {
                itemVirtual = QWeb.render("ViewStudio.View.OtherVirtual", {label: "Title"});
            }
            if (itemVirtual) {
                item.html(itemVirtual);
            }
            item.addClass("uiSort-item");
            this.$el.find(".nodeActive").removeClass("nodeActive");
            if (item.parents(".viewView").length) {
                this.checkPosition(event, ui);
            }
        },
        onSort: function (event, ui) {
            if (ui.item.attr("force")) {
                return ui.item.removeAttr("force");
            }
            this.resetPosition(ui);
        },
        onStopSort: function (event, ui) {
            var self = this, item = ui.item.removeClass("uiSort-item").removeAttr("leftDiff topDiff"),
                nodeId = this.getNodeId(item.next()),
                name = item.attr("name"), type = item.attr("type"), position = "before";
            if (item.parents(".viewView").length) {
                if (!nodeId.length) {
                    const parentEl = $(item.parents("[node-id]")[0]);
                    nodeId = this.getNodeId(parentEl);
                    position = "append";
                }
                if (nodeId.length) {
                    var nodeReload = nodeId[0], nodeProps = {tag: "field", props: {name: name}};
                    if (type == "fieldNew") {
                        const fieldProps = this.ref.viewProps.components.fields.child[name].props;
                        nodeProps = Object.assign(nodeProps, fieldProps, {});
                        nodeProps.newField = true;
                        nodeProps.type = nodeProps.type || name;
                        nodeProps.props = Object.assign(nodeProps.props,
                            {
                                // _new: true, _reload: true,
                                _new: true,
                                type: name, name: "x_" + this.getRandom()
                            });
                    } else if (type == "component") {
                        nodeProps.tag = name;
                    }
                    const nodeSelf = this.onXpathNode(this.getNodeId(item), nodeId, position, nodeProps);
                    if (position != "append") {
                        nodeReload = this.nodes[nodeReload].parentId;
                    }
                    this.reloadNode(nodeReload).then(() => {
                        if (nodeSelf.length) {
                            self.onClickNode(self.getNodeStop(type, nodeSelf));
                        }
                    });
                }
            }
        },
        onBeforeStop: function (event, ui) {
            if (ui.item.parents(".o_list_table").length) {
                ui.item.parents("table").find(".colRoot").remove();
                ui.item.parents("table").find(".sortVirtual").removeClass("sortVirtual");
                ui.placeholder.css({display: "none"});
            }
        },
        onChangeSort: function (event, ui) {
            var name = ui.item.attr("name"), tagType = ui.item.attr("type"),
                topDiff = ui.item.attr("topDiff"), scroll = this.$el.find(".viewView").scrollTop();
            if (!ui.item.attr("force")) {
                this.resetPosition(ui);
                if (!ui.item.attr("noUpdate")) {
                    ui.item.attr({topDiff: parseFloat(topDiff) + scroll + "px"});
                }
                ui.item.attr({force: true, noUpdate: true});
            }
            if (["field", "fieldNew", "component"].includes(tagType) && ui.placeholder.parents(".viewView").length
                && !ui.placeholder.hasClass("oRow")) {
                const virtualTem = this.getHolderTemplate(tagType, name),
                    template = virtualTem ? QWeb.render(virtualTem, {label: ui.item.find("a").text()}) : ui.item.html();
                if (tagType == "component") {
                    tagType = name;
                } else if (["field", "fieldNew"].includes(tagType)) {
                    ui.placeholder.addClass("oRow");
                }
                ui.placeholder.attr({type: tagType}).html(template);
            }
        },
        bindAction: function () {
            this._super();
            this.$el.find(".o_inner_group tr").click(this.onClickTR.bind(this));
            // this.$el.find(".editImage").click(this.onChangeImage.bind(this));
            this.$el.find(".addBtnBox").click(this.onAddButtonBox.bind(this));
            this.$el.find("._subEditList").click(this.onShowSubView.bind(this));
        },
        reloadNode: function (nodeReload) {
            const self = this, {node} = this.state;
            nodeReload = nodeReload || node.nodeId;
            this._super(nodeReload);
            return this.ref.widget.renderer.reloadNode(nodeReload).then(() => {
                self.bindAction();
                self.bindStyle();
            });
        },
    });

    return FormEditContent;

});
