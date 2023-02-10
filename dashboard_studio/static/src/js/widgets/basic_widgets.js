odoo.define('dashboard_studio.basic_widgets', function (require) {
    "use strict";

    var core = require('web.core');
    var base = require('dashboard_studio.base');
    var Dialog = require('web.Dialog');
    var Domain = require('web.Domain');
    var DomainSelectorDialog = require("web.DomainSelectorDialog");
    var colorPickerDialog = require('web.Colorpicker').ColorpickerDialog;
    var QWeb = core.qweb;

    var _t = core._t;


    var Tab = base.WidgetBase.extend({
        template: "DashboardStudio.Widget.Tab",
        init: function (parent, params) {
            this._super(parent, params);
            const {value, tabs} = params;
            this.state.value = value || Object.keys(tabs)[0];
        },
        onClickTab: function (e) {
            const tabName = $(e.currentTarget).attr("name");
            this.setState({value: tabName});
            this.renderElement();
        },
        bindAction: function () {
            this._super();
            this.$el.find(".tabItem").click(this.onClickTab.bind(this));
        },
        renderView: function () {
            const {tabs, onRender} = this.props, {value} = this.state;
            if (value in tabs) {
                this.$el.find(".wTabCon").append(tabs[value].render());
            }
            if (onRender) {
                onRender(value);
            }
        },
    });

    var ButtonDomain = base.WidgetBase.extend({
        custom_events: _.extend({}, base.WidgetBase.prototype.custom_events, {
            domain_changed: "_onDomainSelectorValueChange",
            domain_selected: "_onDomainSelectorDialogValueChange",
        }),
        template: 'DashboardStudio.Widget.ButtonDomain',
        init: function (parent, params) {
            this._super(parent, params);
            const {value, type} = params;
            this.state = {value: value || '[]', type: type || "input"};
            this.change = false;
        },
        _onDomainSelectorValueChange: function (e) {
        },
        _onDomainSelectorDialogValueChange: function (e) {
            const domain = Domain.prototype.arrayToString(e['data'].domain);
            this.setValue(domain);
            this.change = true;
        },
        onClickCondition: function () {
            this.renderDomainSelector();
        },
        bindAction: function () {
            this._super();
            this.$el.find(".btnDomain, .wInput > i").click(this.onClickCondition.bind(this));
        },
        setValue: function (newValue) {
            const {onChange} = this.props;
            console.log(newValue);
            this.setState({value: newValue});
            this.renderElement();
            if (onChange) {
                onChange(newValue);
            }
        },
        getValDomain: function () {
            const {value} = this.state;
            if (typeof value == "boolean") {
                return '[]';
            }
            return value;
        },
        renderDomainSelector: function () {
            const self = this, {model, onClose, options} = this.props;
            const domainSelector = new DomainSelectorDialog(this, model, this.getValDomain(), {
                readonly: false,
                debugMode: true,
                ...options
            });
            domainSelector.on('closed', this, function () {
                if (!onClose)
                    return;
                self.change ? onClose() : self.setValue(self.state.value);
                self.change = false;
            });
            domainSelector.open();
            this.ref.domainSelector = domainSelector;
        },
    });

    var RecordColor = base.WidgetBase.extend({
        template: "DashboardStudio.Widget.TreeColor",
        init: function (parent, params) {
            this._super(parent, params);
            const {value} = params;
            this.props = params;
            this.oldVal = value || {};
            this.state = {...value};
            this.viewInfo = {
                "decoration-danger": {}, "decoration-warning": {},
                "decoration-success": {}, "decoration-primary": {}, "decoration-info": {},
                "decoration-muted": {}, "decoration-bf": {placeholder: "Bold"},
                "decoration-it": {placeholder: "Italic"}
            };
        },
        onChange: function (name, value) {
            const {onChange} = this.props;
            this.setState({name: value});
            if (onChange) {
                onChange({name: name, value: value});
            }
        },
        renderView: function () {
            const self = this, wrap = self.$el.find(".wItem"), {model} = this.props;
            Object.keys(self.viewInfo).map((name) => {
                const info = self.viewInfo[name], input = new ButtonDomain(self, {
                    label: false,
                    name: name,
                    model: model,
                    value: self.state[name] || '[]',
                    classes: "colorItem",
                    onChange: (value) => this.onChange.bind(self)(name, value), ...info
                });
                input.appendTo(wrap);
            });
        },
    });

    // var ButtonDomain = base.WidgetBase.extend({
    //     custom_events: _.extend({}, base.WidgetBase.prototype.custom_events, {
    //         domain_changed: "_onDomainSelectorValueChange",
    //         domain_selected: "_onDomainSelectorDialogValueChange",
    //     }),
    //     template: 'DashboardStudio.Widget.ButtonDomain',
    //     init: function(parent, params) {
    //         this._super(parent, params);
    //         const {value} = params;
    //         this.state = {value: value || false};
    //     },
    //     _onDomainSelectorValueChange: function (e) {},
    //     _onDomainSelectorDialogValueChange: function (e) {
    //         const domain = Domain.prototype.arrayToString(e['data'].domain);
    //         this.setValue(domain);
    //     },
    //     onClickCondition: function () {
    //         this.renderDomainSelector();
    //     },
    //     bindAction: function () {
    //         this._super();
    //         this.$el.find(".btnDomain").click(this.onClickCondition.bind(this));
    //     },
    //     setValue: function (newValue) {
    //         const {onChange} = this.props;
    //         this.setState({value: newValue});
    //         this.renderElement();
    //         if (onChange) {
    //             onChange(newValue);
    //         }
    //     },
    //     getValDomain: function () {
    //         const {value} = this.state;
    //         if (typeof value == "boolean") {
    //             return '[]';
    //         }
    //         return value;
    //     },
    //     renderDomainSelector: function () {
    //         const {model} = this.props;
    //         this.ref.domainSelector = new DomainSelectorDialog(this, model, this.getValDomain(), {
    //             readonly: false,
    //             debugMode: true,
    //         });
    //         this.ref.domainSelector.open();
    //     },
    // });

    var ChooseColor = base.WidgetBase.extend({
        template: "DashboardStudio.Widget.ChooseColor",
        init: function (parent, params) {
            this._super(parent, params);
            const {value} = this.props;
            this.state = {value: value || "#5f5e5e"};
        },
        onClickShow: function () {
            const self = this, {onChange} = this.props;
            const dialog = new colorPickerDialog(this, {
                defaultColor: "#cdcdcd",
                noTransparency: true,
            }).open();
            dialog.on('color_picker:saved'.replace("_", ""), this, function (ev) {
                const color = ev.data.cssColor;
                self.setState({value: color});
                self.reload();
                onChange(color);
            });
            dialog.on('closed', this, () => {
                Promise.resolve().then(() => {
                });
            });
        },
        bindAction: function () {
            this.$el.find(".btnShow").click(this.onClickShow.bind(this));
        }
    });

    var ChooseIcon = base.WidgetBase.extend({
        template: "DashboardStudio.Widget.ChooseIcon",
        init: function (parent, params) {
            this._super(parent, params);
            this.state = {search: []};
            this.oldSearch = [];
            this.default = ['diamond', "bell", "calendar", "circle", "cube", "cubes",
                "flag", "folder-open", "home", "rocket", "sitemap", "area-chart", "balance-scale",
                "database", "globe", "institution", "random", "umbrella", "bed", "bolt", "commenting",
                "envelope", "flask", "magic", "pie-chart", "retweet", "shopping-basket", "star", "television", "tree",
                "thumbs-o-up", "file-o", "wheelchair", "code", "spinner", "ticket", "shield", "recycle", "phone",
                "microphone", "magnet", "info", "inbox", "heart", "bullseye", "cutlery", "credit-card", "briefcase"];
        },
        onKeyUp: function (e) {
            var search = $(e.currentTarget).val();
            search = search ? [search] : [];
            if (e.keyCode == 13) {
                this.setState({search: search, icon: false});
                this.renderContent();
                this.bindAction();
            }
            this.bindStyle();
        },
        onClickIcon: function (e) {
            const {onChange} = this.props, elIcon = $(e.currentTarget), icon = elIcon.attr("icon");
            this.setState({icon: icon});
            if (onChange) {
                onChange(icon)
            }
        },
        bindAction: function () {
            this.$el.find("input").keyup(this.onKeyUp.bind(this));
            this.$el.find(".iconItem").click(this.onClickIcon.bind(this));
        },
        renderContent: function () {
            const {search} = this.state;
            this.$el.find(".iconResult").empty().append(QWeb.render("DashboardStudio.Widget.ChooseIcon.Content",
                {icons: search.length ? search : this.default}));
        },
        renderView: function () {
            this.renderContent();
        }
    });

    var ChartProps = base.WidgetBase.extend({
        template: "DashboardStudio.Widget.ChartProps",
        init: function (parent, params) {
            this._super(parent, params);
            const {value} = params;
            this.state.value = value || {};
            this.modes = {};
            this.modes.bar = {title: "Bar", icon: "bar_icon.svg", value: {type: "bar"}};
            this.modes.stacked_bar = {
                title: "Stacked Bar",
                icon: "stacked_bar_icon.svg",
                value: {type: "bar", stacked: true}
            };
            this.modes.stacked_bar_100 = {
                title: "100% Stacked Bar",
                icon: "stacked_bar_100_icon.svg",
                value: {type: "bar", stacked: true}
            };
            this.modes.pie = {title: "Pie", icon: "pie_icon.svg", value: {type: "pie"}};
            this.modes.doughnut = {title: "Doughnut", icon: "donut_icon.svg", value: {type: "doughnut"}};
            this.modes.polar_area = {title: "Polar Area", icon: "polar_area_icon.svg", value: {type: "polar_area"}};
            this.modes.line = {title: "Line", icon: "line_icon.svg", value: {type: "line"}};
            this.modes.smooth_line = {
                title: "Smooth Line",
                icon: "smooth_line_icon.svg",
                value: {type: "line", smooth: true}
            };
            this.modes.stacked_line = {
                title: "Stacked Line",
                icon: "stacked_line_icon.svg",
                value: {type: "line", stacked: true}
            };
            this.modes.stacked_line_100 = {
                title: "100% Stacked Line",
                icon: "stacked_line_100_icon.svg",
                value: {type: "line", stacked: true}
            };
            this.modes.column = {title: "Column", icon: "column_icon.svg", value: {type: "column", stacked: true}};
            this.modes.stacked_column = {
                title: "Stacked Column",
                icon: "stacked_column_icon.svg",
                value: {type: "column", stacked: true}
            };
            this.modes.stacked_column_100 = {
                title: "100% Stacked Column",
                icon: "stacked_column_100_icon.svg",
                value: {type: "column", stacked: true}
            };
            this.modes.area = {title: "Area", icon: "area_icon.svg", value: {type: "line", area: true}};
            this.modes.stacked_area = {
                title: "Stacked Area",
                icon: "stacked_area_icon.svg",
                value: {type: "line", area: true, smooth: true, stacked: true}
            };
            this.modes.stacked_area_100 = {
                title: "100% Stacked Area",
                icon: "stacked_area_100_icon.svg",
                value: {type: "line", area: true, stacked: true}
            };
            this.groups = {
                most_popular: {title: "Most popular", modes: ["pie", "bar", "line", "stacked_bar"]},
                pie: {title: "Pie", modes: ["pie", "polar_area", "doughnut"]},
                line: {title: "Line", modes: ["line", "smooth_line", "stacked_line"]},
                bar: {title: "Bar", modes: ["bar", "stacked_bar", "column"]},
                // column: {title: "Column", modes: ["column", "stacked_column"]},
                area: {title: "Area", modes: ["area", "stacked_area"]},
            };

        },
        prepareValue: function (mode) {
        },
        onClickItem: function (itemInfo) {
            const {onChange} = this.props;
            if (onChange) {
                onChange(this.modes[itemInfo.name].value);
            }
        },
        renderView: function () {
            const groupsEl = Object.keys(this.groups).map((groupName) => {
                const group = this.groups[groupName],
                    groupEl = $(QWeb.render("DashboardStudio.Widget.ChartProps.Group", {group: group}));
                group.modes.map((modeName) => {
                    const item = this.modes[modeName],
                        itemEl = $(QWeb.render("DashboardStudio.Widget.ChartProps.Item", {item: item}));
                    itemEl.click(() => this.onClickItem.bind(this)(Object.assign({name: modeName}, item)));
                    groupEl.find(".glContent").append(itemEl);
                });
                return groupEl;
            });
            this.$el.find(".glGroups").empty().append(groupsEl);
        }
    });

    Dialog.specialConfirm = function (owner, message, options) {
        var buttons = [
            {
                text: _t("Cancel"),
                close: true,
                click: options && options.cancel_callback
            },
            {
                text: _t("Confirm"),
                classes: 'btn-primary',
                close: true,
                click: options && options.confirm_callback,
            }
        ];
        const dialog = new Dialog(owner, _.extend({
            size: options.size || 'medium',
            buttons: buttons,
            $content: options.html ? $('<main/>').html(message) : $('<main/>', {role: 'alert', text: message}),
            title: _t("Confirmation"),
            onForceClose: options && (options.onForceClose || options.cancel_callback),
        }, options));
        const _superAppendTo = dialog.appendTo.bind(dialog);
        dialog.appendTo = () => {
            return _superAppendTo().then(() => {
                dialog.$modal.addClass("specialConfirm");
            });
        }
        dialog.open({shouldFocusButtons: true});
        return dialog;
    };

    return {
        Tab: Tab,
        ChartProps: ChartProps,
        ButtonDomain: ButtonDomain,
        RecordColor: RecordColor,
        ChooseIcon: ChooseIcon,
        ChooseColor: ChooseColor
    };
});
