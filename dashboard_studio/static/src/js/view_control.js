odoo.define('dashboard_studio.view_control', function (require) {
    "use strict";

    var core = require('web.core');
    var Widget = require('web.Widget');
    var base = require('dashboard_studio.base');
    var Calendar = require("dashboard_studio.calendar");
    // var Pivot = require("dashboard_studio.pivot");
    // var Graph = require("dashboard_studio.graph");
    var KanBan = require("dashboard_studio.kanban");
    var Planning = require("dashboard_studio.planning");
    var dashboard = require("dashboard_studio.dashboard");
    // var Gantt = require("dashboard_studio.gantt");
    var Activity = require("dashboard_studio.activity");
    var Tree = require("dashboard_studio.tree");
    // var ActionManager = require('web.ActionManager');
    var BasicModel = require('web.BasicModel');
    var BasicView = require('web.BasicView');
    var session = require('web.session');
    var QWeb = core.qweb;


    var ControlView = BasicView.extend({
        init: function (parent, params) {}
    });

    var ControlModel = BasicModel.extend({
        createNewView: function (data) {
            return this['_rpc']({
                model: "view.center",
                method: 'create_new_view',
                args: [data],
                kwargs: {},
            });
        },
        storeView: function (data) {
            return this['_rpc']({
                model: "view.center",
                method: 'store_view',
                args: [data],
                kwargs: {},
            });
        },
        resetView: function (viewId) {
            return this['_rpc']({
                model: "view.center",
                method: "reset_view",
                args: [viewId],
                kwargs: {},
            });
        },
    });

    var ViewControl = base.WidgetBase.extend({
        template: "DashboardStudio.Edit.Widgets",
        init: function (parent, params) {
            this._super(parent, params);
            this.views = [
                {label: 'Files', name: "files", des: "View all files uploaded to your board in one place", img: "/dashboard_studio/static/src/svg/files_img.svg"},
                {label: 'Tree', name: "list", des: "View all files uploaded to your board in one place", img: "/dashboard_studio/static/src/svg/files_img.svg"},
                {label: 'Map', name: "map", des: "View locations from your board on a map", img: "/dashboard_studio/static/src/svg/map_img.svg"},
                {label: 'Dashboard', name: "dashboard", des: "Visually see a breakdown of your team's workload by time", img: "/dashboard_studio/static/src/svg/timeline_img.svg"},
                {label: 'Planning', name: "plan", des: "Plan, schedule and track all of your projects", img: "/dashboard_studio/static/src/svg/gantt_img.svg"},
                {label: 'Gantt', name: "gantt", des: "Plan, schedule and track all of your projects", img: "/dashboard_studio/static/src/svg/gantt_img.svg"},
                {label: 'Workload', name: "workload", des: "See who's busy and who's available and quickly re-balance their work", img: "/dashboard_studio/static/src/svg/workload_img.svg"},
                {label: 'Chart', name: "graph", des: "Create chart views to visually show data in your board", img: "/dashboard_studio/static/src/svg/chart_img.svg"},
                {label: 'Kanban', name: "kanban", des: "A way to view your board with cards and lists in a pipeline", img: "/dashboard_studio/static/src/svg/kanban_img.svg"},
                {label: 'Calendar', widget: "", name: "calendar", des: "View dates from your board in a calendar", img: "/dashboard_studio/static/src/svg/calendar_img.svg"},
                {label: 'Pivot', name: "pivot", des: "View all data in one pivot", img: "/dashboard_studio/static/src/svg/files_img.svg"},
                {label: 'Activity', name: "activity", des: "View all files uploaded to your board in one place", img: "/dashboard_studio/static/src/svg/files_img.svg"},
            ];
            const {step, viewType} = params;
            // this.fields = params.viewInfo;
            this.state = {step: step || 'step1', viewType: viewType || false, oldStep: null};
            this.steps = {step1: {label: "View Center", render: this.renderChooseView.bind(this)},
                step2: {label: "View Setup", render: this.renderViewSetup.bind(this)}};
            // this.viewWidgets = {calendar: Calendar, pivot: Pivot, graph: Graph, activity: Activity, kanban: KanBan, plan: Planning, list: Tree, dashboard: dashboard.DashboardView};
            this.viewWidgets = {calendar: Calendar, activity: Activity, kanban: KanBan, plan: Planning, list: Tree, dashboard: dashboard.DashboardView};
        },
        start: function () {
            this.controlView = new ControlView(this, {});
            this.controlModel = new ControlModel(this);
            this._processFieldsView = this.controlView._processFieldsView.bind(this.controlView);
        },
        getViewInfo: function () {
            const self = this, {viewType} = this.state;
            if (viewType in self.fieldsViews) {
                const viewInfo = this._processFieldsView(self.fieldsViews[viewType], viewType);
                if (["list", "kanban"].includes(viewType)) {
                    const {fields} = viewInfo, fieldsInfo = viewInfo.fieldsInfo[viewType],
                        fieldsNode = Object.keys(fieldsInfo).filter((fieldName) => {
                            return viewType == "kanban" ? (fieldsInfo[fieldName].Widget ? true : false) : true;
                        }), fieldWithout = {list: ["activity_exception_decoration"]};
                    const withoutField = fieldWithout[viewType] || [];
                    Object.keys(fields).map((fieldName) => {
                        if (!fieldsNode.includes(fieldName) && !withoutField.includes(fieldName)) {
                            const fieldNode = {tag: "field", children: []};
                            fieldNode.attrs = {name: fieldName};
                            self.controlView._processNode(fieldNode, viewInfo);
                            viewInfo.fieldsInfo[viewType][fieldName].willShow = true;
                        }
                    });
                }
                return  {...viewInfo, fields: {...viewInfo.fields}};
            }
        },
        prepareNewView: function () {
            const {res_model} = this.action, {viewType} = this.state, viewTemplate = `DashboardStudio.Widget.${viewType}`,
                viewInfo = {view_mode: viewType, action_id: this.action.id}, data = {};
            data.arch = QWeb.templates[viewTemplate].children[0].outerHTML;
            data.name = `${res_model}.${viewType}`;
            data.model = res_model;
            viewInfo.data = data;
            return viewInfo;
        },
        createView: function () {
            return this.controlModel.createNewView(this.prepareNewView());
        },
        reloadView: function () {
            const self = this;
            this.action_manager._loadViews(this.action).then(function (fieldsViews) {
                self.fieldsViews = fieldsViews;
                self.ref.view.setViewInfo(self.getViewInfo());
            });
        },
        onActiveView: async function (e) {
            const elCard = $(e.currentTarget), viewType = elCard.attr("name");
            this.setState({step: "step2", viewType: viewType, oldStep: "step1"});
            if (!(viewType in this.fieldsViews)) {
                await this.createView();
            }
            this.renderElement();
        },
        onClose: function () {
            this.$el.remove();
            location.reload();
        },
        onBack: function () {
            this.setState({step: "step1", oldStep: null});
            this.renderElement();
        },
        onSave: function () {
            const self = this;
            this.controlModel.storeView(this.ref.view.prepareDataToSave()).then(() => {
                self.reloadView()
            });
        },
        onReset: function () {
            const self = this;
            this.controlModel.resetView(this.ref.view.prepareDataToReset()).then(() => {
                self.reloadView()
            });
        },
        bindAction: function () {
            this.$el.find(".iCard").click(this.onActiveView.bind(this));
            this.$el.find(".faClose").click(this.onClose.bind(this));
            this.$el.find(".faBack").click(this.onBack.bind(this));
            this.$el.find(".aSave").click(this.onSave.bind(this));
            this.$el.find(".aReset").click(this.onReset.bind(this));
        },
        renderViewSetup: function () {
            const {viewType} = this.state, widgetView = new this.viewWidgets[viewType](this,
                {viewInfo: this.getViewInfo(), action: this.action});
            widgetView.appendTo(this.$el.find(".wgCon"));
            this.ref.view = widgetView;
        },
        renderChooseView: function () {
            if (!this.ref.chooseView) {
                this.ref.chooseView = QWeb.render("DashboardStudio.Edit.ChooseView",
                    {views: this.views.filter((view) => !["list"].includes(view.name))});
            }
            this.$el.find('.wgCon').append(this.ref.chooseView);
            this.bindAction();
        },
        renderView: async function () {
            const {step} = this.state, state = $.bbq.getState(true);
            this.action = await this.action_manager.loadAction(state.action);
            const params = {
                resModel: this.action.res_model,
                views: this.action.views,
                context: this.action.context,
            };
            const options = {
                actionId: this.action.id,
                loadActionMenus: true,
                loadIrFilters: true,
                studioKey: Math.random(),
            };
            this.fieldsViews = await this.vm.loadViews(params, options);
            this.steps[step].render();
        },
        renderElement: function () {
            this._super();
        }
    });

    return ViewControl;
});
