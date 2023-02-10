odoo.define('dynamic_odoo.BaseCenter', function (require) {
    "use strict";

    var core = require('web.core');
    var base = require('dynamic_odoo.base');
    var Calendar = require("dynamic_odoo.calendar");
    var Pivot = require("dynamic_odoo.pivot");
    // var Pivot = require("dynamic_odoo.planning");
    // var Graph = require("dynamic_odoo.planning");
    var Graph = require("dynamic_odoo.graph");
    var KanBan = require("dynamic_odoo.kanban");
    var Planning = require("dynamic_odoo.planning");
    // var Activity = require("dynamic_odoo.planning");
    var Activity = require("dynamic_odoo.activity");
    var Form = require("dynamic_odoo.form");
    var Search = require("dynamic_odoo.search");
    var Tree = require("dynamic_odoo.tree");
    var BasicModel = require('web.BasicModel');
    var BasicView = require('web.BasicView');
    var session = require('web.session');
    // var ActionManager = require('web.ActionManager');
    var AppCenter = require("dynamic_odoo.AppCenter");
    var rootWidget = require('root.widget');
    var {useService} = require("@web/core/utils/hooks");
    var QWeb = core.qweb;
    const {Component, mount, tags, utils} = owl;

    var ControlView = BasicView.extend({
        init: function (parent, params) {
        }
    });

    var ControlModel = BasicModel.extend({
        createNewView: function (data) {
            return this['_rpc']({
                model: "ir.ui.view",
                method: 'create_new_view',
                args: [data],
                kwargs: {},
            });
        },
        storeView: function (data) {
            return this['_rpc']({
                model: "studio.view.center",
                method: 'store_view',
                args: [data],
                kwargs: {},
            });
        },
        storeAction: function (res_id, data) {
            return this['_rpc']({
                model: "ir.actions.center",
                method: 'store_action',
                args: [res_id, data],
                kwargs: {},
            });
        },
        resetView: function (viewId) {
            return this['_rpc']({
                model: "studio.view.center",
                method: "reset_view",
                args: [viewId],
                kwargs: {},
            });
        },
        resetReport: function (reportId) {
            return this['_rpc']({
                model: "report.center",
                method: "undo_view",
                args: [reportId],
                kwargs: {},
            });
        },
        getView: function (domain) {
            return this['_rpc']({
                model: "studio.view.center",
                method: 'get_view',
                args: [domain],
                kwargs: {},
            });
        },
        createApp: function (data) {
            return this['_rpc']({
                model: "studio.view.center",
                method: 'create_app',
                args: [data],
                kwargs: {},
            });
        },
        // updateAction: function (res_id, data) {
        //     return this['_rpc']({
        //         model: "ir.actions.act_window",
        //         method: 'write',
        //         args: [res_id, data],
        //         kwargs: {},
        //     });
        // },
        // updateViewArch: function (res_id, data) {
        //     return this['_rpc']({
        //         model: "ir.ui.view",
        //         method: "write",
        //         args: [res_id, data],
        //         kwargs: {},
        //     });
        // },
    });

    var BaseChooseView = base.WidgetBase.extend({
        template: "ViewStudio.Edit.ViewsCenter",
        init: function (parent, params) {
            this._super(parent, params);
            this.views = {};
            this.views.battery = {
                label: "Battery",
                name: "battery",
                description: "Your progress in a glance",
                img: "/dynamic_odoo/static/src/img/buttery_png.png",
                icon: ""
            };
            this.views.title = {
                label: "Title",
                name: "title",
                description: "Your title in a glance",
                img: "/dynamic_odoo/static/src/img/number_png.png",
                icon: ""
            };
            this.views.todo = {
                label: "Todo List",
                name: "todo",
                description: "List things you need to do and never drop the ball again.",
                img: "/dynamic_odoo/static/src/img/todo_list_png.png",
                icon: ""
            };
            this.views.pivot = {
                label: "Pivot",
                name: "pivot",
                description: "Create Pivot views to visually show data in your board",
                img: "/dynamic_odoo/static/src/img/pivot_png.png",
                icon: "fa fa-table"
            };
            this.views.activity = {
                label: "Activity",
                name: "activity",
                description: "Create Activity views to visually show data in your board",
                img: "/dynamic_odoo/static/src/img/activity_png.png",
                icon: "fa fa-th"
            };
            this.views.graph = {
                label: "Chart",
                name: "graph",
                description: "Create chart views to visually show data in your board",
                img: "/dynamic_odoo/static/src/img/chart_png.png",
                icon: "fa fa-bar-chart"
            };
            this.views.kanban = {
                label: "Kanban",
                name: "kanban",
                description: "A way to view your board with cards and lists in a pipeline",
                img: "/dynamic_odoo/static/src/img/kanban_png.png",
                icon: "fa fa-th-large"
            };
            this.views.search = {
                label: "Search",
                name: "search",
                description: "A way to view your board with cards and lists in a pipeline",
                img: "/dynamic_odoo/static/src/img/kanban_png.png",
                icon: "fa fa-search"
            };
            this.views.form = {
                label: "Form",
                name: "form",
                description: "A way to view your board with cards and lists in a pipeline",
                img: "/dynamic_odoo/static/src/img/form_png.png",
                icon: "fa fa-address-card"
            };
            this.views.search = {
                label: "Filter",
                name: "search",
                description: "Filter data to show",
                img: "/dynamic_odoo/static/src/img/kanban_png.png",
                icon: "fa fa-search"
            };
            this.views.calendar = {
                label: "Calendar ",
                name: "calendar",
                description: "Add calendar to see dates from all your boards",
                img: "/dynamic_odoo/static/src/img/calendar_png.png",
                icon: "fa fa-calendar-o"
            };
            this.views.plan = {
                label: "Plan",
                name: "plan",
                description: "Plan & manage time visually across multiple boards",
                img: "/dynamic_odoo/static/src/img/plan_png.png",
                icon: "fa fa-tasks"
            };
            this.views.text = {
                label: "Text",
                name: "text",
                description: "Add rich text to your dashboard.",
                img: "/dynamic_odoo/static/src/img/text_png.png",
                icon: ""
            };
            this.views.list = {
                label: "Table",
                name: "list",
                description: "View your projects data in a glance",
                img: "/dynamic_odoo/static/src/img/list_png.png",
                icon: "fa fa-list-ul"
            };
            this.views.overview = {
                label: "Overview",
                next_version: true,
                name: "overview",
                description: "See the status of all your projects",
                img: "/dynamic_odoo/static/src/img/overview_png.png",
                icon: ""
            };
            this.views.countdown = {
                label: "Countdown",
                name: "countdown",
                description: "Stay on track with countdown",
                img: "/dynamic_odoo/static/src/img/countdown_png.png",
                icon: ""
            };
            this.views.quote = {
                label: "Quote of the Day",
                name: "quote",
                description: "Uplifting your spirit with new quotes every day",
                img: "/dynamic_odoo/static/src/img/quote_png.png",
                icon: ""
            };
            this.views.embed_everything = {
                label: "Embed Everything",
                next_version: true,
                name: "embed_everything",
                description: "Embed everything to your dashboard (PDFs, TypeForm, Google maps etc.)",
                img: "/dynamic_odoo/static/src/img/embed_everything_png.png",
                icon: ""
            };
            this.views.youtube = {
                label: "Youtube",
                name: "youtube",
                description: "Add a video from YouTube to view it whenever you want",
                img: "/dynamic_odoo/static/src/img/youtube_png.png",
                icon: ""
            };
            this.views.bookmark = {
                label: "Bookmarks",
                name: "bookmark",
                description: "Collect articles, ideas & stories from anywhere.",
                img: "/dynamic_odoo/static/src/img/bookmarks_png.png",
                icon: ""
            };
            this.views.playlist = {
                label: "Playlist",
                next_version: true,
                name: "playlist",
                description: "Embed your favorite playlist",
                img: "/dynamic_odoo/static/src/img/playlist_png.png",
                icon: ""
            };
            const {step, viewType, title} = this.props;
            this.categorys = {};
            this.viewWidgets = {
                calendar: Calendar, pivot: Pivot, graph: Graph, activity: Activity, kanban: KanBan,
                plan: Planning, list: Tree, search: Search, form: Form
            };
            this.state = {category: null, step: step || "choose", viewType: this.viewWidgets[viewType] ? viewType : "None"};
            this.steps = {
                choose: {label: "Views Center", render: this.renderChooseView.bind(this)},
                setup: {label: false, render: this.renderViewSetup.bind(this)},
                app: {label: "App Creator", render: this.renderNewApp.bind(this)},
                more: {label: "More", render: this.renderMore.bind(this)}
            };
            this.vm = useService("view");
            this.action_manager = useService("action");
        },
        initParams: function () {
            this.controlView = new ControlView(this, {});
            this.controlModel = new ControlModel(this);
        },
        onClose: async function (e) {
            if (e) {
                e.stopPropagation();
                e.stopImmediatePropagation();
            }
            const {viewType} = this.state, state = $.bbq.getState(true), {active_id, id, action, model} = state;
            const options = {
                clearBreadcrumbs: true,
                additionalContext: {
                    params: {
                        id: id,
                        action: action,
                        // active_id: state.id || false,
                        model: model,
                        view_type: viewType
                    },
                    active_id: active_id || false,
                    active_ids: (active_id && [active_id]) || [],
                },
                viewType: viewType,
                props: {
                    resId: state.id,
                }
            };
            odoo['studio'].env.bus.trigger("CLEAR-CACHES");
            options.clearBreadcrumbs = true;
            await this.action_manager['doAction'](state.action, options);
            $('body').removeClass("editMode");
            this.$el.remove();
        },
        onBack: function () {
        },
        onSave: function (e) {
            e.stopPropagation();
        },
        onReset: function () {
        },
        onClickCard: function (e) {
        },
        onShowWidgetByCategory: function (categoryName) {
            this.setState({category: categoryName});
            this.renderElement();
        },
        onChangeCenter: function (e) {
            e.stopPropagation();
            e.stopImmediatePropagation();
            const el = $(e.currentTarget), type = el.attr("type");
            this.setState({step: type});
            this.renderElement();
        },
        bindStyle: function () {
            const {step} = this.state;
            this.$el.attr({type: step});
        },
        bindAction: function () {
            this.$el.find(".iCard").unbind("click").click(this.onClickCard.bind(this));
            this.$el.find(".faClose").unbind("click").click(this.onClose.bind(this));
            this.$el.find(".faBack").unbind("click").click(this.onBack.bind(this));
            this.$el.find(".wAC a[type='save']").unbind("click").click(this.onSave.bind(this));
            this.$el.find(".wAC a[type='reset']").unbind("click").click(this.onReset.bind(this));
            this.$el.find(".footCon > .wIcons a[type]").unbind("click").click(this.onChangeCenter.bind(this));
        },
        renderViewSetup: function () {
        },
        getAction: async function () {
            const state = $.bbq.getState(true), {action} = state;
            this.action = await this.action_manager.loadAction(action);
        },
        renderMore: function () {
            this.$el.find(".cateWidgets").empty().append("<h1>Support in next features</h1>");
        },
        renderNewApp: async function () {
            const appCenter = await mount(AppCenter, {
                env: odoo['studio'].env,
                target: this.$el.find(".wgCon").empty()[0],
                position: "first-child"
            });
            appCenter.render();
        },
        renderChooseView: function () {
            const {category} = this.state;
            if (category) {
                const views = this.categorys[category].views.map((viewName) => this.views[viewName]);
                this.$el.find(".listCategory").empty().append(Object.keys(this.categorys).map((cateName) =>
                    $(QWeb.render("ViewStudio.Edit.categoryItem",
                        {category: this.categorys[cateName], active: category == cateName})).click(
                        () => this.onShowWidgetByCategory.bind(this)(cateName))
                ));
                this.$el.find(".cateWidgets").empty().append(QWeb.render("ViewStudio.Edit.categoryWidgets", {views: views}));
            }
        },
        renderView: function () {
            const {step} = this.state;
            this.steps[step].render();
        },
    });

    return BaseChooseView;
});
