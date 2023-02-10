odoo.define('dashboard_studio.AbstractController', function (require) {
    "use strict";

    var core = require('web.core');
    var AbstractController = require('web.AbstractController');
    var AbstractView = require('web.AbstractView');
    var ViewControl = require("dashboard_studio.ViewsCenter");
    var base = require('dashboard_studio.base');
    var {ControlPanel} = require("@web/search/control_panel/control_panel");
    var {session} = require("@web/session");
    var rootWidget = require('root.widget');
    var QWeb = core.qweb;

    const {Component} = owl;


    var ActiveDashboard = base.WidgetBase.extend({
        template: "DashboardStudio.ActiveDashboard",
        init: function (parent, props) {
            this._super(parent, props);
        },
        prepareData: function () {
            const name = this.$el.find("input").val(), state = $.bbq.getState(true), {model, action} = state;
            return {
                data: {
                    name: name,
                    model: model,
                    arch: QWeb.templates["DashboardStudio.Widget.dashboard"].children[0].outerHTML,
                    type: "dashboard",
                },
                action_id: action,
                view_mode: "dashboard",
            }
        },
        onCreate: function () {
            const self = this, {env} = this.props;
            // action = env.services.action.currentController.action;

            // odoo.rootStudio.env.bus.trigger("CLEAR-CACHES");
            // this.action = await this.action_manager.loadAction(this.appState.action);
            return this['_rpc']({
                model: "view.center",
                method: 'create_new_view',
                args: [this.prepareData()],
                kwargs: {},
            }).then((view_id) => {
                window.location.reload();
                // env.bus.trigger("CLEAR-CACHES");
                // env.services.action.loadAction()
                // var views = action.views;
                // views.splice(0, 0, [view_id, "dashboard"]);
                // action.views = views;
                // self.do_action(action, {
                //     clear_breadcrumbs: true,
                // });
                // self.onClose();
            })
        },
        onClose: function () {
            this.$el.remove();
        },
        bindAction: function () {
            this.$el.find(".iClose, .btnCancel").click(this.onClose.bind(this));
            this.$el.find(".btnCreate").click(this.onCreate.bind(this));
        }
    });

    var MoreView = base.WidgetBase.extend({
        template: "DashboardStudio.iconEdit",
        init: function (parent, props) {
            this._super(parent, props);
            const {views} = props;
            this.options = [
                {label: "Columns", name: "columns", icon: "fa fa-list-ul"},
                {label: "More Views", name: "more_view", icon: "fa fa-object-group"},
                {label: "Automation center", name: "auto_center", icon: "fa fa-random"}];
            this.dashboardActions = [
                {label: "TV Mode", icon: "fa-caret-square-o-right", name: "tv_mode"},
                {label: "Add to Start", icon: "fa-caret-square-o-right", name: "to_start"},
                {label: "Delete", icon: "fa-trash", name: "delete"},
            ];
            this.state = {hasView: views.includes("dashboard")};
        },
        onClickEdit: function () {
            this.$el.append(this.renderOptions());
            this.bindAction();
        },
        onActiveDashboard: function () {
            const activeView = new ActiveDashboard(this, {...this.props});
            activeView.appendTo($("body"));
        },
        onClickItem: function (e) {
            const el = $(e.currentTarget), name = el.attr("name");
            if (name == "more_view") {
                this.renderMoreViews();
            } else if (name == "columns") {
                this.renderColumns();
            } else if (name == "tv_mode") {
                this.onActiveTVMode();
            } else if (name == "delete") {
                if (window.confirm("Do you really want to delete this Dashboard ?")) {
                    this.onDeleteView();
                }
            } else if (name == "to_start") {
                this.onPinToStart();
            }
        },
        onActiveTVMode: function () {
            $("body").addClass("tv_mode").append("<i class='fa fa-close closeTV' />");
            $('.closeTV').click(() => {
                $(".closeTV").remove();
                $("body").removeClass("tv_mode");
            });
        },
        onPinToStart: function () {
            const {viewInfo} = this.props, {view_id} = viewInfo;
            if (view_id) {
                this['_rpc']({
                    model: "ir.ui.view",
                    method: 'pin_to_start',
                    args: [view_id],
                    kwargs: {},
                }).then(() => {
                    window.location.reload();
                });
            }
        },
        onDeleteView: function () {
            const {viewInfo, env} = this.props, {view_id, type} = viewInfo,
                action = env.services.action.currentController.action;
            if (type == "dashboard" && view_id && action) {
                this['_rpc']({
                    model: "ir.ui.view",
                    method: 'remove_view',
                    args: [view_id],
                    kwargs: {},
                }).then(() => {
                    window.location.reload();
                });
            }
        },
        onClose: function () {
            this.$el.find(".wOpDialog").remove();
        },
        bindAction: function () {
            this.$el.find("._atDbView").click(this.onActiveDashboard.bind(this));
            this.$el.find("._icVs").click(this.onClickEdit.bind(this));
            this.$el.find(".opsItem").click(this.onClickItem.bind(this));
            $(window).click(this.onClose.bind(this));
            this.$el.click((e) => e.stopPropagation());
        },
        renderOptions: function () {
            const optionsEl = QWeb.render("DashboardStudio.Edit.Options", {options: this.dashboardActions});
            return optionsEl;
        },
        renderMoreViews: function () {
            const viewControl = new ViewControl(this, {});
            viewControl.renderElement();
            this.$el.append(viewControl.$el);
        },
        renderColumns: function () {
            const viewControl = new ViewControl(this, {step: 'setup', viewType: 'list'});
            viewControl.renderElement();
            this.$el.append(viewControl.$el);
        }
    });

    class DashboardStudioIcon extends Component {
        setup() {
            this.isShow = session['showDashboardEdit'];
        }

        mounted() {
            super.mounted();
            if (this.isShow) {
                const {viewType, views} = this.env.config;
                const editWidget = new MoreView(rootWidget, {
                    parent: rootWidget,
                    views: views.map((view) => view[1]),
                    env: this.env,
                    showActions: viewType == "dashboard" ? true : false,
                });
                editWidget.renderElement();
                $(this.el).append(editWidget.$el);
            }
        }
    }

    DashboardStudioIcon.components = {};
    DashboardStudioIcon.template = "dashboardStudio.Icon";
    ControlPanel.components = Object.assign(ControlPanel.components, {DashboardStudioIcon: DashboardStudioIcon});


    AbstractController.include({
        init: function (parent, model, renderer, params) {
            this._super.apply(this, arguments);
            this.viewInfo = params.viewInfo || {};
        },
        start: async function () {
            await this._super(this);
            if (this._controlPanelWrapper && session['showDashboardEdit']) {
                this.renderMoreView();
            }
        },
        renderMoreView: function () {
            const views = this.actionViews.map((view) => view.type), actionManager = this.getParent();
            const env = odoo.__WOWL_DEBUG__.root.env;
            const editWidget = new MoreView(this, {
                parent: this, viewInfo: this.viewInfo,
                views: views,
                env: env,
                showActions: this.viewType == "dashboard" ? true : false,
                actionManager: actionManager
            });
            editWidget.appendTo(this.$el.find(".o_cp_bottom_right"));
            // editWidget.renderElement();
            // this.$el.find(".o_cp_switch_buttons").append(editWidget.$el);
            // container.push(editWidget.$el[0]);
            // this.editWidget = editWidget;
        }
    });

    AbstractView.include({
        init: function (viewInfo, params) {
            this._super(viewInfo, params);
            this.controllerParams.viewInfo = viewInfo;
        }
    });

});
