odoo.define('dashboard_studio.BaseCenter', function (require) {
    "use strict";

    var core = require('web.core');
    var base = require('dashboard_studio.base');
    var Calendar = require("dashboard_studio.calendar");
    // var Pivot = require("dashboard_studio.pivot");
    // var Graph = require("dashboard_studio.graph");
    var KanBan = require("dashboard_studio.kanban");
    var Planning = require("dashboard_studio.planning");
    var Activity = require("dashboard_studio.activity");
    var Tree = require("dashboard_studio.tree");
    var BasicModel = require('web.BasicModel');
    var BasicView = require('web.BasicView');
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
        createNewCard: function (data) {
            return this['_rpc']({
                model: "view.dashboard",
                method: 'create_new_card',
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
        // updateViewArch: function (res_id, data) {
        //     return this['_rpc']({
        //         model: "ir.ui.view",
        //         method: "write",
        //         args: [res_id, data],
        //         kwargs: {},
        //     });
        // },
        updateCardArch: function (view_id, data) {
            return this['_rpc']({
                model: "dashboard.widget.view",
                method: "write",
                args: [view_id, data],
                kwargs: {},
            });
        },
        removeCard: function (res_id) {
            return this['_rpc']({
                model: "view.dashboard",
                method: "unlink",
                args: [res_id],
                kwargs: {},
            });
        },
        copyCard: function () {
            return this['_rpc']({
                model: "view.dashboard",
                method: "copy",
                args: [res_id],
                kwargs: {},
            });
        },
        action: function (actionName, params) {
            const {args, kwargs} = params;
            return this['_rpc']({
                model: "view.dashboard",
                method: actionName,
                args: args || [],
                kwargs: kwargs || {},
            });
        },
        onLoadModels: function () {
            return this['_rpc']({
                model: "ir.model",
                method: "search_read",
                fields: ["id", "model"],
                domain: [],
            });
        },
        loadDashboard: function (res_id, view_id) {
            return this['_rpc']({
                model: "view.dashboard",
                method: "load_dashboard",
                args: [res_id, view_id],
                kwargs: {},
            });
        },
    });

    var BaseSetupView = base.WidgetBase.extend({

    });

    var BaseChooseView = base.WidgetBase.extend({
        template: "DashboardStudio.Edit.ViewsCenter",
        init: function (parent, params) {
            this._super(parent, params);
            this.views = {};
            this.views.battery = {label: "Battery", name: "battery", description: "Your progress in a glance", img: "/dashboard_studio/static/src/img/buttery_png.png", icon: ""};
            this.views.title = {label: "Title", name: "title", description: "Your title in a glance", img: "/dashboard_studio/static/src/img/number_png.png", icon: ""};
            this.views.todo = {label: "Todo List", name: "todo", description: "List things you need to do and never drop the ball again.", img: "/dashboard_studio/static/src/img/todo_list_png.png", icon: ""};
            this.views.pivot = {label: "Pivot", name: "pivot", description: "Create Pivot views to visually show data in your board", img: "/dashboard_studio/static/src/img/quote_png.png", icon: ""};
            this.views.activity = {label: "Activity", name: "activity", description: "Create Activity views to visually show data in your board", img: "/dashboard_studio/static/src/img/embed_everything_png.png", icon: ""};
            this.views.graph = {label: "Chart", name: "graph", description: "Create chart views to visually show data in your board", img: "/dashboard_studio/static/src/img/chart_png.png", icon: ""};
            this.views.kanban = {label: "Kanban", name: "kanban", description: "A way to view your board with cards and lists in a pipeline", img: "/dashboard_studio/static/src/img/kanban_png.png", icon: ""};
            this.views.calendar = {label: "Calendar ", name: "calendar", description: "Add calendar to see dates from all your boards", img: "/dashboard_studio/static/src/img/calendar_png.png", icon: ""};
            this.views.plan = {label: "Plan", name: "plan", description: "Plan & manage time visually across multiple boards", img: "/dashboard_studio/static/src/img/plan_png.png", icon: ""};
            this.views.text = {label: "Text", name: "text", description: "Add rich text to your dashboard.", img: "/dashboard_studio/static/src/img/text_png.png", icon: ""};
            this.views.list = {label: "Table", name: "list", description: "View your projects data in a glance", img: "/dashboard_studio/static/src/img/list_png.png", icon: ""};
            this.views.overview = {label: "Overview", next_version: true, name: "overview", description: "See the status of all your projects", img: "/dashboard_studio/static/src/img/overview_png.png", icon: ""};
            this.views.countdown = {label: "Countdown", name: "countdown", description: "Stay on track with countdown", img: "/dashboard_studio/static/src/img/countdown_png.png", icon: ""};
            this.views.quote = {label: "Quote of the Day", name: "quote", description: "Uplifting your spirit with new quotes every day", img: "/dashboard_studio/static/src/img/quote_png.png", icon: ""};
            this.views.embed_everything = {label: "Embed Everything", next_version: true, name: "embed_everything", description: "Embed everything to your dashboard (PDFs, TypeForm, Google maps etc.)", img: "/dashboard_studio/static/src/img/embed_everything_png.png", icon: ""};
            this.views.youtube = {label: "Youtube", name: "youtube", description: "Add a video from YouTube to view it whenever you want", img: "/dashboard_studio/static/src/img/youtube_png.png", icon: ""};
            this.views.bookmark = {label: "Bookmarks", name: "bookmark", description: "Collect articles, ideas & stories from anywhere.", img: "/dashboard_studio/static/src/img/bookmarks_png.png", icon: ""};
            this.views.playlist = {label: "Playlist", next_version: true, name: "playlist", description: "Embed your favorite playlist", img: "/dashboard_studio/static/src/img/playlist_png.png", icon: ""};
            const {step, viewType} = this.props;
            this.categorys = {};
            this.state = {category: null, step: step || "choose", viewType: viewType};
            this.steps = {choose: {label: "Views Center", render: this.renderChooseView.bind(this)},
                setup: {label: "View Setup", render: this.renderViewSetup.bind(this)}};
            // this.viewWidgets = {calendar: Calendar, pivot: Pivot, graph: Graph, activity: Activity, kanban: KanBan, plan: Planning, list: Tree};
            this.viewWidgets = {calendar: Calendar, activity: Activity, kanban: KanBan, plan: Planning, list: Tree};
        },
        start: async function () {
            this.controlView = new ControlView(this, {});
            this.controlModel = new ControlModel(this);
            if (!odoo['studio']) {
                odoo.studio = {};
            }
            if (!odoo['studio'].models) {
                odoo['studio'].models = "await";
                odoo['studio'].models = await this.controlModel.onLoadModels();
            }
        },
        onClose: function () {
            this.$el.remove();
        },
        onBack: function () {},
        onSave: function () {},
        onReset: function () {},
        onClickCard: function (e) {},
        onShowWidgetByCategory: function (categoryName) {
            this.setState({category: categoryName});
            this.renderElement();
        },
        bindAction: function () {
            this.$el.find(".iCard").click(this.onClickCard.bind(this));
            this.$el.find(".faClose").click(this.onClose.bind(this));
            this.$el.find(".faBack").click(this.onBack.bind(this));
            this.$el.find(".aSave").click(this.onSave.bind(this));
            this.$el.find(".aReset").click(this.onReset.bind(this));
        },
        renderViewSetup: function () {

        },
        renderChooseView: function () {
            const {category} = this.state;
            if (category) {
                const views = this.categorys[category].views.map((viewName) => this.views[viewName]);
                this.$el.find(".listCategory").empty().append(Object.keys(this.categorys).map((cateName) =>
                    $(QWeb.render("DashboardStudio.Edit.categoryItem",
                        {category: this.categorys[cateName], active: category == cateName})).click(
                        () => this.onShowWidgetByCategory.bind(this)(cateName))
                ));
                this.$el.find(".cateWidgets").empty().append(QWeb.render("DashboardStudio.Edit.categoryWidgets", {views: views}));
            }
        },
        renderView: function () {
            const {step} = this.state;
            this.steps[step].render();
        },
        renderElement: function () {
            this._super();
        }
    });

    return BaseChooseView;
});
