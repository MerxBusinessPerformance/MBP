odoo.define('dashboard_studio.kanban', function (require) {
"use strict";

    var core = require('web.core');
    var KanbanRenderer = require('web.KanbanRenderer');
    var KanbanController = require('web.KanbanController');
    var KanBanView = require('web.KanbanView');
    var KanbanRecord = require('web.KanbanRecord');
    var basic_fields = require('dashboard_studio.basic_fields');
    var baseEdit = require('dashboard_studio.views_edit_base');

    var base = require('dashboard_studio.base');
    var utils = require('web.utils');
    var QWeb = core.qweb;

    var KanBanContentRecord = KanbanRecord.extend({
        init: function (parent, state, options) {
            this._super(parent, state, options);
            this.props = options;
        },
        getRandom: function () {
            return String(Math.random()).replace("0.", "PD");
        },
        addClassEdit: function (el) {
            el.addClass("elEdiT");
        },
        _processField: function ($field, field_name) {
            let res = this._super($field, field_name);
            this.addClassEdit(res);
            res.attr({name: field_name});
            return res;
        },
        _onGlobalClick: function () {},
        _processWidget: function ($field, field_name, Widget) {
            const self = this, res = this._super($field, field_name, Widget), superRender = res.renderElement;
            res.renderElement = function () {
                superRender.bind(res)();
                res._undelegateEvents();
                res._delegateEvents = () => {};
                self.addClassEdit(res.$el);
                res.$el.click(self.onClickField.bind(self));
                res.$el.attr({name: field_name});
            }
            return res;
        },
        bindAction: function () {
            this.$el.find('._addView').click(this.onClickAddView.bind(this));
            this.$el.find('.elEdiT').click(this.onClickField.bind(this));
        },
        onClickField: function (e) {
            e.stopPropagation();
            e.preventDefault();
            let el = $(e.currentTarget), fieldName = el.attr("name");
            const {onClickField} = this.props;
            onClickField(fieldName);
        },
        onClickAddView: function (e) {
            e.stopPropagation();
            let el = $(e.currentTarget);
            this.props.onAddTag(el.attr("replace-type"), el.attr("add-id"))
        },
        _render: function () {
            this._super();
            this.bindAction();
        },
    });

    var KanBanContentController = KanbanController.extend({
         _pushState: function () {}
    });

    var KanBanContentRenderer = KanbanRenderer.extend({
        init: function (parent, state, params) {
            this.fromEdit = parent['name'] == "KanBanViewContent";
            this.config.KanbanRecord = this.fromEdit ? KanBanContentRecord : KanbanRecord;
            this._super(parent, state, params);
            this.parent = parent;
        },
        _renderGrouped: function (fragment) {
            var self = this;
            // Render columns
            if (this.fromEdit) {
                var KanBanColumn = this.config.KanbanColumn;
                const {onClickField, onAddTag} = this.parent;
                this.state.data.map((group, idx) => {
                    if (idx == 0) {
                        if (group.data.length > 1) {
                            let firstData = group.data[0];
                            group.data = [firstData];
                            group.count = 1;
                            group.res_ids = [firstData.res_id];
                        }
                        self.columnOptions.KanbanRecord = KanBanContentRecord;
                        var column = new KanBanColumn(self, group, self.columnOptions, {
                            ...self.recordOptions,
                            onAddTag: onAddTag.bind(this.parent),
                            onClickField: onClickField.bind(self.parent)
                        }), def;
                        if (!group.value) {
                            def = column.prependTo(fragment); // display the 'Undefined' group first
                            self.widgets.unshift(column);
                        } else {
                            def = column.appendTo(fragment);
                            self.widgets.push(column);
                        }
                        self.defs.push(def);
                    }
                });
            }else {
                this._super(fragment);
            }
        },
        _renderUngrouped: function (fragment) {
            var self = this;
            if (this.fromEdit) {
                var KanBanRecord = this.config.KanbanRecord, kanBanRecord;
                const {onAddTag, onClickField} = this.parent;
                this.state.data.map((record, idx) => {
                    if (idx == 0) {
                        kanBanRecord = new KanBanRecord(self, record, {
                            ...self.recordOptions,
                            onAddTag: onAddTag.bind(this.parent),
                            onClickField: onClickField.bind(this.parent)
                        });
                        self.widgets.push(kanBanRecord);
                        var def = kanBanRecord.appendTo(fragment);
                        self.defs.push(def);
                    }
                });
                var prom = Promise.all(self.defs).then(function () {
                    var options = {};
                    if (kanBanRecord) {
                        options.inlineStyle = kanBanRecord.$el.attr('style');
                    }
                    return self._renderGhostDivs(fragment, 6, options);
                });
                this.defs.push(prom);
            }else  {
                this._super(fragment);
            }
        },
    });

    var KanBanContentView = KanBanView.extend({
        init: function (viewInfo, params) {
            this._super(viewInfo, params);
            this.props = params;
            if (this.props.fromEdit) {
                this.config.Renderer = KanBanContentRenderer;
                this.config.Controller = KanBanContentController;
            }
        },

    });

    var KanbanViewContent = baseEdit.ViewContent.extend({
        name: "KanBanViewContent",
        template: 'DashboardStudio.View.Kanban',
        init: function(parent, params) {
            this._super(parent, params);
            this.viewConfig.prop = KanBanProps;
            this.viewConfig.view = KanBanContentView;
            this.newFieldNode = {};
            this.newNodes = {};
        },
        jsonToXml: function () {
            const {arch} = this.props.viewInfo;
            this.findInNode(arch, (n) => n.tag === "a" && (n.attrs.class || "").includes("_addView"), true);
            Object.values(this.newFieldNode).map((field) => {
                field.node.attrs = field.attrs;
            });
            return utils["json_node_to_xml"](arch);
        },
        getNewNoteField: function (params={}) {
            const {fieldName} = params;
            let newField = {tag: "field"}, props = {modifiers: {}, name: fieldName};
            newField.attrs = props;
            newField.children = [];
            return newField;
        },
        addFieldNode: function (fieldName, replaceType) {
            const {editView} = this.props, {fieldsInfo, arch, fieldsGet} = this.props.viewInfo;
            if (!(fieldName in fieldsInfo.kanban)) {
                let fieldNode = this.getNewNoteField({fieldName: fieldName}),
                    widgetType = {"tags": "many2many_tags", "priority": "priority", "activity": "kanban_activity"};
                if (replaceType in widgetType) {
                    fieldNode.attrs.widget = widgetType[replaceType];
                    this.newFieldNode[fieldName] = {node: fieldNode, attrs: {...fieldNode.attrs}};
                    // editView.basicView._processField("kanban", fieldsGet[fieldName], fieldNode.attrs);
                }
                arch.children.splice(0, 0, fieldNode);
                // this._processNewNode(fieldNode);
            }
        },
        prepareDataToReset: function () {
            const {viewInfo} = this.props, {view_id} = viewInfo;
            return {view_id: view_id};
        },
        getRandom: function () {
            return String(Math.random()).replace("0.", "PD");
        },
        findInNode: function (node, predicate, remove=false, nodeReplace="") {
            if (predicate(node)) {
                return node;
            }
            if (!node.children) {
                return undefined;
            }
            for (var i = 0; i < node.children.length; i++) {
                let check = this.findInNode(node.children[i], predicate, remove, nodeReplace);
                if (check) {
                    if (remove) {
                        node.children[i] = nodeReplace;
                    }else {
                        return check;
                    }
                }
            }
        },
        reloadNode: function (node) {
            this.renderElement();
        },
        onClickField: function (fieldName) {
            const fieldNode = this.findInNode(this.getTemplate(),
                function (n) { return n.tag === 'field' && n.attrs.name === fieldName;});
            this.onClickNode(fieldNode);
        },
        prepareNewNode: function (fieldName, props) {
            const {model, type} = props, params = {fieldName: fieldName, model: model};
            var elTemplate = QWeb.templates[`KanBan.Template.${type}`].children[0].outerHTML;
            Object.keys(params).map((propName) => {
                elTemplate = elTemplate.replaceAll(`#${propName}`, params[propName]);
            });
            elTemplate = (new DOMParser()).parseFromString(elTemplate, "text/xml");
            return eval('utils.xml_to_json(elTemplate, false)');
        },
        // newNodeImage: function (fieldName, props) {
            // this.prepareNewNode(fieldName, {params: {fieldName: fieldName, model: model}})
            // const {model} = props, params = {fieldName: fieldName, model: model};
            // var elTemplate = QWeb.templates["KanBan.Template.img"].children[0].outerHTML;
            // Object.keys(params).map((propName) => {
            //     elTemplate = elTemplate.replaceAll(`#${propName}`, params[propName]);
            // });
            // elTemplate = (new DOMParser()).parseFromString(elTemplate, "text/xml");
            // return eval('utils.xml_to_json(elTemplate, false)');
        // },
        // newNodeTags: function (fieldName) {
        //     const nodeAdd = {};
        //     nodeAdd.tag = "field";
        //     nodeAdd.attrs = {widget: "many2many_tags", name: fieldName};
        //     nodeAdd.children = [];
        //     return nodeAdd;
        // },
        // newNodePriority: function (fieldName) {
        //     const nodeAdd = {}, nodeField = {};
        //     nodeAdd.tag = "div";
        //     nodeAdd.attrs = {class: "oe_kanban_bottom_left float-left _wPriority"};
        //     nodeField.tag = "field";
        //     nodeField.attrs = {widget: "priority", name: fieldName};
        //     nodeField.children = [];
        //     nodeAdd.children = [nodeField];
        //     return nodeAdd;
        // },
        // newNodeColor: function (fieldName) {
        //     let nodeAdd = utils.xml_to_json(QWeb.templates['KanBan.Template.Color'].children[0], false), nodeFind = this.findInNode(nodeAdd,
        //         (n) => n.tag == "ul" && n.attrs.class == "oe_kanban_colorpicker");
        //     if (nodeFind) {
        //         nodeFind.attrs['data-field'] = fieldName;
        //     }
        //     return nodeAdd;
        // },
        // newNodeTitle: function (fieldName) {
        //     let nodeAdd = utils.xml_to_json(QWeb.templates['KanBan.Template.title'].children[0], false), nodeFind = this.findInNode(nodeAdd,
        //         (n) => n.tag == "field" && n.attrs.name == "name");
        //     if (nodeFind) {
        //         nodeFind.attrs['name'] = fieldName;
        //     }
        //     return nodeAdd;
        // },
        // newNodeSubtitle: function (fieldName) {
        //     let nodeAdd = utils.xml_to_json(QWeb.templates['KanBan.Template.subtitle'].children[0], false), nodeFind = this.findInNode(nodeAdd,
        //         (n) => n.tag == "field" && n.attrs.name == "name");
        //     if (nodeFind) {
        //         nodeFind.attrs['name'] = fieldName;
        //     }
        //     return nodeAdd;
        // },
        // newNodeActivity: function () {
        //     let nodeAdd = utils.xml_to_json(QWeb.templates['KanBan.Template.Activity'].children[0], false);
        //     return nodeAdd;
        // },
        setKanBanColor: function (fieldName) {
            const {arch} = this.props.viewInfo, kanBanCard = this.findInNode(arch,
                (n) => n.tag == "div" && (n.attrs.class || n.attrs['t-attf-class'] || "").split(" ").includes("oe_kanban_card"));
            if (kanBanCard) {
                let classOld = kanBanCard.attrs.class || kanBanCard.attrs['t-attf-class'];
                delete kanBanCard.attrs.class;
                kanBanCard.attrs['t-attf-class'] = `oe_kanban_color_#{kanban_getcolor(record.${fieldName}.raw_value)} ${classOld}`;
            }
        },
        prepareNewNodeProps: function (type, fieldName) {
            const {viewInfo} = this.props, field = viewInfo.fields[fieldName], props = {type: type};
            switch (type) {
                case "img":
                    props.model = field.relation;
                    break;
            };
            return props
        },
        onChangeFieldSelect: function (fieldName, addId) {
            // const newNodes = {tags: this.newNodeTags.bind(this), priority: this.newNodePriority.bind(this),
            //     img: this.newNodeImage.bind(this), color: this.newNodeColor.bind(this), activity: this.newNodeActivity.bind(this),
            //     title: this.newNodeTitle.bind(this), subtitle: this.newNodeSubtitle.bind(this)};
            const templates = this.getTemplate();
            let nodeReplace = this.findInNode(templates, (n) => n.tag == "a" && n.attrs["add-id"] == addId), replaceType = false, newNode = false;
            if (!nodeReplace && addId in this.newNodes) {
                newNode = this.newNodes[addId];
                let nodeFine = this.findInNode(newNode.node, (n) => n.tag == "field" && n.attrs.name == newNode.fieldName);
                if (nodeFine) {
                    nodeFine.attrs.name = fieldName;
                    newNode.fieldName = fieldName;
                }
                replaceType = newNode.type;
            }else {
                replaceType = nodeReplace.attrs['replace-type'];
                newNode = this.prepareNewNode(fieldName, this.prepareNewNodeProps(replaceType, fieldName));
                // newNode = newNodes[replaceType](fieldName, this.prepareNewNodeProps(replaceType, fieldName));
                this.newNodes[addId] = {node: newNode, type: replaceType, fieldName: fieldName};
                this.findInNode(templates, (n) => n.tag == "a" && n.attrs["add-id"] == addId, true, newNode);
                if (replaceType == "color") {
                    this.setKanBanColor(fieldName);
                }
            }
            this.addFieldNode(fieldName, replaceType);
            this.renderElement();
        },
        changeTemplate: function (template) {
            const {viewInfo, editView} = this.props;
            let templateNode = utils.xml_to_json($.parseXML(template).documentElement, false);
            viewInfo.arch.children.map((child) => {
                if (child && child.tag == "templates") {
                    child.children = templateNode.children;
                }
            });
            editView.basicView._processArch(viewInfo.arch, viewInfo);
            this.renderElement();
        },
        getTemplate: function (xml=false) {
            const {arch} = this.props.viewInfo;
            let templates = this.findInNode(arch, function (n) { return n.tag === 'templates'});
            if (xml) {
                templates = utils["json_node_to_xml"](templates);
            }
            return templates;
        },
        checkTemplate: function () {
            let classCheck = [
                {className: "o_priority", widget: "priority", label: "Add a priority", type: "priority"},
                {className: "o_mail_activity", widget: "kanban_activity", label: "Add an activity", type: "activity"},
                {className: "o_kanban_tags", label: "Add tags", type: "tags", widget: "many2many_tags", position: "top"},
                {className: "oe_kanban_colorpicker", label: "", type: "color", position: "top", widget: "color"},
                {className: "oe_kanban_avatar", label: "Add an image", type: "img", position: "bottom"}
                ];
            let templates = this.getTemplate(), nodeAppend = this.findInNode(templates,
                (n) => n.tag == "t" && n.attrs['t-name'] == "kan_ban-box".replace("_", "")).children.filter(
                    (child) => child.tag == "div"), $templates = $(utils["json_node_to_xml"](templates));
            if (!$templates.find(".o_kanban_record_subtitle:not(._fEditKan)").length && !$templates.find(".o_kanban_record_title:not('._fEditKan')").length) {
                classCheck.push({className: "o_kanban_record_subtitle", label: "Add a subtitle", type: "subtitle", position: "top"});
                classCheck.push({className: "o_kanban_record_title", label: "Add a title", type: "title", position: "top"});
            }
            this.findInNode(templates, (n) => n.tag === "a" && (n.attrs.class || "").includes("_addView"), true);
            if (nodeAppend.length) {
                nodeAppend = nodeAppend[0];
            }
            classCheck.map((clCheck) => {
                const {className, widget, label, type, position} = clCheck;
                const nodeCheck = this.findInNode(templates, (n) => (n.attrs && (n.attrs.class || "").split(" ").includes(className))
                    || (widget && n.tag === 'field' && n.attrs.widget === widget));
                if (!nodeCheck || type == "tags") {
                    const nodeAdd = {};
                    nodeAdd.tag = "a";
                    nodeAdd.attrs = {'replace-type': type, class: "_addView", 'add-id': "addId-"+this.getRandom()};
                    nodeAdd.children = [label];
                    position == "top" ? nodeAppend.children.splice(0, 0, nodeAdd) : nodeAppend.children.push(nodeAdd);
                }
            });
        },
        preparePropsParams: function () {
            const res = this._super();
            res.onAddMoreInfo = this.onChangeFieldSelect.bind(this);
            return res;
        },
        prepareViewParams: function () {
            const res = this._super();
            res.onAddTag = this.onAddTag.bind(this);
            return res;
        },
        onAddTag: function (tagType, addId) {
            this.ref.viewProps.onClickAddTag(tagType, addId)
        },
        renderViewContent: function () {
            this.checkTemplate();
            this._super();
        },
        renderView: function () {
            this.renderViewProps();
            this.renderViewContent();
        },
    });

    var KanBanProps = baseEdit.ViewProps.extend({
        init: function(parent, props) {
            this._super(parent, props);
            const {fields} = props.viewInfo;
            this.nodeProps.default_group_by = {name: 'default_group_by', valType: "string", label: 'Default Group', widget: basic_fields.ChooseField, fields: fields, fieldTypes: ["many2one", "selection"]};
            this.nodeProps.default_order = {name: 'default_order', valType: "string", label: 'Default Order', widget: basic_fields.ChooseField, fields: fields, fieldTypes: ["date", "datetime", "many2one", "selection"]};
            this.nodeProps.quick_create = {name: 'quick_create', valType: "boolean", label: 'Quick Create', widget: basic_fields.Radio};
            this.nodeProps.edit = {name: 'edit', valType: "boolean", label: 'Edit', widget: basic_fields.Radio};
            this.nodeProps.create = {name: 'create', valType: "boolean", label: 'Create', widget: basic_fields.Radio};
            this.viewPropsView = ["default_group_by", "default_order", "quick_create", "edit", "create"];
            this.nodePropsView = ["invisible", "string", "widget"];
        },
        onAddMoreData: function (data, addId) {
            const {onAddMoreInfo} = this.props;
            if (onAddMoreInfo) {
                onAddMoreInfo(data, addId);
            }
        },
        onClickAddTag: function (tagType, addId) {
            const {viewInfo} = this.props, {fields} = viewInfo, newFields = {};
            Object.entries(fields).map((field) => {
                const fieldName = field[0], fieldData = field[1], fieldType = fieldData.type;
                if (tagType == "tags" && ["many2many"].includes(fieldType)) {
                    newFields[fieldName] = fieldData;
                }else if (tagType == "color" && ["integer"].includes(fieldType)) {
                    newFields[fieldName] = fieldData;
                }else if (tagType == "activity" && ["activity_ids"].includes(fieldName)) {
                    newFields[fieldName] = fieldData;
                }else if (tagType == "priority" && ["selection"].includes(fieldType)) {
                    newFields[fieldName] = fieldData;
                }else if (tagType == "img" && ["many2one"].includes(fieldType) && ["res.users", "res.partner"].includes(fieldData.relation)) {
                    newFields[fieldName] = fieldData;
                }else if (["subtitle", "title"].includes(tagType)) {
                    newFields[fieldName] = fieldData;
                }
            });
            let chooseField = new basic_fields.ChooseField(this, {label: "Select Field", fields: newFields,
                onChange: (data) => this.onAddMoreData.bind(this)(data, addId)});
            chooseField.renderElement();
            this.$el.find(".wPViewHead").empty().append(chooseField.$el);
        },
        prepareParamsProp: function (node, viewPropsView) {
            const propsProp = this._super(node, viewPropsView);
            return propsProp;
        },
    });

    return KanbanViewContent;

});

