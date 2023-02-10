odoo.define('dashboard_studio.DashboardsCenter', function (require) {
    "use strict";

    var core = require('web.core');
    var BaseCenter = require("dashboard_studio.BaseCenter");
    var dashboard = require("dashboard_studio.dashboard");
    var Pivot = require("dashboard_studio.pivot");
    var Chart = require("dashboard_studio.DashboardChart");
    var Tree = require("dashboard_studio.tree");
    var session = require('web.session');
    var QWeb = core.qweb;


    var DashboardsCenter = BaseCenter.extend({
        init: function (parent, params) {
            this._super(parent, params);
            this.categorys.all = {name: "all", label: "All Widgets", views: ["battery", "title", "todo", "graph",
                        "calendar", "pivot", "list", "plan", "text", "countdown", "youtube", "bookmark"]};
            this.categorys.recommended = {name: "recommended", label: "Recommended", views: ["battery", "title", "todo", "graph", "calendar", "pivot", "plan", "text"]};
            this.categorys.staying_on_top = {name: "staying_on_top", label: "Staying on Top", views: ["battery", "title", "list", "graph", "calendar", "pivot", "plan"]};
            this.categorys.motivation = {name: "motivation", label: "Motivation", views: ["countdown"]};
            this.categorys.media = {name: "media", label: "Media", views: ["youtube", "bookmark", "text"]};
            this.categorys.personal = {name: "personal", label: "Personal", views: ["todo"]};
            const {record, view_id} = this.props;
            this.state = {...this.state, category: "all", record: record, view_id: view_id};
            this.viewWidgets.graph = Chart;
            this.viewWidgets.pivot = Pivot;
            this.viewWidgets.title = dashboard.TitleWidget;
            this.viewWidgets.youtube = dashboard.YoutubeWidget;
            this.viewWidgets.battery = dashboard.BatteryWidget;
            this.viewWidgets.todo = dashboard.TodoWidget;
            this.viewWidgets.bookmark = dashboard.BookmarkWidget;
            this.viewWidgets.countdown = dashboard.CountDownWidget;
            this.viewWidgets.text = dashboard.TextWidget;
            this.viewWidgets.tree = Tree;
        },
        prepareNewView: function () {
            var {viewType, view_id} = this.state, widgetId = _.uniqueId('DBoard'), {model} = $.bbq.getState(true);
            const viewTemplate = `DashboardStudio.Widget.${viewType}`, arch = QWeb.templates[viewTemplate].children[0].outerHTML,
                position = {x: 0, y: 0, w: 8, h: 4};
            if (["chart", "graph"].includes(viewType)) {
                position.w = 12;
                position.h = 8;
            }
            const data = {
                arch: arch,
                title: this.views[viewType].label,
                name: `view_center.dashboard.${viewType}.${widgetId}`,
                model: model,
                view_id: view_id,
                view_type: viewType,
                ...position
            };
            return data;
        },
        onClose: function () {
            const {card} = this.props;
            this._super();
            card ? card.reload() : this.trigger_up('onReload');
        },
        appendTo: function (container) {
            this.renderElement();
            this.$el.appendTo(container);
            this.inDom = true;
        },
        setState: function (data) {
            if (data['viewType'] == "chart") {
                data["viewType"] = "graph";
            }
            this._super(data);
        },
        createView: function () {
            const self = this;
            return this.controlModel.createNewCard(this.prepareNewView()).then((record) => {
                if (record.length) {
                    self.setState({record: record[0]});
                }
                if (self.inDom) {
                    self.renderElement();
                }
            });
        },
        onClickCard: function (e) {
            const elCard = $(e.currentTarget), viewType = elCard.attr("name");
            this.setState({step: "setup", viewType: viewType});
            this.createView();
        },
        onSave: function () {
            var self = this, data = this.ref.view.prepareDataToSave();
            this.controlModel.updateCardArch(data.view_id, {arch: data.arch, model: data.model_name}).then(() => {
                self.reloadView();
            });
        },
        onCopy: function () {
            const self = this, {record} = this.state;
            this.controlModel.action("copy", {args: [record.id]}).then(() => {
                self.trigger_up('onReload');
            });
        },
        onUnlink: function () {
            const self = this, {record} = this.state;
            this.controlModel.action("unlink", {args: [record.id]}).then(() => {
                self.trigger_up('onReload');
            });
        },
        actionProps: function () {
            const state = $.bbq.getState(true);
            return {...state, res_model: state.model, context: session.user_context || {}};
        },
        reloadView: function () {
            const self = this, {viewType, record} = this.state;
            this.controlModel.loadDashboard(record.id, record.view_id[0]).then((viewInfo) => {
                const _viewInfo = self.controlView._processFieldsView(viewInfo[0].viewInfo, viewType)
                _viewInfo.archXml = viewInfo[0].viewInfo.arch;
                // self.ref.view.setViewInfo(self.controlView._processFieldsView(viewInfo[0].viewInfo, viewType));
                self.ref.view.setViewInfo(_viewInfo);
            });
        },
        getViewInfo: function () {
            // var self = this, {viewType, record} = this.state, viewInfo = record.viewInfo, {arch} = viewInfo;
            // if (typeof viewInfo.arch == "string") {
            //     viewInfo = this.controlView._processFieldsView(viewInfo, viewType);
            //     if (viewType == "list") {
            //         const {fields} = viewInfo, fieldsInfo = viewInfo.fieldsInfo[viewType],
            //             fieldWithout = {list: ["activity_exception_decoration"]};
            //         const withoutField = fieldWithout[viewType] || [];
            //         Object.keys(fields).map((fieldName) => {
            //             if (!(fieldName in fieldsInfo) && !withoutField.includes(fieldName)) {
            //                 const fieldNode = {tag: "field", children: []};
            //                 fieldNode.attrs = {name: fieldName};
            //                 self.controlView._processNode(fieldNode, viewInfo);
            //                 viewInfo.fieldsInfo[viewType][fieldName].willShow = true;
            //             }
            //         });
            //     }
            //     viewInfo.archXml = arch;
            // }
            // return {...viewInfo, fields: {...viewInfo.fields}};
            const {record, viewType} = this.state;
            record.viewInfo.type = viewType;
            return this._getViewInfo(record.viewInfo);
        },
        _getViewInfo: function (viewInfo) {
            var self = this, {arch, type} = viewInfo;
            if (typeof viewInfo.arch == "string") {
                viewInfo = this.controlView._processFieldsView(viewInfo, type);
                if (type == "list") {
                    const {fields} = viewInfo, fieldsInfo = viewInfo.fieldsInfo[type],
                        fieldWithout = {list: ["activity_exception_decoration"]};
                    const withoutField = fieldWithout[type] || [];
                    Object.keys(fields).map((fieldName) => {
                        if (!(fieldName in fieldsInfo) && !withoutField.includes(fieldName)) {
                            const fieldNode = {tag: "field", children: []};
                            fieldNode.attrs = {name: fieldName};
                            self.controlView._processNode(fieldNode, viewInfo);
                            viewInfo.fieldsInfo[type][fieldName].willShow = true;
                        }
                    });
                }
                viewInfo.archXml = arch;
            }
            return {...viewInfo, fields: {...viewInfo.fields}};
        },
        renderViewSetup: function () {
            const {viewType, record} = this.state;
            if (viewType && record.id) {
                const widgetView = new this.viewWidgets[viewType](this, {viewInfo: this.getViewInfo(), action: this.actionProps()});
                widgetView.appendTo(this.$el.find(".wgCon").empty());
                this.ref.view = widgetView;
            }
        },
    });

    return DashboardsCenter;
});
