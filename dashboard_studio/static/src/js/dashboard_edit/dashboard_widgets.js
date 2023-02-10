odoo.define('dashboard_studio.dashboard', function (require) {
"use strict";

    var DashboardWidget = require('dashboard_studio.DashboardWidgets');
    var baseEdit = require('dashboard_studio.views_edit_base');
    var basic_fields = require('dashboard_studio.basic_fields');
    var basic_widgets = require('dashboard_studio.basic_widgets');

    var CountDownWidgetProps = baseEdit.ViewProps.extend({
        init: function(parent, props) {
            this._super(parent, props);
            this.hideTab = true;
            this.nodeProps.deadline = {name: 'deadline', valType: "string", label: 'Deadline', widget: basic_fields.Datetime};
            this.viewPropsView = ["deadline"];
        },
        onChangeProp: function (node, prop, value) {
            const {onChangeProp} = this.props;
            if (prop.name == "deadline") {
                node.attrs['deadline'] = value._i;
                node.attrs['format'] = value._f;
                return onChangeProp(node);
            }
            this._super(node, prop, value);
        },
    });

    var CountDownWidget = baseEdit.ViewContent.extend({
        template: 'DashboardStudio.View.View',
        init: function(parent, params) {
            this._super(parent, params);
            this.viewConfig.prop = CountDownWidgetProps;
            this.viewConfig.view = DashboardWidget.CountDownWidget;
        },
        renderViewContent: function () {
            const self = this, {viewInfo} = this.props;
            const viewView = new this.viewConfig.view(this, {...this.prepareViewParams(), viewInfo: viewInfo});
            viewView.appendTo(self.$el.find(".viewView").addClass("countdownWidget").empty());
        }
    });

    var TodoWidgetProps = baseEdit.ViewProps.extend({
        init: function(parent, props) {
            this._super(parent, props);
            this.hideTab = true;
            this.viewPropsView = [];
        },
    });

    var TodoWidget = baseEdit.ViewContent.extend({
        template: 'DashboardStudio.View.View',
        init: function(parent, params) {
            this._super(parent, params);
            this.viewConfig.prop = TodoWidgetProps;
            this.viewConfig.view = DashboardWidget.TodoListWidget;
        },
        renderViewContent: function () {
            const self = this, {viewInfo} = this.props;
            const viewView = new this.viewConfig.view(this, {...this.prepareViewParams(), viewInfo: viewInfo});
            viewView.renderElement();
            self.$el.find(".viewView").addClass("todoWidget").empty().append(viewView.$el);
        }
    });

    var BookmarkWidgetProps = baseEdit.ViewProps.extend({
        init: function(parent, props) {
            this._super(parent, props);
            this.hideTab = true;
            this.viewPropsView = [];
        },
    });

    var BookmarkWidget = baseEdit.ViewContent.extend({
        template: 'DashboardStudio.View.View',
        init: function(parent, params) {
            this._super(parent, params);
            this.viewConfig.prop = BookmarkWidgetProps;
            this.viewConfig.view = DashboardWidget.BookmarkWidget;
        },
        renderViewContent: function () {
            const self = this, {viewInfo} = this.props;
            const viewView = new this.viewConfig.view(this, {...this.prepareViewParams(), viewInfo: viewInfo});
            viewView.renderElement();
            self.$el.find(".viewView").addClass("bookmarkWidget").empty().append(viewView.$el);
        }
    });

    var BatteryWidgetProps = baseEdit.ViewProps.extend({
        init: function(parent, props) {
            this._super(parent, props);
            this.hideTab = true;
            const {fields, model} = this.props.viewInfo;
            this.nodeProps.group_by = {name: 'group_by', valType: "string", label: 'Group By', widget: basic_fields.ChooseField,
                fields: fields, fieldTypes: ["selection"], condition: (field) => field.store && field.name != 'id'};
            this.nodeProps.filter = {name: 'filter', valType: "string", label: 'Filter', widget: basic_widgets.ButtonDomain, props: {model: model}};
            this.viewPropsView = ["model", "filter", "group_by"];
        },
        onChangeModel: async function (node, value) {
            delete node.attrs["filter"];
            delete node.attrs["group_by"];
            this._super(node, value);
        }
    });

    var BatteryWidget = baseEdit.ViewContent.extend({
        template: 'DashboardStudio.View.View',
        init: function(parent, params) {
            this._super(parent, params);
            this.viewConfig.prop = BatteryWidgetProps;
            this.viewConfig.view = DashboardWidget.BatteryWidget;
        },
        renderViewContent: function () {
            const self = this, {viewInfo} = this.props;
            const viewView = new this.viewConfig.view(this, {...this.prepareViewParams(), viewInfo: viewInfo});
            viewView.appendTo(self.$el.find(".viewView").addClass("batteryWidget").empty())
        }
    });

    var YoutubeWidgetProps = baseEdit.ViewProps.extend({
        init: function(parent, props) {
            this._super(parent, props);
            this.hideTab = true;
            this.nodeProps.link = {name: 'link', valType: "string", label: 'YouTube Link', widget: basic_fields.Input};
            this.viewPropsView = ["link"];
        },
        onChangeProp: function (node, prop, value) {
            if (prop.name == "link") {
                value = value.replace("watch?v=", "embed/");
            }
            this._super(node, prop, value);
        },
    });

    var YoutubeWidget = baseEdit.ViewContent.extend({
        template: 'DashboardStudio.View.View',
        init: function(parent, params) {
            this._super(parent, params);
            this.viewConfig.prop = YoutubeWidgetProps;
            this.viewConfig.view = DashboardWidget.YoutubeWidget;
        },
        renderViewContent: function () {
            const self = this, {viewInfo} = this.props;
            const viewView = new this.viewConfig.view(this, {...this.prepareViewParams(), viewInfo: viewInfo});
            viewView.renderElement();
            self.$el.find(".viewView").empty().append(viewView.$el);
        }
    });

    var TitleWidgetProps = baseEdit.ViewProps.extend({
        init: function(parent, props) {
            this._super(parent, props);
            this.hideTab = true;
            const {fields, model} = this.props.viewInfo;
            this.nodeProps.icon_color = {name: 'icon_color', valType: 'string', label: 'Icon Color', widget: basic_widgets.ChooseColor};
            this.nodeProps.icon_bg = {name: 'icon_bg', valType: 'string', label: 'Icon Background', widget: basic_widgets.ChooseColor};
            this.nodeProps.font_color = {name: 'font_color', valType: 'string', label: 'Font Color', widget: basic_widgets.ChooseColor};
            this.nodeProps.icon = {name: 'icon', valType: 'string', label: "Icon", widget: basic_widgets.ChooseIcon};
            this.nodeProps.type = {name: 'type', valType: "string", label: 'Type', widget: basic_fields.Selection};
            this.nodeProps.layout = {name: 'layout', valType: "string", label: 'Layout', widget: basic_fields.Selection};
            this.nodeProps.title = {name: 'title', valType: "string", label: 'Title', widget: basic_fields.Input};
            this.nodeProps.filter = {name: 'filter', valType: "string", label: 'Filter', widget: basic_widgets.ButtonDomain, props: {model: model}};
            this.nodeProps.measure = {name: 'measure', valType: "string", label: 'Measure', widget: basic_fields.ChooseField,
                fields: fields, fieldTypes: ['integer', 'float', 'monetary'], condition: (field) => field.store && field.name != 'id'};
            this.viewPropsView = ["model", "title", "type", "measure", "layout", "filter", "icon_color", "font_color", "icon_bg", "icon"];
        },
        prepareParamsProp: function (node, viewPropsView) {
            const propsProp = this._super(node, viewPropsView);
            propsProp.type.options = [{label: 'Count', value: 'count'}, {label: 'Sum', value: 'sum'}, {label: 'Average', value: 'average'}];
            propsProp.layout.options = [{label: 'Layout 1', value: 'layout_1'}, {label: 'Layout 2', value: 'layout_2'}];
            return propsProp;
        },
    });

    var TitleWidget = baseEdit.ViewContent.extend({
        template: 'DashboardStudio.View.View',
        init: function(parent, params) {
            this._super(parent, params);
            this.viewConfig.prop = TitleWidgetProps;
            this.viewConfig.view = DashboardWidget.TitleWidget;
        },
        renderViewContent: function () {
            const self = this, {viewInfo} = this.props;
            const viewView = new this.viewConfig.view(this, {...this.prepareViewParams(), viewInfo: viewInfo});
            viewView.appendTo(self.$el.find(".viewView").addClass("titleWidget").empty())
        }
    });

    var TextWidgetProps = baseEdit.ViewProps.extend({
        init: function(parent, props) {
            this._super(parent, props);
            this.hideTab = true;
            this.viewPropsView = [];
        },
    });

    var TextWidget = baseEdit.ViewContent.extend({
        template: 'DashboardStudio.View.View',
        init: function(parent, params) {
            this._super(parent, params);
            this.viewConfig.prop = TextWidgetProps;
            this.viewConfig.view = DashboardWidget.TextWidget;
        },
        renderViewContent: function () {
            const self = this, {viewInfo} = this.props;
            const viewView = new this.viewConfig.view(this, {...this.prepareViewParams(), viewInfo: viewInfo});
            viewView.appendTo(self.$el.find(".viewView").addClass("textWidget").empty());
        }
    });

    return {CountDownWidget: CountDownWidget, TodoWidget: TodoWidget, BookmarkWidget: BookmarkWidget, TitleWidget: TitleWidget, YoutubeWidget: YoutubeWidget, BatteryWidget: BatteryWidget, TextWidget: TextWidget};

});
