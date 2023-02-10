odoo.define('dynamic_odoo.tree', function (require) {
    "use strict";

    var ListView = require('web.ListView');
    var ListRenderer = require('web.ListRenderer');
    var ListController = require('web.ListController');
    var basic_fields = require('dynamic_odoo.basic_fields');
    var baseEdit = require('dynamic_odoo.views_edit_base');
    var basic_widgets = require('dynamic_odoo.basic_widgets');
    var Domain = require('web.Domain');


    var ListEditRenderer = ListRenderer.extend({
        init: function (parent, state, params) {
            this._super(parent, state, params);
            this.props = params;
            const {setNodeId, arch} = this.props;
            if (setNodeId) {
                setNodeId(arch);
            }
        },
        _getOptionalColumnsStorageKeyParts: function () {
            const self = this, {fieldsInfo, fields} = this.state, columns = [];
            Object.keys(fieldsInfo[self.viewType]).map((fieldName) => {
                const fieldInfo = fieldsInfo[self.viewType][fieldName];
                if (!fieldInfo.willShow) {
                    columns.push({name: fieldName, type: fields[fieldName].type});
                    Object.keys(fieldInfo.fieldDependencies || {}).map((fName) => {
                        const fieldDepend = fieldInfo.fieldDependencies[fName];
                        columns.push({name: fName, type: fieldDepend.type});
                    });
                }
            });
            return {
                fields: columns
            }
        },
        _hasContent: function () {
            return true;
        },
        checkVirtualVisible: function (el, node) {
            const {fieldsVisibleVirtual} = this.props;
            if (fieldsVisibleVirtual.includes(node.attrs.name)) {
                el.addClass("visibleVT");
            }
        },
        _onRowClicked: function () {
        },
        _renderEmptyRow: function () {
            var n = this.columns.length, $tr = $('<tr>');
            n = this.hasSelectors ? n + 1 : n;
            while (n > 0) {
                n -= 1;
                $tr.append($('<td>&nbsp;</td>'));
            }
            return $tr;
        },
        _hasVisibleRecords: function (list) {
            return true;
        },
        _renderView: function () {
            const self = this;
            return this._super().then(() => {
                self.trigger_up("bindAction");
            });
        },
        _renderBodyCell: function (record, node, colIndex, options) {
            const res = this._super(record, node, colIndex, options);
            this.checkVirtualVisible(res, node);
            return res;
        },
        _renderHeaderCell: function (node) {
            const {setNodeId, arch} = this.props;
            setNodeId(node);
            node.parentId = arch.nodeId;
            const res = this._super(node);
            res.attr("node-id", node.nodeId);
            this.checkVirtualVisible(res, node);
            return res;
        },
    });

    var ListEditController = ListController.extend({
        init: function (parent, model, renderer, params) {
            this._super(parent, model, renderer, params);
            this.ref = {view: params.view};
        },
        _pushState: function () {
        }
    });

    var ListEditView = ListView.extend({
        config: _.extend({}, ListView.prototype.config, {
            Renderer: ListEditRenderer,
            Controller: ListEditController,
        }),
        init: function (viewInfo, params) {
            params.noContentHelp = false;
            const {limit} = viewInfo.arch.attrs, fieldsVisibleVirtual = this.prepareVisibleVirtual(viewInfo);
            this._super(viewInfo, params);
            const {onClickNode, setNodeId} = params;
            this.config.Renderer = ListEditRenderer;
            this.rendererParams.onClickNode = onClickNode;
            this.rendererParams.setNodeId = setNodeId;
            this.rendererParams.fieldsVisibleVirtual = fieldsVisibleVirtual;
            this.loadParams.limit = parseInt(limit || 5);
            this.controllerParams.view = this;
            if ('_static' in params) {
                this.loadParams.static = true;
            }
        },
        prepareVisibleVirtual: function (viewInfo) {
            const {show_invisible} = viewInfo.arch.attrs, fieldsVisibleVirtual = [];
            if ([1, '1', true, 'true', 'True'].includes(show_invisible)) {
                viewInfo.arch.children.map((node) => {
                    if (node.tag == "field") {
                        const {column_invisible, invisible} = node.attrs.modifiers || {};
                        if ((column_invisible || invisible) && String((column_invisible || invisible || "")).indexOf("[") < 0) {
                            node.attrs.modifiers.column_invisible = false;
                            node.attrs.modifiers.invisible = false;
                            node.attrs.virtual_invisible = true;
                            fieldsVisibleVirtual.push(node.attrs.name);
                        }
                    }
                });
            }
            return fieldsVisibleVirtual;
        }
    });

    var ListProps = baseEdit.ViewProps.extend({
        init: function (parent, props) {
            this._super(parent, props);
            const {parentView, viewInfo} = this.props, {fields, model} = viewInfo;
            this.nodeProps.color = {
                name: 'color',
                valType: "string",
                label: 'Record Color',
                notPreVal: true,
                prepareProps: this.prepareColor.bind(this),
                propChange: this.onChangeColor.bind(this),
                props: {model: model},
                widget: basic_widgets.RecordColor,
            };
            this.nodeProps.search_advance = {
                name: 'search_advance',
                valType: "boolean",
                label: 'Search In Tree',
                widget: basic_fields.ToggleSwitch
            };
            this.nodeProps.editable = {
                name: 'editable',
                valType: "boolean",
                label: 'Editable',
                del: true,
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
                propChange: this.onChangeSort.bind(this),
                widget: basic_fields.ChooseField,
                fields: fields,
                classes: "tSort"
            };
            this.nodeProps.sort_order = {
                name: 'sort_order', valType: "string", label: 'Sort Order', widget: basic_fields.Selection,
                propChange: this.onChangeSort.bind(this),
                options: [{label: 'Ascending', value: 'asc'}, {label: 'Descending', value: 'desc'}], classes: "tOrder"
            };
            this.nodeProps.invisible.propChange = this.onChangeInvisible.bind(this);
            this.viewPropsView = ["editable", "create", "delete", "search_advance", "show_invisible", {
                view: ["sort", "sort_order", "limit"],
                classes: "ggSTree"
            }, "color"];
            this.nodePropsView = ["required", "invisible", "readonly", "string", "widget", "groups", "more"];
            if (parentView) {
                // don't use search advance in Sub View
                this.viewPropsView.splice(3, 1);
            }
        },
        initParams: function () {
            this._super();
            this.tabs.fields = {label: "Fields", render: this.renderFieldsExist.bind(this), name: "fields"};
        },
        prepareColor: function (node, nodeProps) {
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
            nodeProps.value = data;
        },
        onChangeInvisible: function (node, prop, value) {
            if (node.attrs.virtual_invisible) {
                delete node.attrs.modifiers.invisible;
                delete node.attrs.modifiers.column_invisible;
                delete node.attrs.virtual_invisible;
            }
            this.modifierChange(node, prop, value);
            if (String(value).indexOf("[") < 0) {
                node.attrs.modifiers.column_invisible = value == 1;
            }
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
        onChangeSort: function (node, prop, value) {
            node.attrs[prop.name] = value;
            var sortOrder = node.attrs["sort_order"], sortBy = node.attrs["sort"];
            if (prop.name == "sort_order") {
                sortOrder = value;
            } else if (prop.name == "sort") {
                sortBy = value;
            }
            if (sortBy) {
                node.attrs["default_order"] = `${sortBy} ${sortOrder || "asc"}`;
            }
        },
        onChangeTab: function (tabName) {
            this._super(tabName);
            if (tabName == "fields") {
                const {bindSortable} = this.props;
                bindSortable(this.ref.tab.$el.find(".wTabFields"));
            }
        }
    });

    var ListEditContent = baseEdit.ViewContent.extend({
        custom_events: _.extend({}, baseEdit.ViewContent.prototype.custom_events, {
            bindAction: 'bindAction',
        }),
        template: 'ViewStudio.View.Tree',
        isLegacy: true,
        init: function (parent, params) {
            this._super(parent, params);
            this.viewConfig.prop = ListProps;
            this.viewConfig.view = ListEditView;
            this.sortParams.selector = [["thead > tr, ._wSortable", "thead > tr:not(.searchAdvance)"]];
            this.sortParams.tolerance = "intersect";
            this.sortParams.placeholder = {
                element: () => document.createElement("TH"),
                update: () => {
                },
            };
        },
        prepareFieldView: function (nodes) {
            const {viewInfo} = this.props, {viewFields, fieldsGet, fields} = viewInfo;
            nodes.map((_node) => {
                const fieldName = _node.attrs.name;
                if (_node.tag == "field" && !viewFields[fieldName]) {
                    if (!fields[fieldName]) {
                        fields[fieldName] = fieldsGet[fieldName];
                    }
                    this.ref.widget.ref.view._processNode(_node, viewInfo);
                }
            });
        },
        bindStyle: function () {
            this._super();
            const {node} = this.state;
            this.$el.find(".elActive").toggleClass("elActive");
            if (node) {
                const {nodeId} = node;
                this.$el.find(`[node-id='${nodeId}']`).addClass("elActive");
            }
        },
        removeVirtualVisible: function () {
            const {viewInfo} = this.props;
            viewInfo.arch.children.map((node) => {
                if (node.tag == "field" && node.attrs.virtual_invisible) {
                    node.attrs.modifiers.column_invisible = true;
                    node.attrs.modifiers.invisible = true;
                    delete node.attrs.virtual_invisible
                }
            });
        },
        onChangeProp: function (node) {
            this.removeVirtualVisible();
            this._super(node);
        },
        onClickNode: function (node) {
            this._super(node);
            this.bindStyle();
        },
        onStartSort: function (event, ui) {
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
        onStopSort: function (event, ui) {
            var item = ui.item.removeClass("uiSort-item"), nodeId = this.getNodeId(item.next()),
                fieldName = item.attr("name"), position = "before";
            if (item.parents(".o_list_table").length) {
                if (!nodeId.length) {
                    const parentEl = $(item.parents("[node-id]")[0]);
                    nodeId = this.getNodeId(parentEl);
                    position = "append";
                }
                this.prepareFieldView(this.onXpathNode(this.getNodeId(item), nodeId, position, {
                    tag: "field",
                    props: {name: fieldName}
                }));
                this.renderViewContent();
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
            const renderer = this.ref.widget.renderer, newColumn = ui.item.hasClass("item");
            if (ui.placeholder.parents(".o_list_table").length) {
                const table = ui.placeholder.parents("table"), rootIndex = ui.helper.attr("index"),
                    newIndex = ui.placeholder.index();
                this.columnsVirtual(table, newIndex, rootIndex, newColumn);
                this.$el.find(".colRoot").addClass("notBg");
                if (newColumn) {
                    renderer.columns = renderer.columns.filter((field) => field.attrs.name !== 'fieldVirtual');
                    renderer.columns.push(this.nodeStore.newField({props: {name: 'fieldVirtual'}}));
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
