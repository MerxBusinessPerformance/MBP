odoo.define('dynamic_odoo.search', function (require) {
    "use strict";

    var core = require('web.core');
    var QWeb = core.qweb;
    var baseEdit = require('dynamic_odoo.views_edit_base');
    var basic_widgets = require('dynamic_odoo.basic_widgets');
    var pyUtils = require('web.py_utils');
    var base = require("dynamic_odoo.base");


    var SearchViewEdit = base.WidgetBase.extend({
        template: "ViewStudio.SearchView",
        init: function (viewInfo, params) {
            this._super(viewInfo, params);
            const {fields, arch} = viewInfo;
            this.viewInfo = viewInfo;
            this.fields = fields;
            this.data = this._parseSearchArch(arch);
        },
        _evalArchChild: function (child, parentId) {
            const {setNodeId} = this.props;
            setNodeId(child);
            child.type = child.tag;
            if (parentId) {
                child.parentId = parentId;
            }
            if (child.attrs.context) {
                try {
                    var context = pyUtils.eval('context', child.attrs.context);
                    if (context.group_by) {
                        child.type = 'groupBy';
                        child.fieldName = context.group_by.split(':')[0];
                    }
                } catch (e) {
                }
            }
            return child;
        },
        _parseSearchArch: function (arch) {
            const {setNodeId} = this.props, self = this;
            setNodeId(arch);
            const preFilters = _.flatten(arch.children.filter((child) => child.tag !== 'search_panel'.replace("_", "")).map((child, idx) => {
                child.parentId = arch.nodeId;
                child.index = idx;
                if (child.tag !== 'group') {
                    return self._evalArchChild(child);
                }
                setNodeId(child);
                return child.children.map((_child, _idx) => {
                    _child.index = _idx;
                    return self._evalArchChild(_child, child.nodeId);
                });
            }));
            var result = {field: [], filter: [], groupBy: []}, prevTag = null;
            preFilters.push({tag: 'separator', type: 'separator'});
            _.each(preFilters, function (preFilter) {
                const {type} = preFilter || {};

                if (type in result) {
                    const {fieldName} = preFilter, {string, name, modifiers} = preFilter.attrs || {};
                    if (!["true", "True", "1", true, 1].includes((modifiers || {}).invisible)) {
                        preFilter.attrs.string = string || ((self.fields[(name || fieldName)] || {}).string || "No String");
                        result[type].push(preFilter);
                        prevTag = type;
                    }

                } else if (["separator"].includes(type) && ["filter"].includes(prevTag)) {
                    result[prevTag].push(preFilter);
                }

            });
            return result;
        },
        renderView: function () {
            const self = this, {filter, groupBy, field} = this.data,
                wCls = [[".wFCon", filter], [".wGCon", groupBy], [".wACon", field]];
            wCls.map((wcl) => {
                var cl = wcl[0], data = wcl[1], lastIndex = -1, parentId = -1;
                if (data && data.length) {
                    var idxCheck = data.length - 1;
                    parentId = data[0].parentId;
                    while (lastIndex < 0) {
                        const lastIdx = data[idxCheck].index;
                        if (lastIdx >= 0) {
                            lastIndex = lastIdx;
                        }
                        if (idxCheck > 0) {
                            idxCheck -= 1;
                        }
                    }
                }
                const el = QWeb.render("ViewStudio.SearchView.items", {
                    items: data || [],
                    lastIndex: lastIndex,
                    parentId: parentId
                });
                self.$el.find(cl).empty().append(el);
            });
        }
    });
    SearchViewEdit.isSimple = true;

    var ListProps = baseEdit.ViewProps.extend({
        init: function (parent, props) {
            this._super(parent, props);
            const {model} = this.props.viewInfo;
            this.nodeProps.more.props = {noEdit: true};
            this.nodeProps.domain = {
                name: 'domain',
                valType: "string",
                label: 'Domain',
                widget: basic_widgets.ButtonDomain,
                props: {kind: "input", model: model}
            };
            this.nodeProps.choose_field = {
                name: 'choose_field',
                valType: "string",
                label: 'Choose Field',
                propChange: this.onChangeChooseField.bind(this),
                widget: basic_widgets.ChooseField,
                props: {model: model}
            };
            this.state.tab = "component";
            this.nodeViews.filter = {view: this.prepareView.bind(this)};
            this.nodeViews.field = {view: this.prepareView.bind(this)};
            this.nodeViews.separator = {view: ["more"]};
        },
        initParams: function () {
            this._super();
            this.tabs = {component: {label: "Components", render: this.renderComponent.bind(this), name: "component"}};
            this.components = [{
                label: "Filters",
                name: "filters",
                tag: "filter",
                icon: "fa fa-filter",
                color: "#ff5722"
            },
                {label: "Groups", name: "groups", tag: "filter", icon: "fa fa-bars", color: "#673ab7"},
                {label: "Automation", name: "automation", tag: "field", icon: "fa fa-magic", color: "#4caf50"},
                {label: "Separator", name: "separator", tag: "separator", icon: "fa fa-pagelines", color: "#4caf50"}];
        },
        prepareView: function (node) {
            const view = node.needField ? ["choose_field"] : ["string"];
            if (node.type == "filter") {
                view.push("domain");
            }
            view.push("more");
            return view;
        },
        onChangeTab: function (tabName) {
            this._super(tabName);
            if (tabName == "component") {
                const {bindSortable} = this.props;
                bindSortable(this.ref.tab.$el.find(".wTabCom"));
            }
        },
        renderComponent: function () {
            return QWeb.render("ViewStudio.SearchView.tabComponent", {components: this.components});
        },
        onChangeChooseField: function (node, prop, value) {
            delete node.needField;
            node.attrs.name = value;
            if (node.tag == "filter") {
                const {viewInfo} = this.props;
                node.attrs.context = {group_by: value};
                node.attrs.string = viewInfo.fields[value].string;
            }
            // if (node.tag == "field") {
            //     const {fieldsInfo} = this.props.viewInfo;
            //     fieldsInfo.search[node.attrs.name] = node;
            // }
            this.setNodeActive(node);
        },
    });

    var SearchEditContent = baseEdit.ViewContent.extend({
        template: 'ViewStudio.View.Tree',
        init: function (parent, params) {
            this._super(parent, params);
            this.viewConfig.prop = ListProps;
            this.viewConfig.view = SearchViewEdit;
            this.sortParams.selector = [
                [".wIt, ._wSortable[name='filters']", ".wFilter .wIt"],
                [".wIt, ._wSortable[name='groups']", ".wGroup .wIt"],
                [".wIt, ._wSortable[name='automation']", ".wAuto .wIt"],
                [".wIt, ._wSortable[name='separator']", ".wFilter .wIt"]
            ];
            this.nodesWait = {};
        },
        preNewFilter: function (node) {
            const self = this, {viewInfo} = this.props;
            const domain = new basic_widgets.ButtonDomain(this, {
                model: viewInfo.model, onChange: (data) => {
                    delete node.needDomain;
                    node.attrs.domain = data;
                    self.renderViewContent();
                }, onClose: () => {
                    self.renderViewContent();
                }
            });
            node.needDomain = true;
            node.attrs.string = node.attrs.string || "Filters";
            domain.renderDomainSelector();
            this.nodesWait[node.nodeId] = node;
            this.setNodeActive(node);
        },
        preNewGroupAuto: function (node) {
            if (node.tag == "filter") {
                node.attrs.context = {group_by: "wait_field"};
            }
            node.needField = true;
            this.nodesWait[node.nodeId] = node;
            this.setNodeActive(node);
            this.renderViewContent();
        },
        onClickNode: function (e) {
            e.stopPropagation();
            e.stopImmediatePropagation();
            const elNode = $(e.currentTarget), nodeId = elNode.attr("node-id"), node = this.nodes[nodeId];
            if (node && node.needDomain) {
                return this.preNewFilter(node);
            }
            this._super(e);
        },
        onStartSort: function (event, ui) {
            const width = ui.item.css("width"), minWidth = ui.item.css("min-width"), name = ui.item.attr("name");
            ui.placeholder.addClass("uiSort-placeholder").css(
                {
                    width: width,
                    minWidth: minWidth,
                    visibility: 'inherit'
                }).attr({'data-name': 'fieldVirtual'}).text(ui.item.text());
            ui.item.addClass("uiSort-item");
            this.$el.find(".wSVCon > div:not([name='" + (name == "separator" ? "filters" : name) + "'])").addClass("wSortDis");
        },
        onStopSort: function (event, ui) {
            var self = this, item = ui.item.removeClass("uiSort-item"), nodeId = this.getNodeId(item.next()),
                position = "before", name = item.attr("name"), tagName = item.attr("tag");
            if (item.parents(".wSVCon").length) {
                if (!nodeId.length) {
                    const parentEl = $(item.parents("[node-id]")[0]), parentId = parentEl.attr("node-id"),
                        lastChildIdx = parseInt(parentEl.attr("lc-idx") || -1), parentNode = this.nodes[parentId];
                    if (lastChildIdx >= 0 && parentNode.children.length > lastChildIdx + 1) {
                        nodeId = parentNode.children[lastChildIdx + 1].nodeId;
                    } else {
                        nodeId = parentId;
                        position = "append";
                    }
                }
                const nodeSelf = self.onXpathNode(this.getNodeId(item), [nodeId], position, {
                    tag: tagName,
                    type: name,
                    props: {}
                });
                item.attr({'node-id': nodeSelf.nodeId});
                if (["groups", "automation"].includes(name)) {
                    item.addClass("waitData");
                    self.preNewGroupAuto(nodeSelf[0]);
                } else if (name == "filters") {
                    item.addClass("waitData");
                    self.preNewFilter(nodeSelf[0]);
                } else {
                    this.renderViewContent();
                }
            }
            this.$el.find(".wSVCon > div").removeClass("wSortDis");
        },
        onXpathNode: function (idSelf, idXpath, position, props={}) {
            const {viewInfo} = this.props, {arch} = viewInfo, {tag, type} = props;
            if (tag == "filter" && idXpath && idXpath[0] == '-1') {
                if (type == "groups") {
                    const group = this.prepareNewNode({tag: "group", props: {string: "Group by"}});
                    group.parentId = arch.nodeId;
                    arch.children.push(group);
                    idXpath = [group.nodeId];
                } else {
                    idXpath = [arch.nodeId];
                }
            }
            return this._super(idSelf, idXpath, position, props);
        },
        bindStyle: function () {
            this._super();
            Object.values(this.nodesWait).map((node) => {
                if (!node.needDomain && !node.needField) {
                    return delete this.nodesWait[node.nodeId];
                }
                this.$el.find("[node-id='" + node.nodeId + "']").addClass("waitData");
            });
        }
    });

    return SearchEditContent;

});
