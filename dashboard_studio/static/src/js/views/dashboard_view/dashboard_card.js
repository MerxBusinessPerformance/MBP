odoo.define('dashboard_studio.DashboardCard', function (require) {
    "use strict";

    var DashboardWidgets = require('dashboard_studio.DashboardWidgets');
    var Domain = require('web.Domain');
    // var GraphView = require('web.GraphView');
    var ListView = require('web.ListView');
    var CalendarView = require('web.CalendarView');
    var utils = require('web.utils');
    // var PivotView = require('web.PivotView');
    var PlanningView = require('dashboard_studio.PlanningView');
    var TextEditor = require('web_editor.field.html');
    var core = require('web.core');
    var base = require("dashboard_studio.base");
    var {View} = require("@web/views/view");
    var {ViewContainer} = require('dashboard_studio.ViewContainer');
    const {mount} = owl;

    var QWeb = core.qweb;


    var DashboardCard = base.WidgetBase.extend({
        template: "Dashboard.WidgetItem",
        init: function (parent, params) {
            this._super(parent, params);
            const {record} = this.props, {title} = record || {};
            this.state = {...this.state, title: title, edit: false};
            const {BookmarkWidget, TodoListWidget, TitleWidget, TextWidget, YoutubeWidget, BatteryWidget, CountDownWidget} = DashboardWidgets;
            this.widgets = {
                graph: {render: () => this.renderTrendView.bind(this)()},
                list: {render: () => this.renderViews.bind(this)(ListView)},
                pivot: {render: () => this.renderTrendView.bind(this)()},
                calendar: {render: () => this.renderViews.bind(this)(CalendarView)},
                plan: {render: () => this.renderViews.bind(this)(PlanningView)},
                bookmark: {render: () => this.renderWidget.bind(this)(BookmarkWidget)},
                todo: {render: () => this.renderWidget.bind(this)(TodoListWidget)},
                text: {render: () => this.renderWidget.bind(this)(TextWidget)},
                title: {render: () => this.renderWidget.bind(this)(TitleWidget)},
                youtube: {render: () => this.renderWidget.bind(this)(YoutubeWidget)},
                battery: {render: () => this.renderWidget.bind(this)(BatteryWidget)},
                countdown: {render: () => this.renderWidget.bind(this)(CountDownWidget)},
            };
        },
        prepareViewParams: function () {
            const {record, editMode} = this.props, {viewInfo} = record, {model} = viewInfo || {};
            return {
                modelName: model,
                isEmbedded: true,
                editMode: editMode,
                withButtons: false,
                fromEdit: true,
                fromDashboard: true,
                withControlPanel: false,
            };
        },
        onSaveTitle: function () {
            this.setState({edit: false});
            this.renderTitle();
        },
        onKeyUp: function (e) {
            const value = $(e.currentTarget).val();
            this.setState({title: value});
            if (e.keyCode == 13) {
                this.onSaveTitle()
            }
        },
        binAction: function () {
            this.$el.find(".inputRename").keyup(this.onKeyUp.bind(this));
        },
        bindStyle: function () {
            const {record} = this.props, {view_type} = record;
            this.$el.attr({widget_type: view_type});
        },
        renderTitle: function () {
            const {edit, title} = this.state;
            if (this.ref.title) {
                this.ref.title.remove();
            }
            this.ref.title = $(QWeb.render("Dashboard.WidgetItem.title", {title: title, edit: edit}));
            this.$el.find(".wiHead").append(this.ref.title);
            this.binAction();
        },
        isListSQL: function () {
            var {record} = this.props, {viewInfo} = record, sql = false;
            if (!viewInfo.arch.attrs) {
                const arch_json = eval('utils.xml_to_json((new DOMParser()).parseFromString(record.viewInfo.arch, "text/xml"), false)');
                sql = arch_json.attrs.sql;
                if (sql) {
                    viewInfo.archXml = viewInfo.arch;
                    viewInfo.arch = arch_json;
                }
            }
            return sql;
        },
        renderViews: async function (_View) {
            var self = this, {record} = this.props, {model} = record.viewInfo, sql = false;
            if (this.isListSQL()) {
                return this.renderWidget(DashboardWidgets.ListSQL);
            }
            if (record.viewInfo) {
                const info = {
                    View: _View,
                    viewInfo: record.viewInfo,
                    viewParams: this.prepareViewParams()
                }
                const env = odoo.__WOWL_DEBUG__.root.env;
                await mount(ViewContainer, {
                    env,
                    props: {info: info, isLegacy: true},
                    target: self.$el.find(".wiContent")[0],
                    position: "first-child"
                });
            }
        },
        getSearchParams: function () {
            const {viewInfo} = this.props.record, arch = typeof(viewInfo.arch) == "string" ? $(viewInfo.arch) : viewInfo.arch;
            const getProp = (prop) => (arch.attrs ? arch.attrs[prop] : arch.attr(prop));
            return {
                domain: Domain.prototype.stringToArray(getProp("filter") || '[]'),
            }
        },
        renderTrendView: async function () {
            const self = this, {record} = this.props, {fields, arch, model} = record.viewInfo;
            if (record.viewInfo) {
                const props = {
                    arch: arch,
                    fields: fields,
                    resModel: model,
                    type: record.view_type,
                    context: {},
                    display: {
                        controlPanel: false,
                    },
                    ...this.getSearchParams()
                }
                const env = odoo.__WOWL_DEBUG__.root.env;
                await mount(View, {
                    env,
                    props: props,
                    target: self.$el.find(".wiContent")[0],
                    position: "first-child"
                });
            }
        },
        renderWidget: function (widget) {
            const self = this, {record, editMode} = this.props;
            const _widget = new widget(this, {viewInfo: record.viewInfo, editMode: editMode});
            _widget.appendTo(self.$el.find(".wiContent"));
            self.ref.view = _widget;
        },
        renderContent: function () {
            const {record} = this.props, {view_type} = record;
            this.widgets[view_type].render();
        },
        renderView: function () {
            this.renderTitle();
            this.renderContent();
        }
    });

    return {DashboardCard: DashboardCard};
});
