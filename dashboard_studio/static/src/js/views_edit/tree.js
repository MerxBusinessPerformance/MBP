odoo.define('dashboard_studio.tree', function (require) {
    "use strict";

    var core = require('web.core');
    var Domain = require('web.Domain');
    var QWeb = core.qweb;
    var base = require("dashboard_studio.base");
    var ListView = require('web.ListView');
    var ListRenderer = require('web.ListRenderer');
    var basic_fields = require('dashboard_studio.basic_fields');
    var baseEdit = require('dashboard_studio.views_edit_base');
    var basic_widgets = require('dashboard_studio.basic_widgets');

    ListView.include(   {
        init: function (viewInfo, params) {
            const {fromEdit, fromDashboard} = params;
            if (fromEdit) {
                const {limit, domain} = this.getViewInfoParams(viewInfo);
                params.limit = parseInt(limit);
                if (!limit && !fromDashboard) {
                    params.limit = 5;
                }
                params.domain = Domain.prototype.stringToArray(domain);
            }
            this._super(viewInfo, params);
        },
        getViewInfoParams: function (viewInfo) {
            const arch = typeof(viewInfo.arch) == "string" ? $(viewInfo.arch) : viewInfo.arch;
            const getProp = (prop) => (arch.attrs ? arch.attrs[prop] : arch.attr(prop));
            return {
                limit: getProp("limit"),
                domain: getProp("filter") || '[]',
            }
        },
    });

    var ListEditRenderer = ListRenderer.extend({
        events: {
            'click thead th.o_column_sortable': 'onClickNode',
        },
        init: function (parent, state, params) {
            this._super(parent, state, params);
            this.props = params;
        },
        _onRowClicked: function () {
        },
        onClickNode: function (e, node) {
            const {onClickNode} = this.props;
            e.stopPropagation();
            if (onClickNode) {
                onClickNode(node)
            }
        },
        _renderHeaderCell: function (node) {
            const {setNodeId, arch} = this.props;
            setNodeId(node);
            node.parentId = arch.nodeId;
            const res = this._super(node);
            res.attr("node-id", node.nodeId);
            res.click((e) => this.onClickNode.bind(this)(e, node));
            return res;
        },
    });

    var ListEditView = ListView.extend({
        config: _.extend({}, ListView.prototype.config, {
            Renderer: ListEditRenderer,
            // Controller: ListEditController,
        }),
        init: function (viewInfo, params) {
            const {onClickNode, setNodeId, fromEdit} = params;
            const {limit, domain} = this.getViewInfoParams(viewInfo);
            params.limit = parseInt(limit);
            params.domain = Domain.prototype.stringToArray(domain);
            this._super(viewInfo, params);
            this.config.Renderer = ListEditRenderer;
            this.rendererParams.onClickNode = onClickNode;
            this.rendererParams.setNodeId = setNodeId;
            this.rendererParams.fromEdit = fromEdit;
            this.loadParams.fromEdit = fromEdit;
        },
        getViewInfoParams: function (viewInfo) {
            const arch = typeof(viewInfo.arch) == "string" ? $(viewInfo.arch) : viewInfo.arch;
            const getProp = (prop) => (arch.attrs ? arch.attrs[prop] : arch.attr(prop));
            return {
                limit: getProp("limit") || 5,
                domain: getProp("filter") || '[]',
            }
        },
    });

    var ListSQL = base.WidgetBase.extend({
        template: "DashboardStudio.ListSQL",
        init: function (parent, params) {
            this._super(parent, params);
            const {viewInfo} = this.props;
            const query = viewInfo.arch.attrs.query || "";
            this.state = {header: [], data: [], oldQuery: query, query: query};
            this.onLoad();
        },
        onLoad: async function () {
            var {query} = this.state, res = [];
            if (query.trim().length) {
                res = await this['_rpc']({
                    model: "view.center",
                    method: 'load_query',
                    args: [query],
                    kwargs: {},
                });
            }
            this.setState({
                header: res.length ? Object.keys(res[0]).map((label) => this.capitalize(label)) : [],
                body: res.length ? res.map((d) => Object.values(d)) : [],
            });
            this.renderElement();
        },
        onKeyUp: function (e) {
            const value = $(e.currentTarget).val(), {viewInfo} = this.props;
            this.setState({query: value});
            if (e.keyCode == 13) {
                viewInfo.arch.attrs.query = value;
                this.setState({oldQuery: value});
                this.onLoad();
            }
            this.bindStyle();
        },
        bindAction: function () {
            this._super();
            this.$el.find("textarea").keyup(this.onKeyUp.bind(this));
        },
        bindStyle: function () {
            const {oldQuery, query} = this.state;
            this.$el.find("textarea")[oldQuery != query ? "addClass" : "removeClass"]("valDiff");
            this._super();
        },
    });

    ListSQL.isSimple = true;

    var ListProps = baseEdit.ViewProps.extend({
        init: function (parent, props) {
            this._super(parent, props);
            const {fields, model, arch} = this.props.viewInfo;
            this.nodeProps.color = {
                name: 'color',
                valType: "string",
                label: 'Record Color',
                // widget: basic_widgets.RecordColor,
                // prepareProps: this.prepareColor.bind(this),
                // propChange: this.onChangeColor.bind(this),
                props: {model: model},
                widget: basic_widgets.RecordColor,
            };
            this.nodeProps.editable = {
                name: 'editable',
                valType: "boolean",
                label: 'Editable',
                widget: basic_fields.Radio
            };
            this.nodeProps.limit = {
                name: 'limit',
                valType: "integer",
                label: 'Limit',
                widget: basic_fields.Input,
                classes: "tLimit"
            };
            this.nodeProps.filter = {
                name: 'filter',
                valType: "string",
                label: 'Filter',
                widget: basic_widgets.ButtonDomain,
                props: {model: model}
            };
            this.nodeProps.sort = {
                name: 'sort',
                valType: "string",
                label: 'Sort By',
                widget: basic_fields.ChooseField,
                fields: fields,
                classes: "tSort"
            };
            this.nodeProps.sql = {
                name: "sql",
                valType: "bool",
                label: "Use Sql Query",
                widget: basic_fields.ToggleSwitch,
            };
            this.nodeProps.sort_order = {
                name: 'sort_order', valType: "string", label: 'Sort Order', widget: basic_fields.Selection,
                options: [{label: 'Ascending', value: 'asc'}, {label: 'Descending', value: 'desc'}], classes: "tOrder"
            };
            this.nodePropsView = ["string"];
            // this.viewPropsView = ((arch.attrs || {}).sql || false) ? ["sql"] : ["sql", "filter", "sort", "sort_order", "limit", "color"];
            // this.viewPropsView = ["filter", "editable", "create", "delete", "sort", "sort_order", "limit", "color"];
            if ((arch.attrs || {}).sql || false) {
                this.viewPropsView = ["sql"];
            } else {
                this.viewPropsView = ["sort", "sort_order", "limit", "filter", "color"];
                this.tabs.fields = {label: "Fields", render: this.renderFieldsExist.bind(this), name: "fields"};
            }
            // this.nodePropsView = ["required", "invisible", "readonly", "string", "widget", "groups"];
        },
        onChangeProp: function (node, prop, value) {
            const {onChangeProp, onChangeQuery, onQuery} = this.props;
            if (prop.name == "sql") {
                value ? node.attrs.sql = value : delete node.attrs.sql;
                onChangeQuery(value);
                return onChangeProp(node, true);
            }
            if (prop.name == "query") {
                return onQuery();
            }
            if (["sort", "sort_order"].includes(prop.name)) {
                var sortOrder = node.attrs["sort_order"], sortBy = node.attrs["sort"];
                if (prop.name == "sort_order") {
                    sortOrder = value;
                } else if (prop.name == "sort") {
                    sortBy = value;
                }
                if (sortBy) {
                    node.attrs["default_order"] = `${sortBy} ${sortOrder || "asc"}`;
                }
            }
            if (prop.name == "color") {
                return this.onChangeColor(node, prop, value);
            }
            this._super(node, prop, value);
        },
        onChangeColor: function (node, prop, data) {
            const {onChangeProp} = this.props;
            var domain = Domain.prototype.stringToArray(data.value);
            if (!domain.length) {
                delete node.attrs[data.name];
            } else {
                domain = Domain.prototype.domainToCondition(domain);
                node.attrs[data.name] = domain;
            }
            if (onChangeProp) {
                onChangeProp(node);
            }
        },
        prepareLineColor: function (node) {
            const colors = ["decoration-danger", "decoration-warning",
                "decoration-success", "decoration-primary", "decoration-info",
                "decoration-muted", "decoration-bf",
                "decoration-it"], data = {};
            colors.map((color) => {
                const propColor = node.attrs[color];
                if (propColor) {
                    data[color] = Domain.prototype.arrayToString(Domain.prototype.conditionToDomain(propColor));
                }
            });
            return data;
        },
        prepareParamsProp: function (node, viewPropsView) {
            const propsProp = this._super(node, viewPropsView);
            if (viewPropsView.includes("color")) {
                propsProp.color.value = this.prepareLineColor(node);
            }
            return propsProp;
        },
        onChangeTab: function (tabName) {
            this._super(tabName);
            if (tabName == "fields") {
                const {bindSortable} = this.props;
                bindSortable(this.ref.tab.$el.find(".wTabFields"));
            }
        },
        bindAction: function () {
            this._super();
            this.$el.find("._ipSearch").keyup(this.onSearchField.bind(this));
        },
        onSearchField: function (e) {
            e.stopPropagation();
            e.stopImmediatePropagation();
            const $el = $(e.currentTarget), value = $el.val(), {fields} = this.prepareDataTabFields(value);
            this.ref.tab.$el.find('.wFields').empty().append(Object.values(fields).map((field) => {
                return QWeb.render("DashboardStudio.Tree.TabFields.item", {field: field, fieldName: field.name});
            }));
            this.bindAction();
        },
        prepareDataTabFields: function (search) {
            const {viewInfo} = this.props, fieldsInfo = viewInfo.fieldsInfo[viewInfo.type], {fields} = viewInfo,
                fieldsAp = {};
            Object.keys(fields).map((fieldName) => {
                const field = fields[fieldName], fieldNode = fieldsInfo[fieldName] || {};
                if ((!(fieldName in fieldsInfo) || fieldNode.willShow) && field.string.includes(search)) {
                    fieldsAp[fieldName] = Object.assign({name: fieldName}, field);
                }
            });
            return {fields: fieldsAp};
        },
        renderFieldsExist: function (search = "") {
            const {fields} = this.prepareDataTabFields(search);
            return QWeb.render("DashboardStudio.Tree.TabFields", {fields: fields});
        },
    });

    var ListEditContent = baseEdit.ViewContent.extend({
        template: 'DashboardStudio.View.Tree',
        init: function (parent, params) {
            this._super(parent, params);
            const {viewInfo} = this.props;
            this.viewConfig.prop = ListProps;
            this.viewConfig.view = viewInfo.arch.attrs.sql ? ListSQL : ListEditView;
            // this.onChangeQuery(viewInfo.arch.attrs.sql);
            this.sortParams.selector = [["t-head > tr, ._wSortable", "t-head > tr"]];
            this.sortParams.placeholder = {
                element: () => document.createElement("TH"),
                update: () => {
                },
            };
        },
        preparePropsParams: function () {
            const res = this._super();
            // res.onQuery = this.onQuery.bind(this);
            res.onChangeQuery = this.onChangeQuery.bind(this);
            return res;
        },
        onChangeQuery: function (query) {
            this.viewConfig.view = query ? ListSQL : ListEditView;
            if (!query) {
                this.props.viewInfo.arch = this.jsonToXml();
                this.props.viewInfo = this._processFieldsView();
            }
        },
        renderViewContent: function () {
            if (this.viewConfig.view.isSimple) {
                const self = this, {viewInfo} = this.props;
                const viewView = new this.viewConfig.view(this, {...this.prepareViewParams(), viewInfo: viewInfo});
                viewView.appendTo(self.$el.find(".viewView").addClass("treeSql").empty())
            } else {
                this._super();
            }
        },
        onRemoveNode: function (node) {
            const {viewInfo} = this.props, {arch} = viewInfo, archChild = arch.children;
            if (node && node.nodeId) {
                const nodeIdx = archChild.findIndex((child) => child.nodeId == node.nodeId);
                archChild.splice(nodeIdx, 1);
                return this.renderView();
            }
        },
        onXpathNode: function (nodeId, nodeXpathId, position, params = {}) {
            const {viewInfo} = this.props, {arch} = viewInfo, archChild = arch.children;
            var node = null;
            if (nodeId) {
                const nodeIdx = archChild.findIndex((child) => child.nodeId == nodeId);
                node = archChild[nodeIdx];
                archChild.splice(nodeIdx, 1);
            }
            node = node || this.prepareNewField(params);
            if (!nodeXpathId) {
                archChild.push(node);
                return this.renderViewContent();
            }
            const nodeIdx = archChild.findIndex((child) => child.nodeId == nodeXpathId);
            if (nodeIdx >= 0) {
                archChild.splice(nodeIdx, 0, node);
                this.renderViewContent();
            }
        },
        onStartSort: function (ui) {
            const width = ui.item.css("width"), minWidth = ui.item.css("min-width"),
                newColumn = ui.item.hasClass("item");
            ui.placeholder.addClass("uiSort-placeholder").css({
                width: width,
                minWidth: minWidth,
                visibility: 'inherit'
            }).attr({'data-name': 'fieldVirtual'}).text(ui.item.text());
            ui.helper.attr({index: ui.item.index()}); // old
            this.columnsVirtual(ui.item.parents("table"), ui.helper.index(), ui.helper.attr("index"), newColumn);
            this.$el.find(".sortVirtual").addClass("notBg");
            ui.item.addClass("uiSort-item");
        },
        onStopSort: function (ui) {
            const item = ui.item.removeClass("uiSort-item"), nodeId = item.next().attr("node-id"),
                fieldName = item.attr("name");
            if (item.parents(".o_list_table").length) {
                this.onXpathNode(item.attr("node-id"), nodeId, nodeId ? "before" : "append", {fieldName: fieldName});
            }
        },
        onBeforeStop: function (ui) {
            if (ui.item.parents(".o_list_table").length) {
                ui.item.parents("table").find(".colRoot").remove();
                ui.item.parents("table").find(".sortVirtual").removeClass("sortVirtual");
                ui.placeholder.css({display: "none"});
            }
        },
        onChangeSort: function (ui) {
            const renderer = this.ref.viewContent.renderer, newColumn = ui.item.hasClass("item");
            if (ui.placeholder.parents(".o_list_table").length) {
                const table = ui.placeholder.parents("table"), rootIndex = ui.helper.attr("index"),
                    newIndex = ui.placeholder.index();
                this.columnsVirtual(table, newIndex, rootIndex, newColumn);
                this.$el.find(".colRoot").addClass("notBg");
                if (newColumn) {
                    renderer.columns = renderer.columns.filter((field) => field.attrs.name !== 'fieldVirtual');
                    renderer.columns.push(this.prepareNewField({fieldName: 'fieldVirtual'}));
                    renderer['_freezeColumnWidths']();
                }
            }
        },
        columnsVirtual: function (table, index, rootIdx, newColumn = false) {
            var position = "before";
            table.find(".sortVirtual").remove();
            table.find(".colRoot").removeClass("colRoot notBg");
            table.find("tr").each((idx, el) => {
                var el = $(el), tag = el.hasClass("searchAdvance") ? "th" : "td",
                    elTd = el.find(tag), _index = index, tdSize = elTd.length,
                    sortVirtual = $(`<${tag} class="sortVirtual">`);
                if (0 < tdSize && tdSize <= index) {
                    _index = tdSize - 1;
                    position = "after";
                }
                if (newColumn) {
                    el.find(tag).eq(_index)[position](sortVirtual);
                } else {
                    var colRoot = elTd[rootIdx];
                    elTd = el.find(tag).eq(_index);
                    if (colRoot) {
                        colRoot = $(colRoot);
                        sortVirtual.addClass(colRoot.attr('class'));
                        tag == "th" ? sortVirtual.html(colRoot.html()) : sortVirtual.text(colRoot.text());
                        colRoot.addClass("colRoot");
                        elTd[position](sortVirtual);
                    }
                }
            });
        },
    });

    return ListEditContent;

});
