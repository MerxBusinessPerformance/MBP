odoo.define('dynamic_odoo.kanban', function (require) {
    "use strict";

    var core = require('web.core');
    var KanbanRenderer = require('web.KanbanRenderer');
    var KanbanController = require('web.KanbanController');
    var KanBanView = require('web.KanbanView');
    var KanbanRecord = require('web.KanbanRecord');
    var basic_fields = require('dynamic_odoo.basic_fields');
    var baseEdit = require('dynamic_odoo.views_edit_base');

    var base = require('dynamic_odoo.base');
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
            res.attr({name: field_name, "node-id": $field.attr("node-id")});
            return res;
        },
        _onGlobalClick: function () {
        },
        _processWidget: function ($field, field_name, Widget) {
            const self = this, res = this._super($field, field_name, Widget), superRender = res.renderElement;
            res.renderElement = function () {
                superRender.bind(res)();
                res._undelegateEvents();
                res._delegateEvents = () => {
                };
                self.addClassEdit(res.$el);
                res.$el.click(self.onClickField.bind(self));
                res.$el.attr({name: field_name, "node-id": $field.attr("node-id")});
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

    var KanBanContentRenderer = KanbanRenderer.extend({
        config: _.extend({}, KanbanRenderer.prototype.config, {
            KanbanRecord: KanBanContentRecord,
        }),
        init: function (parent, state, params) {
            this._super(parent, state, params);
            this.props = parent.props.viewParams;
        },
        _renderGrouped: function (fragment) {
            var self = this;
            // Render columns
            var KanBanColumn = this.config.KanbanColumn;
            const {onClickField, onAddTag} = this.props;
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
                        onAddTag: onAddTag,
                        onClickField: onClickField
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
        },
        _renderUngrouped: function (fragment) {
            var self = this;
            var KanBanRecord = this.config.KanbanRecord, kanBanRecord;
            const {onAddTag, onClickField} = this.props;
            this.state.data.map((record, idx) => {
                if (idx == 0) {
                    kanBanRecord = new KanBanRecord(self, record, {
                        ...self.recordOptions,
                        onAddTag: onAddTag,
                        onClickField: onClickField
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
        },
    });

    var KanBanContentView = KanBanView.extend({
        config: _.extend({}, KanBanView.prototype.config, {
            Renderer: KanBanContentRenderer,
        }),
    });

    var KanBanViewContent = baseEdit.ViewContent.extend({
        name: "KanBanViewContent",
        isLegacy: true,
        template: 'ViewStudio.View.Kanban',
        init: function (parent, params) {
            this._super(parent, params);
            this.viewConfig.prop = KanBanProps;
            this.viewConfig.view = KanBanContentView;
            this.sortParams.selector = [
                ["._wComTag ._wSortable[name='grid'], .o_kanban_record", ".o_kanban_record"],
                ["._wSortable:not([name='grid']), .wGrid > .row > div[class*=col]",
                    ".wGrid > .row > div[class*=col]"],
            ];
            this.sortParams.cancel = "._addView";
            this.sortParams.tolerance = "intersect";
            this.newFieldNode = {};
            this.newNodes = {};
        },
        setNodeStyle: function (nodeId, style) {
            this.$el.find("[node-id='" + nodeId + "']").attr({style: style});
        },
        setStyle: function (el, style, without = []) {
            style.split(";").map((attr) => {
                attr = attr.split(":");
                if (attr.length > 1 && !without.includes(attr[0].trim())) {
                    el.css({[attr[0].trim()]: attr[1].trim()});
                }
            });
        },
        setKanBanColor: function (fieldName) {
            const {arch} = this.props.viewInfo, kanBanCard = this.findInNode(arch,
                (n) => n.tag == "div" && (n.attrs.class || n.attrs['t-attf-class'] || "").split(" ").includes("oe_kanban_card"));
            if (kanBanCard) {
                let classOld = kanBanCard.attrs.class || kanBanCard.attrs['t-attf-class'];
                delete kanBanCard.attrs.class;
                kanBanCard.attrs['t-attf-class'] = `oe_kanban_color_#{kanban_getcolor(record.${fieldName}.raw_value)} ${classOld}`;
            }
        },

        getTemplate: function (xml = false) {
            const {arch} = this.props.viewInfo;
            let templates = this.findInNode(arch, function (n) {
                return n.tag === 'templates'
            });
            if (xml) {
                templates = utils["json_node_to_xml"](templates);
            }
            return templates;
        },
        _prepareNewNode: function (fieldName, props) {
            const {model, type} = props, params = {fieldName: fieldName, model: model};
            var elTemplate = QWeb.templates[`KanBan.Template.${type}`].children[0].outerHTML;
            Object.keys(params).map((propName) => {
                elTemplate = elTemplate.replaceAll(`#${propName}`, params[propName]);
            });
            elTemplate = (new DOMParser()).parseFromString(elTemplate, "text/xml");
            return eval('utils.xml_to_json(elTemplate, false)');
        },
        prepareNewNodeProps: function (type, fieldName) {
            const {viewInfo} = this.props, field = viewInfo.fields[fieldName], props = {type: type};
            switch (type) {
                case "img":
                    props.model = field.relation;
                    break;
            }
            ;
            return props
        },
        preparePropsParams: function () {
            const res = this._super();
            res.onAddMoreInfo = this.onChangeFieldSelect.bind(this);
            res.setNodeStyle = this.setNodeStyle.bind(this);
            res.addFieldNode = this.addFieldNode.bind(this);
            return res;
        },
        prepareViewParams: function () {
            const res = this._super();
            res.onAddTag = this.onAddTag.bind(this);
            res.onClickField = this.onClickField.bind(this);
            return res;
        },
        jsonToXml: function (arch) {
            if (!arch) {
                arch = this.props.viewInfo.arch;
            }
            this.findInNode(arch, (n) => n.tag === "a" && (n.attrs.class || "").includes("_addView"), true);
            Object.values(this.newFieldNode).map((field) => {
                field.node.attrs = field.attrs;
            });
            return this._super();
        },
        addFieldNode: function (fieldName, replaceType) {
            const {_fieldsInfo, arch} = this.props.viewInfo;
            if (!(fieldName in _fieldsInfo)) {
                const fieldNode = this.nodeStore.newField({props: {name: fieldName}}),
                    widgetType = {"tags": "many2many_tags", "priority": "priority", "activity": "kanban_activity"},
                    widget = widgetType[replaceType];
                if (widget) {
                    const fieldCp = {node: fieldNode};
                    fieldCp.attrs = {...fieldNode.attrs, widget: widget}
                    this.newFieldNode[fieldName] = fieldCp;
                    this.setNodeWidget(fieldNode, widget);
                }
                arch.children.splice(0, 0, fieldNode);
            }
        },
        findInNode: function (node, predicate, remove = false, nodeReplace = "") {
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
                    } else {
                        return check;
                    }
                }
            }
        },
        _changeNodeWhenChangeImg: function (node) {
            delete node.attrs.field_name;
            delete node.attrs['t-att-src'];
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
        checkTemplate: function () {
            const {viewInfo} = this.props;
            const loopNode = (node) => {
                this.setNodeId(node);
                (node.children || []).map((child) => {
                    if (child.tag) {
                        child.parentId = node.nodeId;
                    }
                    loopNode(child);
                });
            }
            loopNode(viewInfo.arch);

            let classCheck = [
                {className: "o_priority", widget: "priority", label: "Add a priority", type: "priority"},
                {className: "o_mail_activity", widget: "kanban_activity", label: "Add an activity", type: "activity"},
                {
                    className: "o_kanban_tags",
                    label: "Add tags",
                    type: "tags",
                    widget: "many2many_tags",
                    position: "top"
                },
                {className: "oe_kanban_colorpicker", label: "", type: "color", position: "top", widget: "color"},
                {className: "oe_kanban_avatar", label: "Add an image", type: "img", position: "bottom"}
            ];
            let templates = this.getTemplate(), nodeAppend = this.findInNode(templates,
                (n) => n.tag == "t" && n.attrs['t-name'] == "kan_ban-box".replace("_", "")).children.filter(
                (child) => child.tag == "div"), $templates = $(utils["json_node_to_xml"](templates));
            if (!$templates.find(".o_kanban_record_subtitle:not(._fEditKan)").length && !$templates.find(".o_kanban_record_title:not('._fEditKan')").length) {
                classCheck.push({
                    className: "o_kanban_record_subtitle",
                    label: "Add a subtitle",
                    type: "subtitle",
                    position: "top"
                });
                classCheck.push({
                    className: "o_kanban_record_title",
                    label: "Add a title",
                    type: "title",
                    position: "top"
                });
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
                    nodeAdd.attrs = {'replace-type': type, class: "_addView", 'add-id': "addId-" + this.getRandom()};
                    nodeAdd.children = [label];
                    position == "top" ? nodeAppend.children.splice(0, 0, nodeAdd) : nodeAppend.children.push(nodeAdd);
                }
            });

        },
        onAddTag: function (tagType, addId) {
            this.ref.viewProps.onClickAddTag(tagType, addId)
        },
        onClickField: function (fieldName) {
            const fieldNode = this.findInNode(this.getTemplate(),
                function (n) {
                    return n.tag === 'field' && n.attrs.name === fieldName;
                });
            this.setNodeActive(fieldNode);
        },
        onChangeFieldSelect: function (fieldName, addId) {
            const templates = this.getTemplate();
            let nodeReplace = this.findInNode(templates, (n) => n.tag == "a" && n.attrs["add-id"] == addId),
                replaceType = false, newNode = false;
            if (!nodeReplace && addId in this.newNodes) {
                newNode = this.newNodes[addId];
                let nodeFine = this.findInNode(newNode.node, (n) => n.tag == "field" && n.attrs.name == newNode.fieldName);
                if (nodeFine) {
                    nodeFine.attrs.name = fieldName;
                    newNode.fieldName = fieldName;
                }
                replaceType = newNode.type;
            } else {
                replaceType = nodeReplace.attrs['replace-type'];
                newNode = this._prepareNewNode(fieldName, this.prepareNewNodeProps(replaceType, fieldName));
                this.newNodes[addId] = {node: newNode, type: replaceType, fieldName: fieldName};
                this.findInNode(templates, (n) => n.tag == "a" && n.attrs["add-id"] == addId, true, newNode);
                if (replaceType == "color") {
                    this.setKanBanColor(fieldName);
                }
            }
            this.addFieldNode(fieldName, replaceType);
            this.renderElement();
        },
        onSort: function (event, ui) {
            if (ui.item.attr("force")) {
                return ui.item.removeAttr("force");
            }
            this.resetPosition(ui);
        },
        onStartSort: function (event, ui) {
            var itemVirtual = null, {item, placeholder} = ui, component = item.attr("component");
            placeholder.addClass("uiSort-placeholder").html(item.html());
            if (component == "text") {
                this.setStyle(placeholder, ui.item.attr("style"), ["position"]);
            } else if (component == "image") {
                this.setStyle(placeholder, ui.item.attr("style"), ["position"]);
                itemVirtual = QWeb.render("ViewStudio.View.ImageVirtual", {});
            }
            if (itemVirtual) {
                item.html(itemVirtual);
            }
            item.addClass("uiSort-item");
            if (item.parents(".viewView").length) {
                this.checkPosition(event, ui);
            }
        },
        onStopSort: function (event, ui) {
            var item = ui.item.removeClass("uiSort-item"), nodeId = this.getNodeId(item.next()),
                name = item.attr("name"), type = item.attr("type"), position = "before";
            if (item.parents(".viewView").length) {
                if (!nodeId.length) {
                    const parentEl = $(item.parents("[node-id]")[0]);
                    nodeId = this.getNodeId(parentEl);
                    position = "append";
                }
                if (nodeId.length) {
                    var nodeProps = {tag: "field", props: {name: name}};
                    if (type == "component") {
                        nodeProps.tag = name;
                    }
                    this.onXpathNode(this.getNodeId(item), nodeId, position, nodeProps);
                    ui.item.remove();
                    this.renderView();
                }
            }
        },
        onChangeSort: function (event, ui) {
            var name = ui.item.attr("name"), tagType = ui.item.attr("type");
            if (["field", "fieldNew", "component"].includes(tagType) && ui.placeholder.parents(".viewView").length) {
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
        reloadNode: function (node) {
            this.renderElement();
        },
        renderViewContent: function () {
            this.checkTemplate();
            return this._super();
        },
    });

    var KanBanProps = baseEdit.ViewProps.extend({
        init: function (parent, props) {
            this._super(parent, props);
            const {fields} = props.viewInfo;
            this.nodeProps.default_group_by = {
                name: 'default_group_by',
                valType: "string",
                label: 'Default Group',
                widget: basic_fields.ChooseField,
                fields: fields,
                fieldTypes: ["many2one", "selection"]
            };
            this.nodeProps.default_order = {
                name: 'default_order',
                valType: "string",
                label: 'Default Order',
                widget: basic_fields.ChooseField,
                fields: fields,
                fieldTypes: ["date", "datetime", "many2one", "selection"]
            };
            this.nodeProps.quick_create = {
                name: 'quick_create',
                valType: "boolean",
                label: 'Quick Create',
                widget: basic_fields.Radio
            };
            this.nodeProps.style.propChange = this.onChangeStyle.bind(this);
            this.nodeProps.choose_field = Object.assign({}, this.nodeProps.choose_field, {
                prepareProps: this.prepareChooseField.bind(this),
                propChange: this.onChangeChooseField.bind(this),
                filter: (field) => ["res.users", "res.partner"].includes(field.relation)
            });
            this.viewPropsView = ["create", "edit", "quick_create", "default_group_by", "default_order"];
            this.nodePropsView = ["invisible", "string", "widget"];
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

            this.components = {component: {label: "Tags", class: "_wComTag", type: "component"}};
            this.components.component.child = {
                text: {name: "text", label: "Text", icon: "font"},
                image: {name: "image", label: "Image", icon: "image"},
                grid: {name: "grid", label: "Grid", icon: "th-large"},
            };
        },
        prepareDivView: function (node) {
            const res = this._super(node);
            if (node.attrs.component == "image") {
                res.splice(1, 0, ...["choose_field"]);
            }
            return res;
        },
        prepareChooseField: function (node, nodeProps) {
            if (node.attrs.component == "image") {
                node.children.map((child) => {
                    if (child.tag == "img" && child.attrs.field_name) {
                        nodeProps.value = child.attrs.field_name;
                    }
                });
            }
        },
        onChangeChooseField: function (node, prop, value) {
            const {viewInfo, addFieldNode} = this.props, {fields} = viewInfo;
            if (value) {
                node.children.map((child) => {
                    if (child.tag == "img") {
                        delete child.attrs.src;
                        child.attrs.field_name = value;
                        // child.attrs['t-if'] = "record."+value+"";
                        child.attrs['t-att-src'] = "kanban_image('" + fields[value].relation + "', 'image_1920', record." + value + ".raw_value)";
                        addFieldNode(value, false);
                    }
                });
            }
        },
        onAddMoreData: function (data, addId) {
            const {onAddMoreInfo} = this.props;
            if (onAddMoreInfo) {
                onAddMoreInfo(data, addId);
            }
        },
        onChangeStyle: function (node, prop, value) {
            const {setNodeStyle} = this.props;
            node.noReload = true;
            node.attrs[prop.name] = value;
            setNodeStyle(node.nodeId, value);
        },
        onChangeTab: function (tabName) {
            this._super(tabName);
            const {bindSortable} = this.props;
            bindSortable(this.ref.tab.$el.find(".wTabCon"));
        },
        onClickAddTag: function (tagType, addId) {
            const {viewInfo} = this.props, {fields} = viewInfo, newFields = {};
            const hasFields = $(viewInfo.arch_original).find("templates field").map((idx, el) => $(el).attr("name")).toArray();
            Object.entries(fields).map((field) => {
                const fieldName = field[0], fieldData = field[1], fieldType = fieldData.type;
                if (!hasFields.includes(fieldName)) {
                    if (tagType == "tags" && ["many2many"].includes(fieldType)) {
                        newFields[fieldName] = fieldData;
                    } else if (tagType == "color" && ["integer"].includes(fieldType)) {
                        newFields[fieldName] = fieldData;
                    } else if (tagType == "activity" && ["activity_ids"].includes(fieldName)) {
                        newFields[fieldName] = fieldData;
                    } else if (tagType == "priority" && ["selection"].includes(fieldType)) {
                        newFields[fieldName] = fieldData;
                    } else if (tagType == "img" && ["many2one"].includes(fieldType) && ["res.users", "res.partner"].includes(fieldData.relation)) {
                        newFields[fieldName] = fieldData;
                    } else if (["subtitle", "title"].includes(tagType)) {
                        newFields[fieldName] = fieldData;
                    }
                }
            });
            const wrapProp = $("<div class='wrapField'>"), chooseField = new basic_fields.ChooseField(this, {
                label: "Select Field", fields: newFields,
                onChange: (data) => this.onAddMoreData.bind(this)(data, addId)
            });
            chooseField.appendTo(wrapProp);
            this.$el.find(".wPViewHead").empty().append(wrapProp);
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

    return KanBanViewContent;

});

