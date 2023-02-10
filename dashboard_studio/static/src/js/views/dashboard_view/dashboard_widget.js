odoo.define('dashboard_studio.DashboardWidgets', function (require) {
    "use strict";

    var core = require('web.core');
    var field_utils = require('web.field_utils');
    var TextEditor = require('web_editor.field.html');
    var base = require("dashboard_studio.base");

    var QWeb = core.qweb;

    var TitleWidget = base.WidgetBase.extend({
        template: "Dashboard.Widget.Title",
        init: function (parent, params) {
            this._super(parent, params);
            this.data = this.getViewInfoParams();
            const {icon, icon_color, icon_bg, font_color, type, measure} = this.data;
            this.state = {
                icon: icon || false, iconColor: icon_color,
                iconBg: icon_bg, fontColor: font_color, type: type, measure: measure
            };
        },
        willStart: function () {
            return Promise.all([this._super.apply(this, arguments), this.loadData()]);
        },
        prepareData: function (groups) {
            const {type, measure} = this.state, data = {};
            if (groups.length) {
                const sumName = type == "count" ? "__count" : measure;
                data.label = groups.reduce((total, group) => total + group[sumName], 0);
                if (type == "average") {
                    data.label = data.label / groups.reduce((total, group) => total + group.__count, 0);
                }
                if (data.label) {
                    data.label = this.formatNumber(this.round(data.label));
                }
            }
            return data;
        },
        loadData: function () {
            const self = this, {domain, viewInfo} = this.props, {groupBy} = this.state;
            return this['_rpc']({
                model: viewInfo.model,
                method: 'read_group',
                domain: (domain || []).concat(this.data.domain),
                fields: [],
                groupBy: groupBy || [],
                context: {},
            }).then((groups) => {
                const data = self.prepareData(groups);
                self.setState({data: data});
            });
        },
        bindStyle: function () {
            const {layout, icon_bg} = this.data;
            const el = this.$el.find(".wWTitleCon"), width = el.width(), widthWIcon = width / 2.5;
            el.css({height: `${widthWIcon}px`});
            el.find("i").css({fontSize: `${widthWIcon / 20}em`});
            this.$el.find("h3").css({fontSize: `${widthWIcon / 40}em`});
            this.$el.find(".wTitle a").css({fontSize: `${widthWIcon / 100}em`});
            if (layout == "layout_2") {
                const bgOp = this.hexToRGB(icon_bg, 60);
                this.$el.find(".wIcon").css({borderRight: `1px solid ${this.rgbToHex(bgOp)}`});
                this.$el.find(".wWTitleCon").css({backgroundImage: `repeating-linear-gradient(-45deg, ${bgOp} 0 1px, ${icon_bg} 1px 20px)`});
            }
        },
        appendTo: function (container) {
            const self = this;
            return this._super(container).then(() => {
                self.bindStyle();
            });
        },
        getViewInfoParams: function () {
            const {viewInfo} = this.props, arch = typeof(viewInfo.arch) == "string" ? $(viewInfo.arch) : viewInfo.arch;
            const getProp = (prop) => (arch.attrs ? arch.attrs[prop] : arch.attr(prop));
            return {
                icon: getProp("icon") || "picture-o",
                icon_color: getProp("icon_color") || "#4c4c4c",
                icon_bg: getProp("icon_bg") || "white",
                font_color: getProp("font_color") || "#4c4c4c",
                measure: getProp("measure"),
                type: getProp("type") || "count",
                title: getProp("title") || "Title",
                layout: getProp("layout") || "layout_1",
                domain: this.stringToArray(getProp("filter") || '[]'),
            }
        },
        renderView: async function () {
            await this.loadData();
        },
        renderElement: function () {
            this._super();
        }
    });

    var BatteryWidget = base.WidgetBase.extend({
        template: "Dashboard.Widget.Battery",
        init: function (parent, params) {
            this._super(parent, params);
            this.data = this.getViewInfoParams();
            this.state = {data: [], groupBy: this.data.groupBy, active: false};
            this.groups = {};
        },
        getViewInfoParams: function () {
            const {viewInfo} = this.props, arch = typeof(viewInfo.arch) == "string" ? $(viewInfo.arch) : viewInfo.arch;
            const getProp = (prop) => (arch.attrs ? arch.attrs[prop] : arch.attr(prop));
            return {
                groupBy: getProp("group_by") || false,
                domain: this.stringToArray(getProp("filter") || '[]'),
            }
        },
        willStart: function () {
            return Promise.all([this._super.apply(this, arguments), this.loadData()]);
        },
        loadData: async function () {
            const {domain, viewInfo} = this.props, {groupBy} = this.state;
            const groups = await this['_rpc']({
                model: viewInfo.model,
                method: 'read_group',
                domain: (domain || []).concat(this.data.domain),
                fields: [],
                groupBy: groupBy || [],
                context: {},
            });
            const data = this.prepareData(groups);
            this.setState({data: data, active: data.length ? data[0][groupBy] : "undefined"});
        },
        prepareData: function (groups) {
            const {groupBy} = this.state, self = this, countKey = groupBy ? `${groupBy}_count` : '__count',
                percentage = groups.reduce((total, group) => total + group[countKey], 0),
                colors = ["#2196F3", "#ffaa2d", "#8BC34A", "#926ed8", "#6eacd8", "#15e699"];
            const {fields} = this.props.viewInfo, labels = {};
            if (groupBy) {
                fields[groupBy].selection.map((option) => {
                    labels[option[0]] = option[1];
                });
            }
            groups.map((group, idx) => {
                group.percentage = group[countKey] / percentage * 100;
                group.bgColor = colors[idx];
                group.label = groupBy ? labels[group[groupBy]] : "Undefined";
                self.groups[groupBy ? group[groupBy] : "undefined"] = group;
            });
            return groups;
        },
        getBgColor: function (bgColor) {
            return `repeating-linear-gradient(-45deg, ${this.hexToRGB(bgColor, 80)} 0 1px, ${bgColor} 1px 20px)`;
        },
        hexToRGB: function (hex, opacity) {
            hex = hex.replace('#', '');
            const r = parseInt(hex.substring(0, 2), 16), g = parseInt(hex.substring(2, 4), 16),
                b = parseInt(hex.substring(4, 6), 16),
                result = 'rgba(' + r + ',' + g + ',' + b + ',' + opacity / 100 + ')';
            return result;
        },
        onClickStatus: function (group) {
            const {groupBy} = this.state;
            this.setState({active: group[groupBy]});
            this.renderPercentage();
            this.renderLabel();
            this.bindStyle();
        },
        bindStyle: function () {
            const el = this.$el.find(".wTKCon"), width = el.width() / 2, lgSize = width / 280;
            el.css({height: width / 2.3 + "px"});
            el.find("h3").css({fontSize: `${width / 170}em`});
            this.$el.find(".lgBgColor").css({width: lgSize * 15 + "px", height: lgSize * 15 + "px"});
            this.$el.find(".lgItem").css({fontSize: `${lgSize}em`});
        },
        roundPercentage: function (percentage) {
            return Math.round((percentage + Number.EPSILON) * 100) / 100
        },
        renderLabel: function () {
            const {active} = this.state, group = this.groups[active];
            const label = QWeb.render("Dashboard.Widget.Battery.statusLabel",
                {label: `${this.roundPercentage(group.percentage)}% ${group.label}`});
            this.$el.find(".wText").empty().append(label);
        },
        renderLegend: function () {
            const {data} = this.state;
            this.$el.find(".legendCon").empty().append(data.map((group) => {
                const item = $(QWeb.render("Dashboard.Widget.Battery.legendItem", {group: group}));
                item.click(() => this.onClickStatus.bind(this)(group));
                return item;
            }));
        },
        renderPercentage: function () {
            const {data, active, groupBy} = this.state;
            this.$el.find(".wStatusBar").empty().append(data.map((group) => {
                if (group[groupBy] == active) {
                    group = {...group, bgColor: this.getBgColor(group.bgColor)};
                }
                const item = $(QWeb.render("Dashboard.Widget.Battery.statusItem", {group: group}));
                item.click(() => this.onClickStatus.bind(this)(group));
                return item;
            }));
        },
        appendTo: function (container) {
            const self = this;
            return this._super(container).then(() => {
                self.bindStyle();
            });
        },
        renderView: async function () {
            // await this.loadData();
            this.renderPercentage();
            this.renderLabel();
            this.renderLegend();
        }
    });

    var YoutubeWidget = base.WidgetBase.extend({
        template: "Dashboard.Widget.Youtube",
        init: function (parent, params) {
            this._super(parent, params);
            const {link} = this.getViewInfoParams();
            this.state = {link: link || "https://www.youtube.com/embed/OBZMGgGjpLs"};
        },
        getViewInfoParams: function () {
            const {viewInfo} = this.props, arch = typeof(viewInfo.arch) == "string" ? $(viewInfo.arch) : viewInfo.arch;
            const getProp = (prop) => (arch.attrs ? arch.attrs[prop] : arch.attr(prop));
            return {
                link: getProp("link") || false,
            }
        },
    });

    var WidgetModel = base.WidgetBase.extend({
        loadData: function (params) {
            const {domain} = params;
            return this['_rpc']({
                model: "dashboard.widget.data",
                method: 'search_read',
                domain: domain || [],
                fields: [],
                groupBy: [],
                context: {},
            });
        },
        onRemove: function (res_id) {
            return this['_rpc']({
                model: "dashboard.widget.data",
                method: 'unlink',
                args: [res_id],
            });
        },
        onCreate: function (data) {
            return this['_rpc']({
                model: "dashboard.widget.data",
                method: 'create',
                args: [data],
            });
        },
        onWrite: function (res_id, data) {
            return this['_rpc']({
                model: "dashboard.widget.data",
                method: 'write',
                args: [res_id, data],
            });
        },
    });

    var TodoListWidget = base.WidgetBase.extend({
        template: "Dashboard.Widget.Todo",
        init: function (parent, params) {
            this._super(parent, params);
            this.info = {
                empty: {
                    label: "Create a new task to get started",
                    img: "/dashboard_studio/static/src/img/ic_todo_empty.png"
                },
                create: {label: "Create a new task"}
            }
            this.data = {completed: [], todo: []};
            this.state = {value: null};
            this.widgetModel = new WidgetModel(this, {});
        },
        prepareParams: function () {
            const viewInfo = $(this.props.viewInfo);
            return {};
        },
        prepareData: function (records) {
            const data = {todo: [], completed: []};
            records.map((record) => {
                data[record.state].push(record);
            });
            return data;
        },
        onKeyUp: async function (e) {
            e.stopPropagation();
            const {viewInfo} = this.props, newTask = $(e.currentTarget).val();
            if (e.keyCode == 13) {
                this.$el.find(".inputAdd").val("");
                await this.widgetModel.onCreate({name: newTask, type: "todo", view_id: viewInfo.view_id});
                this.renderView();
            }
        },
        onClickRemove: async function (e) {
            e.stopPropagation();
            const el = $(e.currentTarget), recordId = el.parents(".item").attr("data_id");
            await this.widgetModel.onRemove(recordId);
            this.renderView();
        },
        loadData: async function () {
            const {viewInfo} = this.props;
            const data = await this.widgetModel.loadData({domain: [['type', '=', 'todo'], ['view_id', '=', viewInfo.view_id]]});
            this.data = this.prepareData(data);
        },
        onReTodo: async function (e) {
            e.stopPropagation();
            const el = $(e.currentTarget), recordId = el.attr("data_id");
            await this.widgetModel.onWrite(recordId, {state: "todo"});
            this.renderView();
        },
        onCompleted: async function (e) {
            e.stopPropagation();
            const el = $(e.currentTarget), recordId = el.attr("data_id");
            await this.widgetModel.onWrite(recordId, {state: "completed"});
            this.renderView();
        },
        onShowTaskCompleted: function (e) {
            e.stopPropagation();
            const el = $(e.currentTarget), elWGroup = el.parent();
            elWGroup.hasClass("active") ? elWGroup.removeClass("active") : elWGroup.addClass("active");
        },
        bindAction: function () {
            this.$el.find(".inputAdd").unbind();
            this.$el.find(".inputAdd").keyup(this.onKeyUp.bind(this));
            this.$el.find(".item.todo").click(this.onCompleted.bind(this));
            this.$el.find(".item.taskCp").click(this.onReTodo.bind(this));
            this.$el.find(".wGHead").click(this.onShowTaskCompleted.bind(this));
            this.$el.find(".rmTask").click(this.onClickRemove.bind(this));
        },
        bindStyle: function () {
            this.$el.addClass("todoWidget");
        },
        renderContent: function () {
            const wTask = this.$el.find(".wContent").empty();
            wTask.append(QWeb.render("Dashboard.Widget.Todo.list", {data: this.data}));
        },
        renderEmpty: function () {
            const {empty} = this.info;
            const {completed, todo} = this.data, wEmpty = this.$el.find(".wEmpty").empty();
            if (!completed.length && !todo.length) {
                wEmpty.append(QWeb.render("Dashboard.Widget.Todo.empty", empty));
            }
        },
        renderView: async function () {
            this.$el.css({display: "none"});
            await this.loadData();
            this.renderEmpty();
            this.renderContent();
            this.bindAction();
            this.$el.css({display: "block"});
        }
    });

    var BookmarkWidget = base.WidgetBase.extend({
        template: "Dashboard.Widget.Todo",
        init: function (parent, params) {
            this._super(parent, params);
            this.info = {
                empty: {
                    label: "You have no saved bookmarks yet",
                    img: "/dashboard_studio/static/src/img/bookmark_empty.png"
                },
                create: {label: "Create a new bookmark"}
            };
            this.state = {value: null};
            this.widgetModel = new WidgetModel(this, {});
        },
        prepareData: function (records) {
            records.map((record) => {
                const link = document.createElement("a");
                link.href = record.name;
                record.link_icon = link.hostname;
            });
            return records;
        },
        loadData: async function () {
            const {viewInfo} = this.props;
            const data = await this.widgetModel.loadData({domain: [['type', '=', 'bookmark'], ['view_id', '=', viewInfo.view_id]]});
            this.data = this.prepareData(data);
        },
        onKeyUp: async function (e) {
            e.stopPropagation();
            const {viewInfo} = this.props, bookmark = $(e.currentTarget).val();
            if (e.keyCode == 13) {
                this.$el.find(".inputAdd").val("");
                await this.widgetModel.onCreate({name: bookmark, type: "bookmark", view_id: viewInfo.view_id});
                this.renderView();
            }
        },
        onClickRemove: async function (e) {
            e.stopPropagation();
            const el = $(e.currentTarget), recordId = el.parents(".item").attr("data_id");
            await this.widgetModel.onRemove(recordId);
            this.renderView();
        },
        bindAction: function () {
            this.$el.find(".inputAdd").unbind();
            this.$el.find(".inputAdd").keyup(this.onKeyUp.bind(this));
            this.$el.find(".rmTask").click(this.onClickRemove.bind(this));
        },
        bindStyle: function () {
            this.$el.addClass("bookmarkWidget");
        },
        renderContent: function () {
            const wTask = this.$el.find(".wContent").empty();
            wTask.append(QWeb.render("Dashboard.Widget.Bookmark.list", {list: this.data}));
        },
        renderEmpty: function () {
            const {empty} = this.info;
            const wEmpty = this.$el.find(".wEmpty").empty();
            if (!this.data.length) {
                wEmpty.append(QWeb.render("Dashboard.Widget.Todo.empty", empty));
            }
        },
        renderView: async function () {
            await this.loadData();
            this.renderEmpty();
            this.renderContent();
            this.bindAction();
        }
    });

    var CountDownWidget = base.WidgetBase.extend({
        template: "Dashboard.Widget.CountDown",
        init: function (parent, params) {
            this._super(parent, params);
            const {deadline, format} = this.getViewInfoParams();
            this.state = {deadline: moment(deadline, format)};
        },
        getViewInfoParams: function () {
            const {viewInfo} = this.props, arch = typeof(viewInfo.arch) == "string" ? $(viewInfo.arch) : viewInfo.arch;
            return {
                deadline: (arch.attrs ? arch.attrs.deadline : arch.attr("deadline")) || "1-28-2022",
                format: (arch.attrs ? arch.attrs.format : arch.attr("format")) || "MM-DD-YYYY"
            }
        },
        getTimeRemaining: function (deadline) {
            const time = Date.parse(deadline) - Date.parse(new Date());
            if (time < 0) {
                return false;
            }
            const seconds = Math.floor((time / 1000) % 60), minutes = Math.floor((time / 1000 / 60) % 60),
                hours = Math.floor((time / (1000 * 60 * 60)) % 24), days = Math.floor(time / (1000 * 60 * 60 * 24));
            return {
                'total': time,
                'days': days,
                'hours': hours,
                'minutes': minutes,
                'seconds': seconds
            };
        },
        updateClock: function () {
            const {deadline} = this.state, time = this.getTimeRemaining(deadline);
            if (time) {
                this.$el.find('.days').text(time.days);
                this.$el.find('.hours').text(('0' + time.hours).slice(-2));
                this.$el.find('.minutes').text(('0' + time.minutes).slice(-2));
                this.$el.find('.seconds').text(('0' + time.seconds).slice(-2));
            } else {
                clearInterval(this.timeinterval);
            }
        },
        bindStyle: function () {
            const width = this.$el.width(), widthWIcon = width / 2.5;
            this.$el.find(".unit-value").css({fontSize: `${widthWIcon / 80}em`});
            this.$el.find(".unit-name").css({fontSize: `${widthWIcon / 150}em`});
        },
        appendTo: function (container) {
            const self = this;
            return this._super(container).then(() => {
                self.startClock();
                self.bindStyle();
            });
        },
        startClock: function () {
            this.updateClock();
            this.timeinterval = setInterval(this.updateClock.bind(this), 1000);
        },
    });

    var TextWidget = base.WidgetBase.extend({
        template: "Dashboard.Widget.Text",
        custom_events: _.extend({}, base.WidgetBase.prototype.custom_events || {}, {
            field_changed: '_onFieldChanged',
        }),
        init: function (parent, params) {
            this._super(parent, params);
            this.widgetModel = new WidgetModel(this, {});
        },
        nodeField: function (params = {}) {
            const {fieldName, props} = params;
            let newField = {tag: "field"}, attributes = {...(props || {}), modifiers: {}, name: fieldName};
            newField.attrs = attributes;
            newField.children = [];
            return newField;
        },
        _onFieldChanged: function (ev) {
            ev.stopPropagation();
            const newValue = ev.data.changes["text_edit"], {viewInfo} = this.props;
            this.widgetModel.onCreate({name: newValue, type: "text", view_id: viewInfo.view_id});
        },
        prepareField: function () {
            var {viewInfo} = this.props, data = null;
            if (viewInfo.data.length) {
                data = viewInfo.data[0].name;
            }
            const record = {
                data: {text_edit: data},
                fields: {text_edit: {string: "Text", type: "char"}},
                fieldsInfo: {text: {text_edit: this.nodeField({fieldName: 'text_edit'})}},
                getContext: () => ({})
            }
            return record;
        },
        bindStyle: function () {
            const headHeight = this.$el.find(".panel-heading").outerHeight();
            this.$el.find(".note-editing-area").css({height: `calc(100% - ${headHeight}px)`});
        },
        renderView: function () {
            const self = this, {editMode} = this.props, widget = new TextEditor(this, "text_edit", this.prepareField(),
                {viewType: 'text', mode: editMode === false ? "readonly" : "edit"});
            widget.appendTo(self.$el.find(".wTextCon")).then(() => {
                self.bindAction();
                self.bindStyle();
            });
            this.ref.view = widget;
        },
    });

    var ListSQL = base.WidgetBase.extend({
        template: "Dashboard.Widget.TableSQl",
        init: function (parent, params) {
            this._super(parent, params);
            const {viewInfo} = this.props;
            this.state = {header: [], data: [], query: viewInfo.arch.attrs.query};
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
    });

    return {
        TextWidget: TextWidget,
        ListSQL: ListSQL,
        CountDownWidget: CountDownWidget,
        TitleWidget: TitleWidget,
        BatteryWidget: BatteryWidget,
        YoutubeWidget: YoutubeWidget,
        TodoListWidget: TodoListWidget,
        BookmarkWidget: BookmarkWidget
    };
});
