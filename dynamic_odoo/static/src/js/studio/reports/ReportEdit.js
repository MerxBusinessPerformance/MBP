odoo.define('dynamic_odoo.ReportEdit', function (require) {
    "use strict";

    var core = require('web.core');
    var Widget = require('web.Widget');
    var utils = require('web.utils');
    var baseEdit = require('dynamic_odoo.views_edit_base');
    // var ReportKanBan = require('dynamic_odoo.ReportKanBan');
    var Domain = require('web.Domain');
    var base = require("dynamic_odoo.base");
    var basic_fields = require('dynamic_odoo.basic_fields');
    var basic_widgets = require('dynamic_odoo.basic_widgets');
    var {download} = require("@web/core/network/download");
    var QWeb = core.qweb;


    var ReportView = base.WidgetBase.extend({
        template: "ViewStudio.ReportView",
        init: function (parent, params) {
            this._super(parent, params);
            this.viewSimple = true;
        },
        onClickPrint: async function () {
            const {reportParams} = this.props, reportUrl = this._makeReportUrls(reportParams), env = odoo['studio'].env;
            env.services.ui.block();
            try {
                await download({
                    url: "/report/download",
                    data: {
                        data: JSON.stringify([reportUrl['pdf'], "qweb-pdf"]),
                        context: JSON.stringify(env.services.user.context),
                    },
                });
            } finally {
                env.services.ui.unblock();
            }
        },
        _makeReportUrls: function (action) {
            const env = odoo['studio'].env;
            let reportUrls = {
                html: '/report/html/' + action.report_name,
                pdf: '/report/pdf/' + action.report_name,
                text: '/report/text/' + action.report_name,
            };
            var activeIDsPath = '/' + action.context.active_ids.join(','),
                context = Object.assign({}, action.context, env.services.user.context);
            reportUrls = _.mapObject(reportUrls, function (value) {
                return value += activeIDsPath;
            });
            reportUrls.html += '?context=' + encodeURIComponent(JSON.stringify(context));
            reportUrls.pdf += '?context=' + encodeURIComponent(JSON.stringify(context));
            reportUrls.text += '?context=' + encodeURIComponent(JSON.stringify(context));
            return reportUrls;
        },
        bindAction: function () {
            this.$el.find(".btnPrint").click(this.onClickPrint.bind(this));
        },
        renderView: function () {
            let self = this;
            const {reportParams, bindAction, inDOM} = this.props;
            reportParams.context.STUDIO = true;
            const reportUrl = this._makeReportUrls(reportParams);
            $.get(location.origin + reportUrl.html, {},
                function (data) {
                    let report = $(data);
                    self.$el.find('.wContent').append(report.find("main"));
                    if (!self.$el.find("div.page").children().length) {
                        self.$el.find("div.page").addClass("noChild");
                    }
                    bindAction();
                    if (inDOM) {
                        inDOM();
                    }
                }
            );
        },
    });
    ReportView.isSimple = true;

    var ReportProps = baseEdit.ViewProps.extend({
        init: function (parent, props) {
            this._super(parent, props);
            const {reportParams} = this.props, {display_name, paperformat_id, groups_id, binding_model_id, model_id} = reportParams;
            this.nodeProps.display_name = {
                name: 'name',
                valType: "string",
                label: 'Name',
                widget: basic_fields.Input,
                value: display_name,
                noNode: true,
                propChange: this.onChangeReportData.bind(this)
            };
            this.nodeProps.groups_id = Object.assign({}, this.nodeProps.groups, {
                name: "groups_id",
                label: "Groups", no_xml: true, valType: "list",
                value: groups_id || [], noNode: true,
                propChange: this.onChangeReportData.bind(this)
            });
            this.nodeProps.binding_model_id = {
                name: 'binding_model_id',
                valType: "boolean", noNode: true,
                label: "Add in the print menu",
                widget: basic_fields.ToggleSwitch,
                value: binding_model_id ? true : false,
                propChange: this.onChangeBindingModel.bind(this)
            };
            this.nodeProps.paperformat_id = {
                name: "paperformat_id",
                valType: "string", noNode: true,
                label: "Paper format",
                value: paperformat_id ? paperformat_id[0] : false,
                widget: basic_fields.FieldMany2one,
                model: "ir.actions.report",
                relation: "report.paperformat",
                propChange: this.onChangePaperFormat.bind(this)
            };
            this.nodeProps.element_info = {
                name: "element_info",
                valType: "string",
                label: "Element Info",
                prepareProps: this.prepareElementInfoProps.bind(this),
                widget: basic_widgets.ParentElNode
            };
            this.nodeProps.visible_if = {
                name: 'visible_if',
                valType: "string",
                label: 'Visible if',
                widget: basic_widgets.ButtonDomain,
                prepareProps: this.prepareVisibleIf.bind(this),
                propChange: this.visibleIfChange.bind(this),
            }
            this.nodeProps['t-esc'] = {
                name: 't-esc',
                valType: "string",
                label: "Esc Expression",
                widget: basic_fields.Input,
            }
            this.nodeProps.widget = {
                name: "widget", valType: "string", label: "Widget", widget: basic_fields.Selection,
                prepareProps: this.prepareWidget.bind(this),
                propChange: this.widgetChange.bind(this)
            };
            this.nodeProps.widget_options = {
                name: "widget_options",
                label: "Widget Options",
                widget: basic_widgets.WidgetOptions,
                prepareProps: this.prepareWidgetOptions.bind(this),
                propChange: this.widgetOptionsChange.bind(this),
            };
            this.nodeProps.noEdit = true;
            this.nodeProps.string.prepareProps = this.prepareStringProps.bind(this);
            this.nodeProps.string.propChange = this.stringChange.bind(this);
            this.nodeProps.choose_field.prepareProps = this.prepareChooseFieldProps.bind(this);
            this.nodeProps.choose_field.propChange = this.chooseFieldChange.bind(this);
            this.nodeProps.style.propChange = this.styleChange.bind(this);
            this.nodeProps.change_img = {
                label: "Change Image",
                name: "change_img",
                widget: basic_widgets.ChangeImage,
                propChange: this.onChangeImage.bind(this),
            }

            this.state.tab = "report";
            this.tabs = {};
            this.tabs.report = {
                label: "Report",
                render: this.renderTabReport.bind(this),
                views: ["display_name", "groups_id", "paperformat_id", "binding_model_id"],
                name: "report",
                icon: "foursquare"
            };
            // this.tabs.templates = {
            //     label: "Layout",
            //     render: this.renderTabLayout.bind(this),
            //     name: "layout",
            //     icon: "columns"
            // };
            this.tabs.components = {
                label: "Components",
                render: this.renderTabComponents.bind(this),
                name: "components",
                icon: "tags"
            };

            this.components = {component: {label: "Tags", class: "_wComTag", type: "component"}};
            this.components.component.child = {
                text: {name: "text", label: "Text", icon: "font"},
                field: {name: "field", label: "Field", icon: "foursquare"},
                image: {name: "image", label: "Image", icon: "image"},
                grid: {name: "grid", label: "Grid", icon: "th-large"},
                column: {name: "column", label: "Columns", icon: "th-list"},
                table: {name: "table", label: "Table", icon: "table"},
                line: {name: "hr", label: "Line", icon: "window-minimize"},
            };
        },
        setNodeActive: function (node, el, path) {
            this.setState({node: node, el: el, path: path});
            this.renderElement();
        },
        getNodeView: function (node) {
            var view = [], tField = node.attrs["t-field"], tEsc = node.attrs["t-esc"];
            if (tField) {
                view.push(...["choose_field", "widget", "widget_options"]);
            }
            if (tEsc) {
                view.push("t-esc");
            }
            if (["span", "a", "p", "h1", "h2", "h3", "h4", "h5", "h6", "th", "td", "strong", "b", "li", "i"].includes(node.tag) && !tField && !tEsc) {
                view.push("string");
            }
            if ((node.attrs.class || "").includes("gridCol")) {
                view.push("grid_cols");
            } else if ((node.attrs.class || "").includes("wGrid")) {
                view.push("grid_columns");
            }
            if (node.$el.length) {
                view.push("style");
            }
            if (node.tag == "img") {
                view.push("change_img");
            }
            return view.concat(["visible_if", "groups", "more"]);
        },
        _getOptionsValue: function (node) {
            var options = (node || this.state.node).attrs['t-options'] || '{}';
            options = options.replaceAll("True", "true");
            options = options.replaceAll("False", "false");
            options = options.replaceAll('"true"', "true");
            options = options.replaceAll('"false"', "false");
            try {
                return JSON.parse(options);
            }
            catch (err) {
                return {};
            }
        },
        _jsonOVtoString: function (value) {
            return JSON.stringify(value).replaceAll('"true"', "True").replaceAll('"false', "False");
        },
        // onShowArea: function (node, prop, value) {
        //
        // },
        onChangeImage: function (node, prop, value) {
            delete node.attrs['t-att-src'];
            node.attrs.src = value;
        },
        prepareElementInfoProps: function (node, nodeProps) {
            const {el} = this.state;
            nodeProps.elNode = el;
        },
        onChangePaperFormat: function (node, prop, value) {
            if (value) {
                value = value.id;
            }
            this.onChangeReportData(node, prop, value);
        },
        onChangeBindingModel: function (node, prop, value) {
            const {reportParams} = this.props, {model_id} = reportParams;
            if (value && model_id) {
                value = model_id[0];
            }
            this.onChangeReportData(node, prop, value);
        },
        onChangeReportData: function (node, prop, value) {
            const {reportParams} = this.props, {id} = reportParams;
            this['_rpc']({
                model: "ir.actions.report",
                method: 'write',
                args: [id, {[prop.name]: value}],
            });
        },
        onChangeProp: function (node, prop, value) {
            const {noNode, propChange} = prop;
            if (noNode) {
                if (propChange) {
                    propChange(node, prop, value);
                }
                return;
            }
            return this._super(node, prop, value);
        },
        widgetOptionsChange: function (node, prop, value) {
            node.attrs['t-options'] = this._jsonOVtoString(value);
        },
        prepareWidgetOptions: function (node, nodeProps) {
            const widgetOptions = odoo.studio.fieldWidgetOptions, optionsValues = this._getOptionsValue() || {};
            var {widget, fields} = optionsValues;
            fields = fields || ["name", "address", "phone", "mobile", "email"];
            if (widget) {
                nodeProps.options = widgetOptions[optionsValues.widget];
                nodeProps.value = optionsValues;
                const opValues = [{field: "phone", name: "phone_icons"}];
                opValues.map((op) => {
                    if (fields.includes(op.field) && !optionsValues['no_marker'] && !(op.name in optionsValues)) {
                        optionsValues[op.name] = true;
                    }
                })
            }
        },
        widgetChange: function (node, prop, value) {
            const optionsValues = this._getOptionsValue();
            optionsValues.widget = value;
            value ? (node.attrs['t-options'] = this._jsonOVtoString(optionsValues)) : (delete node.attrs['t-options']);
            value == "contact" ? (node.attrs.widget_contact = true) : (delete node.attrs.widget_contact);
        },
        prepareWidget: function (node, nodeProps) {
            const widgetOptions = odoo.studio.fieldWidgetOptions, optionsValues = this._getOptionsValue();
            if ("widget" in optionsValues) {
                nodeProps.value = optionsValues.widget;
            }
            const options = Object.keys(widgetOptions).map((widget) => {
                return {label: widget, value: widget};
            });
            nodeProps.options = options;
        },
        stringChange: function (node, prop, value) {
            var stop = false;
            if (node.children.length > 1) {
                node.children.map((child, idx) => {
                    if (typeof child == "string" && !stop) {
                        stop = true;
                        node.children[idx] = value;
                    }
                });
            } else {
                node.children = [value];
            }
        },
        chooseFieldChange: function (node, prop, value) {
            node.attrs['t-field'] = value.join(".");
            delete node.attrs['t-options'];
        },
        prepareChooseFieldProps: function (node, nodeProps) {
            const {getDataValues} = this.props, {el} = this.state, chain = node.attrs["t-field"].split(".");
            nodeProps.value = chain;
            nodeProps.gChain = true;
            nodeProps.followRelations = true;
            nodeProps.fields = getDataValues(el);
        },
        styleChange: function (node, prop, value) {
            node.attrs.style = value;
            const classes = node.attrs.class || "", newClass = [];
            classes.split(" ").map((cls) => {
                cls = cls.trim();
                if (cls && (cls != "hasHeight")) {
                    newClass.push(cls);
                }
            });
            if (value.includes("height:")) {
                newClass.push("hasHeight");
            }
            node.attrs.class = newClass.join(" ");
        },
        prepareStringProps: function (node, nodeProps) {
            const childStr = node.children.filter((child) => typeof child == "string")
            if (childStr.length) {
                nodeProps.value = childStr[0];
            }
        },
        visibleIfChange: function (node, prop, value) {
            if (value) {
                value = Domain.prototype.stringToArray(value);
                if (!value.length) {
                    delete node.attrs['t-if'];
                } else {
                    value = Domain.prototype.domainToCondition(value);
                    node.attrs['t-if'] = value;
                }
            }
        },
        prepareVisibleIf: function (node, nodeProps) {
            const {getDataValues} = this.props, {el} = this.state, condition = node && node.attrs['t-if'],
                fields = getDataValues(el);
            if (condition) {
                nodeProps.value = Domain.prototype.arrayToString(Domain.prototype.conditionToDomain(condition));
            }
            nodeProps.options = {fields: fields};
            ['doc', 'doc_value', 'o'].map((field) => {
                if (!nodeProps.options.default) {
                    nodeProps.options.default = [[field, '!=', false]]
                }
            });
        },
        _getNoCols: function (nodeGrid, without = []) {
            const nodeRow = nodeGrid.children.filter((child) => child.tag == "div" && child.attrs.class == "row");
            if (!nodeRow.length) {
                return 0;
            }
            const childCols = nodeRow[0].children.filter((child) => child.tag == "div" && !without.includes(child.nodeId) && child.attrs.class.includes("col-"));
            const noCols = childCols.map((child) => child.attrs.class.split(" ").filter((cl) => cl.indexOf("col-") >= 0).map(
                (cl) => parseInt(cl.replace("col-", "").trim()))[0]
            ).reduce((a, b) => a + b, 0);
            return {cols: childCols.length, no: noCols};
        },
        onChangeGridCols: function (node, prop, value) {
            const {nodes} = this.props, parentId = node.parentId;
            if (parentId) {
                const nodeGrid = nodes[nodes[parentId].parentId], {no} = this._getNoCols(nodeGrid, [node.nodeId]);
                if ((no + parseInt(value || 1)) > 12) {
                    value = 12 - no;
                }
            }
            this._super(node, prop, value);
        },
        onChangeGridColumns: function (node, prop, value) {
            var {cols, no} = this._getNoCols(node), noCol = 0;
            value = parseInt(value);
            if (cols < value) {
                const noColCon = 12 - no, colNeed = value - cols;
                noCol = Math.floor(noColCon / colNeed);
                if (noCol == 0) {
                    return false;
                }
            }
            this._super(node, prop, value, noCol);
        },
        _renderNodeProps: function (props = {}) {
            if (props.node) {
                this.setState(props);
            }
            this.renderNodeProps(this.ref.elementWrap.$el.find(".tplItem.active .itProps").empty());
        },
        onChangeTab: function (tabName) {
            this._super(tabName);
            const {bindSortable} = this.props;
            bindSortable(this.ref.tab.$el.find(".wTabCon"));
        },
        // renderTabLayout: function () {
        //     return false;
        // },
        reloadNodeProps: function () {
            const self = this, {getCurrentTemplate, onClickTag, getNode} = this.props, {node, el} = this.state,
                wrap = $("<div>");
            const elementWrap = new basic_widgets.ParentElNode(this,
                {
                    elNode: el,
                    template: getCurrentTemplate(),
                    getNode: getNode,
                    node: node,
                    onClickTag: onClickTag,
                });
            this.ref.elementWrap = elementWrap;
            elementWrap.appendTo(wrap).then(() => {
                if (node) {
                    self._renderNodeProps();
                }
                self.$el.find(".wPViewHead").empty().append(wrap);
            });
        },
        renderTabReport: function () {
            const {views} = this.tabs.report, el = $("<div class='wTabView'>");
            this.renderProps(false, views, el);
            return el;
        },
        renderTabComponents: function () {
            const wConComponent = $(QWeb.render("ViewStudio.View.TabComponent", {}));
            wConComponent.find('._wComCon').append(Object.keys(this.components).map((comName) => {
                    let com = Object.assign({}, this.components[comName]);
                    return QWeb.render("ViewStudio.View.TabComponent.Com", com)
                }
            ));
            return wConComponent;
        },
        onMouseEnter: function (e) {
            const {setVirtualHelper} = this.props, elHelper = $(".virtualHelper, .canHelper");
            if (!elHelper.length && !this.mouseDown) {
                setVirtualHelper($(e.currentTarget).attr("name"));
            }
        },
        onMouseDown: function (e) {
            this.mouseDown = true;
        },
        onMouseUp: function (e) {
            // console.log("ok")
        },
        onMouseLeave: function (e) {
            const {removeHelper} = this.props;
            if (!this.mouseDown) {
                removeHelper();
            }
        },
        bindAction: function () {
            this._super();
            this.$el.find("._wComItem > div[type='component']").mouseleave(this.onMouseLeave.bind(this)).mouseenter(
                this.onMouseEnter.bind(this)).mousedown(this.onMouseDown.bind(this)).mouseup(this.onMouseUp.bind(this));
        }
    });

    var ReportContent = baseEdit.ViewContent.extend({
        template: 'ViewStudio.ReportEdit',
        init: function (parent, params) {
            this._super(parent, params);
            this.viewConfig.prop = ReportProps;
            this.viewConfig.view = ReportView;
            this.nodeTemplates = {};
            this.jsonTemplates = {};
            this.sortParams.selector = [
                ["._wComTag ._wSortable:not([name='column']), main .virtualHelper, .canHelp",
                    "main .virtualHelper, main .canHelp"],
                ["._wComTag ._wSortable[name='column'], main .virtualHelper:not(td)",
                    "main .virtualHelper:not(td)"],
            ];
            this.helperInfo = {
                field: {
                    class_name: "fieldHelper",
                    tag: "span",
                    selector: "span, strong, p",
                    without: "th > *, td > *, .gridCol > *",
                    canHelp: ".wGrid .gridCol, th, td",
                    add: this.addField,
                },
                text: {
                    class_name: "textHelper",
                    tag: "span",
                    without: "th > *, td > *, .gridCol > *",
                    canHelp: ".wGrid .gridCol, th, td",
                    selector: "span, strong, p"
                },
                grid: {
                    class_name: "gridHelper",
                    tag: "div",
                    without: ".oe_structure",
                    // selector: ".header > *, .article > *, .page > *, .footer > *",
                    canHelp: ".wGrid .gridCol, .page.noChild, main > .header, main > .article, .article > .page, main > .footer",
                },
                table: {
                    class_name: "tableHelper",
                    tag: "div",
                    // selector: ".page > *",
                    canHelp: ".wGrid .gridCol, .article > .page",
                    add: this.addTable
                },
                image: {
                    class_name: "imageHelper",
                    tag: "div",
                    // selector: ".header > *, .article > *, .page > *, .footer > *, .page.noChild",
                    canHelp: ".wGrid .gridCol, main > .header, main > .article, .article > .page, main > .footer",
                    // without: ".oe_structure",
                },
                column: {
                    class_name: "columnsHelper",
                    helper: this.columnsHelper,
                    tag: "th, td",
                    selector: "table.o_main_table th, table.table-sm th, td",
                    add: this.addColumns,
                },
                hr: {
                    class_name: "lineHelper",
                    tag: "div",
                    // without: ".oe_structure",
                    canHelp: "main > .header, main > .article, .article > .page, main > .footer",
                    // selector: ".header > *, .article > *, .page > *, .footer > *",
                }
            };
        },
        prepareTemplate: function (templateId, jsonDoc) {
            const $view = this.ref.widget.$el;
            const loopChild = (childS, parentId) => {
                childS.map((child) => {
                    if (child.tag) {
                        if (parentId) {
                            child.parentId = parentId;
                        }
                        delete child.attrs.modifiers;
                        this.setNodeId(child);
                        child.$el = $view.find(`[data-oe-xpath='${child.attrs['data-oe-xpath']}']`);
                        child.$el.data('node', child);
                        if (child.children.length) {
                            loopChild(child.children, child.nodeId);
                        }
                    }
                });
            };
            loopChild([jsonDoc], false);
            this.nodeTemplates[templateId] = new DOMParser().parseFromString(this.jsonToXml(jsonDoc), 'text/xml');
            this.jsonTemplates[templateId] = jsonDoc;
            return jsonDoc;
        },
        preparePropsParams: function () {
            const res = this._super();
            res.getNode = this.getNode.bind(this);
            res.onClickTag = this.setActiveByNode.bind(this);
            res.setVirtualHelper = this.setVirtualHelper.bind(this);
            res.removeHelper = this.removeHelper.bind(this);
            res.getDataValues = this.getDataValues.bind(this);
            res.getCurrentTemplate = this.getCurrentTemplate.bind(this);
            return res;
        },
        prepareViewParams: function () {
            const res = this._super();
            res.inDOM = this.inDOM.bind(this);
            return res;
        },
        prepareDataToReset: function () {
            const {reportParams} = this.props, {id} = reportParams;
            this.nodeTemplates = {};
            this.jsonTemplates = {};
            return {values: [id]};
        },
        saveTemplate: function (reset = true) {
            const self = this, {reportParams} = this.props, {id} = reportParams;
            const data = {templates: {}, report_id: id};
            Object.keys(this.jsonTemplates).map((templateId) => {
                const jsonDoc = this.jsonTemplates[templateId];
                data.templates[templateId] = self.jsonToXml(jsonDoc);
            });
            return this['_rpc']({
                model: "report.center",
                method: 'store_template',
                args: [data],
                kwargs: {},
            }).then(() => {
                if (reset) {
                    for (const prop of Object.getOwnPropertyNames(self.nodes)) {
                        delete self.nodes[prop];
                    }
                    self.nodeTemplates = {};
                    self.jsonTemplates = {};
                }
                self.ref.widget.renderElement();
            });
        },
        loadTemplate: function (templateId) {
            const self = this, {reportParams} = this.props, {id} = reportParams;
            if (!templateId) {
                return false;
            }
            if (this.nodeTemplates[templateId]) {
                self.prepareTemplate(templateId, self.jsonTemplates[templateId]);
                return $.when([]);
            }
            return this['_rpc']({
                model: "ir.qweb",
                method: 'load_template',
                args: [templateId],
                kwargs: {context: {REPORT_ID: id, STUDIO: true}},
            }).then((arch) => {
                self.prepareTemplate(templateId, self.stringXmlToJSON(arch));
                // self.nodeTemplates[templateId] = new DOMParser().parseFromString(self.jsonToXml(jsonDoc), 'text/xml');
                // self.jsonTemplates[templateId] = jsonDoc;
            });
        },
        setActiveByNode: function (node) {
            const {xmlId} = this.state, path = this.getXPathByNode(node, xmlId);
            if (path) {
                const el = this.$el.find("[data-oe-xpath='" + path + "']");
                this.$el.find(".nodeActive").removeClass("nodeActive");
                this.setState({node: node, xmlId: xmlId, el: el, path: path});
                this.ref.viewProps._renderNodeProps({node: node, el: el, path: path});
                el.addClass("nodeActive");
            }
        },
        getXPathByNode: function (node) {
            const prepareSelector = (elm) => {
                var idx = 0, curIdx = 0, tagName = elm.tag, nodesList = (this.nodes[elm.parentId] || {}).children || [];
                nodesList.forEach((item) => {
                    if (item.tag == tagName) {
                        idx += 1;
                        if (item == elm) {
                            curIdx = idx;
                        }
                    }
                });
                return idx > 1 ? `${tagName}[${curIdx}]` : tagName;
            }
            const loop = (elm) => (!elm || !elm.tag) ? [''] : [...loop(this.nodes[elm.parentId]), prepareSelector(elm)];
            return loop(node).join('/');
        },
        getPath: function (el) {
            return el.attr("data-oe-xpath") || el.attr("path-xpath");
        },
        getElProps: function (el) {
            const isWidget = el.parents("[oe-field][data-oe-options]");
            if (isWidget.length) {
                el = $(isWidget[0]);
            }
            const xmlId = el.attr("data-oe-id"), model = el.attr("data-oe-model");
            return {
                path: this.getPath(el),
                xmlId: !model || model == "ir.ui.view" ? xmlId : false,
                el: el,
                position: el.attr("position")
            };
        },
        getCurrentTemplate: function () {
            const {xmlId} = this.props;
            return this.jsonTemplates[xmlId] || {};
        },
        getNode: function (nodeId) {
            return this.nodes[nodeId] || null;
        },
        getNodeId: function (el) {
            var {path, xmlId} = this.getElProps(el), node = this.findNode(xmlId, path);
            if (node) {
                node = [node.nodeId];
            }
            return node;
        },
        getDataValues: function (el) {
            if (!el || !el.length) {
                const {node} = this.state, viewContent = this.ref.widget;
                el = viewContent.$el.find(`[node-id='${node.parentId}']`);
                if (!el.length) {
                    el = viewContent.$el.find("main");
                }
            }
            var rawFields = el.data("oe-context"), fields = [];
            Object.keys(rawFields).map((fieldName) => {
                var field = {name: fieldName, string: fieldName}, fieldType = rawFields[fieldName],
                    fieldLabel = fieldType, model = odoo.studio.models[fieldType];
                if (model) {
                    field.relation = model.model;
                    field.type = "many2one";
                    fieldLabel = model.display_name;
                }
                field.string = `${fieldName} (${fieldLabel})`;
                fields.push(field);
            })
            return fields;
        },
        setVirtualHelper: function (type) {
            const helpInfo = this.helperInfo[type], viewEl = this.ref.widget.$el.find(".wContent"),
                {selector, without, tag, class_name, helper, canHelp} = helpInfo;
            this.removeHelper(helpInfo);
            if (helper) {
                helper.bind(this)(helpInfo);
            } else {
                const _without = viewEl.find(without).map((i, v) => $(v).data("oe-xpath")).toArray();
                viewEl.find(selector).each((idx, el) => {
                    el = $(el);
                    const {path, xmlId} = this.getElProps(el), dataValues = el.data("oe-context");
                    if (!_without.includes(path)) {
                        if (!el.prev().hasClass("virtualHelper")) {
                            el.before(this._prepareElVirtual(tag, class_name, path, xmlId, dataValues))
                        }
                        el.after(this._prepareElVirtual(tag, class_name, path, xmlId, dataValues, "after"));
                    }
                });
                if (canHelp) {
                    viewEl.find(canHelp).addClass("canHelp")
                }
            }
            this.bindSortable(this.$el);
        },
        findNode: async function (templateId, path) {
            if (!templateId) {
                return false;
            }
            if (!(templateId in this.nodeTemplates)) {
                await this.loadTemplate(templateId);
            }
            const xmlDoc = this.nodeTemplates[templateId];
            const nodeFound = xmlDoc.evaluate(path, xmlDoc, null, XPathResult.ANY_TYPE, null),
                node = nodeFound.iterateNext(), nodeId = node.getAttribute("node-id");
            return this.nodes[nodeId];
        },
        columnsHelper: function (helpInfo) {
            const viewEl = this.ref.widget.$el.find(".wContent"), {selector, notSelect, class_name} = helpInfo;
            viewEl.find(selector).not(notSelect).each((idx, el) => {
                const $el = $(el), {path, xmlId} = this.getElProps($el);
                $el.before(this._prepareElVirtual(el.tagName, class_name, path, xmlId, $el.data("oe-context")));
            });
        },
        removeHelper: function () {
            if (!this.keepHolder) {
                this.$el.removeClass("on_edit");
            }
            const viewEl = this.ref.widget.$el;
            viewEl.find(`.virtualHelper${this.keepHolder ? ":not(.active)" : ", div[type='component'][stop='true']"}`).remove();
            viewEl.find('.canHelp').removeClass('canHelp');
            // destroy all sortable
            this.$el.find(".ui-sortable").sortable("destroy");
        },
        addField: function (el, node, position) {
            const onChange = (chain) => {
                delete this.keepHolder;
                const nodeProps = {tag: "span", props: {"t-field": chain}};
                this._changeReport(false, [node.nodeId], position, nodeProps);
            };
            this._onShowChooseField(el, onChange);
        },
        addTable: function (el, node, position) {
            const onChange = (chain) => {
                delete this.keepHolder;
                const nodeProps = {tag: "table", props: {"each_data": chain}};
                this._changeReport(false, [node.nodeId], position, nodeProps);
            };
            this._onShowChooseField(el, onChange);
        },
        addColumns: async function (el, node, position = "before") {
            const elIdx = el.index(), data = {th: false, td: false}, tds = [];
            const nodeLoop = $(this.jsonToXml(el.parents("table").data("node") || {})).first();
            data.th = node.nodeId;
            el.parents("table").find("tr").each((idx, tr) => {
                const elTd = $(tr).find(`td:eq(${elIdx})`);
                if (elTd.length && !data.td) {
                    tds.push(elTd);
                }
            });
            if (tds.length) {
                const {path, xmlId} = this.getElProps(tds[0]), node = await this.findNode(xmlId, path);
                data.td = node && node.nodeId;
            }
            const {chain, as} = data.td ? this._getTableAS(this.nodes[data.td]) : {
                chain: nodeLoop.attr("t-foreach").split("."),
                as: nodeLoop.attr("t-as")
            };
            const onChange = (_chain) => {
                const spanField = this.prepareNewNode({
                    tag: "span",
                    props: {'t-field': as ? _chain.replace(chain.join("."), as) : _chain}
                });
                delete this.keepHolder;
                this.onXpathNode(false, [data.th], position, {tag: "th", content: "New Column"});
                this.onXpathNode(false, [data.td], position, {tag: "td", children: [spanField]});
            };
            this._onShowChooseField(el, onChange, chain);
        },
        getHolderTemplate: function (type, tag) {
            const virtualTemplate = {column: "Studio.virtual.column"};
            if (tag in virtualTemplate) {
                return virtualTemplate[tag];
            }
            return this._super(type, tag);
        },
        replaceHolder: function (elHolder, elItem, type) {
            this._setVirtualActive(elHolder, type);
            const virtualTem = this.getHolderTemplate(false, type),
                template = virtualTem ? QWeb.render(virtualTem, {}) : elItem.html();
            elHolder.removeClass("itSort").html(template);
        },
        _onClickTag: async function (elNode) {
            var {path, xmlId, el} = this.getElProps(elNode);
            if (!xmlId) {
                return false;
            }
            await this.loadTemplate(xmlId);
            const node = await this.findNode(xmlId, path);
            this.$el.find(".nodeActive").removeClass("nodeActive");
            this.setState({node: node, xmlId: xmlId, el: el, path: path});
            this.ref.viewProps.setNodeActive(node, el, path);
            el.addClass("nodeActive");
        },
        _prepareElVirtual: function (tag, className, path, xmlId, data = {}, position = "before") {
            const elVirtual = $('<' + tag + ' class="virtualHelper ' + className + '" data-oe-xpath="' + path + '" data-oe-id="' + xmlId + '"  position="' + position + '"></' + tag + '>');
            elVirtual.data("oe-context", data);
            return elVirtual;
        },
        _onShowChooseField: function (el, onChange, value = []) {
            const onClose = () => {
                delete this.keepHolder;
                this.removeHelper();
            }
            const _onChange = (chain) => {
                onChange(chain);
                this.saveTemplate();
                this.removeHelper();
            }
            const chooseFieldDialog = new basic_widgets.ChooseFieldDialog(this, {
                name: "choose_field",
                fields: this.getDataValues(el),
                onChange: _onChange,
                onClose: onClose,
                value: value,
            });
            chooseFieldDialog.renderElement();
        },
        _getTableAS: function (node) {
            const _getNode = (_node) => {
                if (_node.attrs["t-foreach"] && _node.attrs["t-as"]) {
                    return _node;
                }
                const parentNode = this.nodes[_node.parentId];
                if (!parentNode) {
                    return null;
                }
                return _getNode(parentNode);
            }
            const nodeResult = _getNode(node);
            if (!nodeResult) {
                return [];
            }
            return {chain: nodeResult.attrs['t-foreach'].split("."), as: nodeResult.attrs["t-as"]};
        },
        _setVirtualActive: function (elHolder, type) {
            $(".virtualHelper, .canHelp").removeClass("active");
            const elVirtual = elHolder.parents(".virtualHelper, .canHelp");
            elVirtual.addClass("active");
            if (type == "column") {
                const virtualIdx = elVirtual.index();
                elVirtual.parents("table").find("tr").each((idx, tr) => {
                    $(tr).find(`td:eq(${virtualIdx})`).addClass("active");
                });
            }
        },
        inDOM: async function () {
            var {node} = this.state, $view = this.ref.widget.$el;
            if (node) {
                var el = $view.find(`[node-id='${node.nodeId}']`), {path, xmlId} = this.getElProps(el),
                    node = await this.findNode(xmlId, path);
                el = el.length ? el : null;
                this.setState({node: node, xmlId: xmlId, el: el, path: path});
                this.ref.viewProps.setNodeActive(node, el, path);
            }
            this.bindStyle();
        },
        onCopyNode: function (nodeId) {
            const node = this._copyNode(nodeId);
            this._changeReport(false, [nodeId], "before", {node: node}, true);
        },
        onRemoveNode: function (nodeIds) {
            this._changeReport(nodeIds, false, "replace", {}, true);
        },
        onClickNode: async function (e) {
            e.stopPropagation();
            e.stopImmediatePropagation();
            this._onClickTag($(e.currentTarget));
        },
        onChangeProp: function (node) {
            return this.saveTemplate(false);
        },
        _changeReport: function (idSelf, idXpath, position = "before", props, save = false) {
            if (idSelf || idXpath) {
                const nodeSelf = this.onXpathNode(idSelf, idXpath, position, props);
                if (nodeSelf && nodeSelf.length) {
                    this.setState({node: nodeSelf[0]});
                }
            }
            if (save) {
                this.saveTemplate();
            }
        },
        onStartSort: function (event, ui) {
            this.$el.addClass("on_edit");
        },
        onStopSort: async function (event, ui) {
            var item = ui.item, name = item.attr("name");
            this.ref.viewProps.mouseDown = false;
            if (item.parents(".viewView").length) {
                ui.item.attr("stop", true);
                this.replaceHolder(ui.item, ui.item, name);
                this.keepHolder = ["column", "field", "table"].includes(name);
                var elXpath = item.parent(), position = null;
                if (elXpath.hasClass("canHelp")) {
                    position = "append";
                    if (item.next().length) {
                        elXpath = item.next();
                        position = "before";
                    }
                }
                var elData = this.getElProps(elXpath), {path, xmlId} = elData, node = await this.findNode(xmlId, path);
                position = position || elData.position;
                if (node) {
                    const {add} = this.helperInfo[name];
                    if (add) {
                        add.bind(this)(elXpath, node, position);
                    } else {
                        this._changeReport(false, [node.nodeId], position, {
                            tag: name,
                            props: {'studio-type': name, needCol: true}
                        }, true)
                    }
                }
            }
            this.removeHelper();
            this.ref.viewProps.ref.tab.reload();
        },
        onChangeSort: function (event, ui) {
            const name = ui.item.attr("name");
            if (ui.placeholder.parents(".wReportView").length) {
                ui.placeholder.attr("name", name);
                this.replaceHolder(ui.placeholder, ui.item, name);
            }
        },
        _showArea: function (toggle = false) {
            var localStorage = window.localStorage, elWrap = this.$el.find(".wContent"),
                show = localStorage.getItem('show_area');
            if (toggle) {
                show ? localStorage.removeItem('show_area') : localStorage.setItem('show_area', "yes");
            }
            show = localStorage.getItem('show_area');
            elWrap[show ? 'addClass' : 'removeClass']("show_area");
        },
        onShowArea: function () {
            this._showArea(true);
        },
        bindAction: function () {
            this._super();
            this.$el.find("[data-oe-xpath]:not([no-node-id]), [node-id]:not([no-node-id])").click(this.onClickNode.bind(this));
            this.$el.find(".wContent").unbind('click').click(this.onShowArea.bind(this));
        },
        bindStyle: function () {
            this._super();
            this._showArea();
        }
    });

    return ReportContent;

});
