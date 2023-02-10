odoo.define('dynamic_odoo.basic_widgets', function (require) {
    "use strict";

    var core = require('web.core');
    var base = require('dynamic_odoo.base');
    var Domain = require('web.Domain');
    var Dialog = require('web.Dialog');
    var DomainSelectorDialog = require("web.DomainSelectorDialog");
    var colorPickerDialog = require('web.Colorpicker').ColorpickerDialog;
    var ModelFieldSelector = require("web.ModelFieldSelector");
    var TextEditor = require('web_editor.field.html');
    var basicFields = require("dynamic_odoo.basic_fields");
    var view_dialogs = require('web.view_dialogs');
    var FormViewDialog = view_dialogs.FormViewDialog;
    var QWeb = core.qweb;
    var rootWidget = require('root.widget');

    var _t = core._t;

    Dialog.include({
        init: function (parent, options) {
            this._super(parent, options);
            this.props = options;
        },
        appendTo: function () {
            const self = this, res = this._super(), {studio, classes} = this.props;
            if (studio) {
                return res.then(() => {
                    self.$modal.addClass("studioConfirm");
                    self.$modal.addClass(classes);
                    self.$el.addClass("_divSB");
                });
            }
            return res;
        }
    });

    Dialog.studioConfirm = function (owner, message, options) {
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
                dialog.$modal.addClass("studioConfirm");
            });
        }
        dialog.open({shouldFocusButtons: true});
        return dialog;
    };

    var Tab = base.WidgetBase.extend({
        template: "ViewStudio.Widget.Tab",
        init: function (parent, params) {
            this._super(parent, params);
            const {value, tabs} = params;
            this.isFirst = true;
            this.state.value = value || Object.keys(tabs)[0];
        },
        onClickTab: function (e) {
            e.stopPropagation();
            e.stopImmediatePropagation();
            const {onClickTab} = this.props, tabName = $(e.currentTarget).attr("name");
            this.setState({value: tabName});
            this.isFirst = false;
            this.renderElement();
            if (onClickTab) {
                onClickTab();
            }
        },
        bindAction: function () {
            this._super();
            this.$el.find(".tabItem").click(this.onClickTab.bind(this));
        },
        renderView: function () {
            const {tabs} = this.props, {value} = this.state;
            if (value in tabs) {
                this.$el.find(".wTabCon").empty().append(tabs[value].render());
            }
        },
        renderElement: function () {
            this._super();
            const {onRender} = this.props, {value} = this.state;
            if (onRender) {
                onRender(value);
            }
        }
    });

    var _ModelFieldSelector = ModelFieldSelector.extend({
        init: function (parent, model, chain, options) {
            this._super(parent, model, chain, options);
            this.props = options;
        },
        _selectField: function (field) {
            const {onChange, gChain} = this.props;
            this._super(field);
            onChange(gChain ? this.chain : field.name);
        },
        _removeChainNode: function () {
            this._super();
            const {onChange} = this.props;
            if (!this.chain.length) {
                onChange(false);
            }
        },
        reSetOffset: function () {
            const {top} = this.$el.offset(), outerHeight = this.$el.outerHeight();
            this.$popover.offset({top: top + outerHeight + 7});
        },
        _onFocusIn: function () {
            this._super();
            this.reSetOffset();
            this.$el.parents("._divSB").addClass("noScroll");
        },
        _onFocusOut: function () {
            this._super();
            this.$el.parents("._divSB").removeClass("noScroll");
        }
    });

    var ChooseField = base.WidgetBase.extend({
        template: "ViewStudio.Widget.ChooseField",
        init: function (parent, params) {
            this._super(parent, params);
            const {value} = params;
            this.state = {value: value || false};
        },
        bindStyle: function () {
            this._super();
            const selector = this.$el.find(".o_field_selector");
            if (selector.length) {
                const sHeight = selector.outerHeight(), sOffset = selector.offset();
                this.$el.find(".o_field_selector_popover").css({
                    left: sOffset.left + "px",
                    top: (sHeight + sOffset.top + 1) + "px"
                });
            }
        },
        renderView: function () {
            var self = this, {model, filter, fields, onChange, gChain, followRelations} = this.props, {value} = this.state,
                fsOptions = {
                    readonly: false,
                    followRelations: followRelations || false,
                    gChain: gChain,
                    onChange: onChange
                },
                chain = [];
            if (filter) {
                fsOptions.filter = filter;
            }
            if (fields) {
                fsOptions.fields = fields;
            }
            if (value) {
                chain = Array.isArray(value) ? value : [value];
            }
            const fieldSelector = new _ModelFieldSelector(this, model || false, chain, fsOptions);
            fieldSelector.appendTo(this.$el.find(".wCon").empty()).then(() => {
                self.bindStyle();
            });
            this.ref.fieldSelector = fieldSelector;
        }
    });

    var ChooseFieldDialog = base.WidgetBase.extend({
        renderView: function () {
            const {onChange, onClose} = this.props;
            const chooseField = new ChooseField(this, Object.assign({followRelations: true}, this.props, {
                onChange: () => {
                }
            }));
            chooseField.renderElement();
            this.dialog = new Dialog(this, {
                buttons: [
                    {
                        text: _t("Cancel"),
                        classes: 'btn',
                        close: true,
                        click: () => {
                            if (onClose) {
                                onClose();
                            }
                        }
                    },
                    {
                        text: _t("Save"),
                        classes: 'btn-primary',
                        close: true,
                        click: () => {
                            onChange(chooseField.ref.fieldSelector.chain.join("."));
                        },
                    },
                ],
                $content: chooseField.$el,
                size: 'medium',
                studio: true,
                classes: "dialogOptions",
                title: _t("Choose Field"),
            });
            const superFnc = this.dialog.willStart;
            this.dialog.willStart = async () => {
                const res = await superFnc.bind(this.dialog)();
                this.dialog.$modal.find(".close").click(() => {
                    if (onClose) {
                        onClose();
                    }
                });
                return res;
            }
            this.dialog.open();
        }
    });


    var ButtonDomain = base.WidgetBase.extend({
        custom_events: _.extend({}, base.WidgetBase.prototype.custom_events, {
            domain_changed: "_onDomainSelectorValueChange",
            domain_selected: "_onDomainSelectorDialogValueChange",
        }),
        template: 'ViewStudio.Widget.ButtonDomain',
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


    var ChooseColor = base.WidgetBase.extend({
        template: "ViewStudio.Widget.ChooseColor",
        init: function (parent, params) {
            this._super(parent, params);
            const {value} = this.props;
            this.state = {value: value || "#5f5e5e"};
        },
        initParams: function () {
            this.colors = ["#f44336", "#e91e63", "#9c27b0", "#424869", "#673ab7", "#3f51b5", "#2196f3", "#03a9f4", "#00bcd4",
                "#009688", "#4caf50", "#8bc34a", "#cddc39", "#ffeb3b", "#ffc107", "#ff9800", "#ff5722", "#795548",
                "#9e9e9e", "#607d8b", "white"];
        },
        onClickShow: function () {
            const self = this, {onChange, type, wrap} = this.props;
            if (type == "simple") {
                const elChoose = $(QWeb.render("ChooseColor.ColorSimple", {colors: this.colors}));
                elChoose.find(".itCl").click((e) => {
                    const el = $(e.currentTarget);
                    onChange(el.attr("data"));
                });
                (wrap || this.$el).append(elChoose);
            } else {
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
            }
        },
        bindAction: function () {
            this.$el.find(".btnShow").click(this.onClickShow.bind(this));
        }
    });

    var ChooseIcon = base.WidgetBase.extend({
        template: "ViewStudio.Widget.ChooseIcon",
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
            this.$el.find(".iconResult").empty().append(QWeb.render("ViewStudio.Widget.ChooseIcon.Content",
                {icons: search.length ? search : this.default}));
        },
        renderView: function () {
            this.renderContent();
        }
    });

    var ChartProps = base.WidgetBase.extend({
        template: "ViewStudio.Widget.ChartProps",
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
            this.modes.donut = {title: "Donut", icon: "donut_icon.svg", value: {type: "donut"}};
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
                most_popular: {title: "Chart Type", modes: ["pie", "bar", "line", "stacked_bar"]},
                // pie: {title: "Pie", modes: ["pie", "polar_area", "donut"]},
                // line: {title: "Line", modes: ["line", "smooth_line", "stacked_line"]},
                // bar: {title: "Bar", modes: ["bar", "stacked_bar", "column"]},
                // column: {title: "Column", modes: ["column", "stacked_column"]},
                // area: {title: "Area", modes: ["area", "stacked_area"]},
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
                    groupEl = $(QWeb.render("ViewStudio.Widget.ChartProps.Group", {group: group}));
                group.modes.map((modeName) => {
                    const item = this.modes[modeName],
                        itemEl = $(QWeb.render("ViewStudio.Widget.ChartProps.Item", {item: item}));
                    itemEl.click(() => this.onClickItem.bind(this)(Object.assign({name: modeName}, item)));
                    groupEl.find(".glContent").append(itemEl);
                });
                return groupEl;
            });
            this.$el.find(".glGroups").empty().append(groupsEl);
        }
    });

    var ViewMoreProps = base.WidgetBase.extend({
        template: "ViewEdit.ViewMore",
        init: function (parent, params) {
            this._super(parent, params);
            this.newField = params.node.newField || false;
        },
        onClickShow: function (e) {
            let self = this;
            // const {node} = this.props, {name} = node.attrs, {viewInfo} = this.getParent().props;
            const {field_name, model} = this.props;
            this['_rpc']({
                model: "studio.view.center",
                method: 'get_field_id',
                args: [field_name, model]
            }).then(function (fieldId) {
                let options = {
                    res_model: "ir.model.fields", res_id: fieldId,
                    context: {studio: true}, title: "Change Field Property", view_id: false,
                    disable_multiple_selection: true,
                };
                var dialog = new FormViewDialog(self, options);
                dialog.open();
            });
        },
        onRemove: function (e) {
            e.stopPropagation();
            const {onRemoveNode} = this.props;
            if (onRemoveNode) {
                onRemoveNode();
            }
        },
        bindAction: function () {
            this.$el.find(".btnMore").click(this.onClickShow.bind(this));
            this.$el.find(".btnRemove").click(this.onRemove.bind(this));
        }
    });

    var OptionsEdit = base.WidgetBase.extend({
        template: "ViewStudio.Widget.OptionsEdit",
        init: function (parent, params) {
            this._super(parent, params);
            const {options} = this.props;
            this.info = {
                empty: {
                    label: "Create a option for Selection",
                    img: "/dynamic_odoo/static/src/img/ic_todo_empty.png"
                },
                create: {label: "Create a new option"}
            }
            this.state = {value: null, options: options || []};
            this.newOptions = [];
        },
        onAddOption: function (option) {
            const {options} = this.state, newOptions = options.slice();
            option = [option.split(" ").map((ch) => ch.toLowerCase()).join("_"), option];
            if (!options.filter((op) => op[0] == option[0]).length) {
                newOptions.push(option);
                this.newOptions.push(option[0]);
                this.setState({options: newOptions, active: false});
                this.renderOptions();
                return this.bindAction();
            }
            alert(_t("Conflict data !"));
        },
        onKeyUp: function (e) {
            e.stopPropagation();
            e.stopImmediatePropagation();
            const option = $(e.currentTarget).val();
            if (e.keyCode == 13) {
                this.$content.find(".inputAdd").val("");
                this.onAddOption(option);
            }
        },
        onRemoveOption: function (e) {
            e.stopPropagation();
            const el = $(e.currentTarget), recordId = el.parents(".item").attr("data_id");
            const {options} = this.state, idx = this.newOptions.indexOf(recordId);
            if (idx >= 0) {
                this.newOptions.splice(idx, 1);
                this.setState({options: options.filter((op) => op[0] != recordId)});
                this.renderOptions();
                return this.bindAction();
            }
        },
        onClickOption: function (e) {
            e.stopPropagation();
            const el = $(e.currentTarget), optionKey = el.parents(".item").attr("data_id");
            this.setState({active: optionKey});
            this.renderOptions();
            this.bindAction();
        },
        onChangeOption: function (e) {
            e.stopPropagation();
            const el = $(e.currentTarget), optionVal = el.val();
            if (e.keyCode == 13) {
                const {options} = this.state, optionsEdit = options.slice(),
                    optionKey = el.parents(".item").attr("data_id");
                var opIdx = -1, option = null;
                optionsEdit.map((op, idx) => {
                    if (op[0] == optionKey) {
                        opIdx = idx;
                        option = op.slice();
                    }
                });
                option[1] = optionVal;
                optionsEdit.splice(opIdx, 1, option);
                this.setState({active: false, options: optionsEdit});
                this.renderOptions();
                this.bindAction();
            }
        },
        bindAction: function () {
            this.$el.find(".optionsBadge").click(this.onShowDialog.bind(this));
            if (this.$content) {
                this.$content.unbind(".inputAdd");
                this.$content.find(".inputAdd").keyup(this.onKeyUp.bind(this));
                this.$content.find(".rmItem").click(this.onRemoveOption.bind(this));
                this.$content.find(".wContent .item a").click(this.onClickOption.bind(this));
                this.$content.find(".wContent .item input").keyup(this.onChangeOption.bind(this));
                this.$content.find(".wContent .item input").select();
            }
        },
        renderOptions: function () {
            const {options, active} = this.state, wTask = this.$content.find(".wContent").empty();
            wTask.append(QWeb.render("ViewStudio.Widget.OptionsEdit.list", {
                options: options,
                newOptions: this.newOptions,
                itemActive: active
            }));
        },
        renderEmpty: function () {
            const {empty} = this.info, {options} = this.state, wEmpty = this.$content.find(".wEmpty").empty();
            if (!options.length) {
                wEmpty.append(QWeb.render("ViewStudio.Widget.OptionsEdit.empty", empty));
            }
        },
        renderContent: function () {
            const {node} = this.props;
            this.$content = $(QWeb.render("ViewStudio.Widget.OptionsEdit.wOptions",
                {value: this.state.value, info: this.info, create: node.attrs._new}));
            this.renderEmpty();
            this.renderOptions();
            this.bindAction();
        },
        onSave: function () {
            const {onChange} = this.props, {options} = this.state;
            if (onChange) {
                onChange(JSON.stringify(options));
                this.renderElement();
                this.$dialog.close();
            }
        },
        onShowDialog: function (e) {
            e.stopPropagation();
            e.stopImmediatePropagation();
            this.renderContent();
            this.$dialog = new Dialog(this, {
                buttons: [
                    {
                        text: _t("Cancel"),
                        classes: 'btn',
                        close: true,
                    },
                    {
                        text: _t("Save"),
                        classes: 'btn-primary',
                        close: true,
                        click: this.onSave.bind(this),
                    },
                ],
                $content: this.$content,
                size: 'medium',
                studio: true,
                classes: "dialogOptions",
                title: _t("Options Center"),
            }).open();
        },

    });

    var StyleWidget = base.WidgetBase.extend({
        template: "ViewStudio.Widget.StyleWidget",
        init: function (parent, props) {
            this._super(parent, props);
            this.state = {value: this.strStyleToObj()}
        },
        initParams: function () {
            this.fontFamily = ["Arial", "Verdana", "Helvetica", "Tahoma", "Trebuchet MS", "Times New Roman", "Georgia", "Garamond", "Courier New", "Brush Script MT"];
            var fontSize = [], gridCol = [];
            for (var i = 1; i <= 60; i++) {
                fontSize.push(i);
            }
            for (var i = 0; i <= 12; i++) {
                gridCol.push("col" + (i > 0 ? "-" + i : ""));
            }
            this.fontSize = fontSize;
            this.gridCol = gridCol;
        },
        prepareData: function (type, data, get) {
            if (type.indexOf("margin") >= 0 || type.indexOf("padding") >= 0 || ["width", "font-size"].includes(type)) {
                data = get ? data + "px" : data.replace("px", "");
            }
            return data;
        },
        strStyleToObj: function () {
            const {value} = this.props, data = {};
            if (typeof value == "string") {
                value.split(";").map((style) => {
                    style = style.split(":");
                    if (style.length > 1) {
                        const key = style[0].trim(), value = String(style[1]).trim();
                        data[key] = this.prepareData(key, value);
                    }
                });
            }
            return data;
        },
        objStyleToStr: function () {
            const {value} = this.state;
            return Object.entries(value).map((style) => {
                const key = style[0].trim(), value = String(style[1]).trim();
                return key + ":" + this.prepareData(key, value, true) + "";
            }).join(";");
        },
        onChange: function (e) {
            e.stopPropagation();
            e.stopImmediatePropagation();
            const {onChange} = this.props, {value} = this.state,
                el = $(e.currentTarget), tagName = el[0].tagName.toLowerCase(), val = el.val(), type = el.attr("type");
            if (type && ((e.keyCode == 13 && tagName == "input") || tagName == "select")) {
                this.setState({value: Object.assign({}, value, {[type]: val})});
                if (onChange) {
                    onChange(this.objStyleToStr())
                }
            }
        },
        setStyle: function (style) {
            const {value} = this.state;
            this.setState({value: Object.assign({}, value, style)});
        },
        onClickData: function (e) {
            e.stopPropagation();
            e.stopImmediatePropagation();
            var self = this, {onChange} = this.props, el = $(e.currentTarget), type = el.attr("type");
            if (["text-decoration", "text-align"].includes(type)) {
                this.setStyle({[type]: el.attr("data")});
                if (onChange) {
                    onChange(this.objStyleToStr());
                }
            } else if (["color", "background-color"].includes(type)) {
                const chooseColor = new ChooseColor(this, {
                    onChange: (color) => {
                        self.setStyle({[type]: color});
                        onChange(self.objStyleToStr())
                    }
                });
                chooseColor.onClickShow();
            }
        },
        bindValue: function () {
            const {value} = this.state;
            Object.entries(value).map((style) => {
                const key = style[0], value = style[1], el = this.$el.find("[type='" + key + "']");
                if (el.length) {
                    const tagName = el[0].tagName.toLowerCase();
                    if (["input", "select"].includes(tagName)) {
                        el.val(value);
                    } else if (["a"].includes(tagName)) {
                        if (["text-align", "text-decoration"].includes(key)) {
                            el.filter("[data='" + value + "']").attr("active");
                        } else if (["color", "background-color"].includes(key)) {
                            el.css({color: value});
                        }
                    }
                }
            });
        },
        bindAction: function () {
            this._super();
            this.$el.find("input").keyup(this.onChange.bind(this));
            this.$el.find("a[type]").click(this.onClickData.bind(this));
            this.$el.find("select").change(this.onChange.bind(this));
        },
        renderElement: function () {
            this._super();
            this.bindValue();
        }
    });

    var Button = base.WidgetBase.extend({
        template: "Components.Button",
        init: function (parent, params) {
            this._super(parent, params);
        },
        bindAction: function () {
            this.$el.find("button").click()
        },
    });

    var BorderStyle = base.WidgetBase.extend({
        template: "CssWidget.border",
        init: function (parent, params) {
            this._super(parent, params);
            this.options = {};
            this.options.style = [
                {label: "Dashed", value: "dashed"},
                {label: "Dotted", value: "dotted"},
                {label: "Solid", value: "solid"},
                {label: "Double", value: "double"},
                {label: "Inset", value: "inset"},
                {label: "Outset", value: "outset"},
                {label: "Ride", value: "ride"},
                {label: "Unset", value: "unset"},
                {label: "None", value: "none"},
            ];
            this.borders = {
                'border': {name: 'border'},
                'border-left': {name: "border-left"},
                'border-top': {name: "border-top"},
                'border-right': {name: "borer-right"},
                'border-bottom': {name: "border-bottom"}
            };
            const {el} = this.props;
            this.state = {value: this.getBorderFromEl(el), border: "border"}
        },
        setBorder: function (border, type, data) {
            const {value} = this.state, {onChange} = this.props, borderData = value[border] || {};
            borderData[type] = data;
            value[border] = borderData;
            const {width, style} = borderData;
            if (border == "border") {
                Object.keys(this.borders).map((bd) => {
                    if (bd !== "border") {
                        var _bdData = value[bd] || {};
                        _bdData[type] = data;
                        value[bd] = _bdData;
                    }
                });
            }
            if (onChange) {
                onChange(this.getValue());
            }
        },
        getValue: function () {
            const borders = {}, {value} = this.state;
            Object.keys(value).map((borderName) => {
                const {width, style, color} = value[borderName];
                borders[borderName] = `${width}px ${style} ${color || "#2d4150"}`;
            });
            return borders;
        },
        getBorderFromEl: function (el) {
            const data = {};
            Object.keys(this.borders).map((borderName) => {
                const borderOptions = ["width", "style", "color"], border = {};
                borderOptions.map((op) => {
                    border[op] = el.css(`${borderName}-${op}`);
                    if (op == "width") {
                        border[op] = parseInt(border[op]);
                    }
                });
                data[borderName] = border;
            });
            return data;
        },
        onShowColorPicker: function () {
            const self = this, {border} = this.state, chooseColor = new ChooseColor(this, {
                onChange: (color) => {
                    self.setBorder(border, "color", color);
                }
            });
            chooseColor.onClickShow();
        },
        onChangeSize: function (e) {
            e.stopPropagation();
            const {border} = this.state;
            this.setBorder(border, "width", $(e.currentTarget).val());
        },
        onChangeStyle: function (e) {
            e.stopPropagation();
            const {border} = this.state;
            this.setBorder(border, "style", $(e.currentTarget).val());
        },
        onClickCorner: function (e) {
            e.stopPropagation();
            const {border} = this.state, newBorder = $(e.currentTarget).attr("name");
            if (border != newBorder) {
                this.setState({border: newBorder});
                this.reload();
            }
        },
        bindAction: function () {
            this.$el.find(".bSize input").unbind("change").change(this.onChangeSize.bind(this));
            this.$el.find(".bStyle select").unbind("change").change(this.onChangeStyle.bind(this));
            this.$el.find(".bCorner span").unbind("click").click(this.onClickCorner.bind(this));
            this.$el.find(".bCorner span").unbind("dblclick").dblclick(this.onShowColorPicker.bind(this));
        }
    });

    var FontSizeStyle = base.WidgetBase.extend({
        template: "CssWidget.fontSize",
        init: function (parent, params) {
            this._super(parent, params);
            const {value, el} = this.props;
            this.state = {value: (value || (el && el.length && el.css("font-size")) || '0px').replaceAll("px", "")};
        },
        start: function () {
            this.setFontSize(this.state.value);
        },
        getValue: function () {
            const {value} = this.state;
            return `${value}px`;
        },
        setFontSize: function (fontSize, left, change = false) {
            const {onChange} = this.props, width = this.$el.find(".slideOver").outerWidth(), per = (width - 16) / 100;
            if (!fontSize) {
                fontSize = Math.round(parseFloat(left) / per);
            }
            if (!left) {
                left = Math.round(parseFloat(fontSize) * per);
            }
            this.$el.find(".lblFont").text(fontSize);
            this.$el.find(".dot").css({left: left + "px"});
            this.$el.find(".lineOver").css({width: left + 3 + "px"});
            this.setState({value: fontSize});
            if (change && onChange) {
                onChange(this.getValue());
            }
        },
        bindAction: function () {
            const self = this;
            this.$el.find(".dot").draggable({
                axis: "x",
                containment: ".slideOver",
                drag: function (event, ui) {
                    self.setFontSize(false, ui.position.left);
                },
                stop: function (event, ui) {
                    self.setFontSize(false, ui.position.left, true);
                }
            });
        },
        renderView: function () {
            this._super();
            this.setFontSize(this.state.value);
        }
    });

    var FontStyle = base.WidgetBase.extend({
        template: "CssWidget.font",
        fonts: ["Arial", "Verdana", "Helvetica", "Tahoma", "Trebuchet MS", "Times New Roman", "Georgia", "Garamond", "Courier New", "Brush Script MT"],
        init: function (parent, params) {
            this._super(parent, params);
            const {value, el} = this.props;
            this.state = {value: this._prepareData(value || (el && el.css("font-family")))}
        },
        _prepareData: function (data) {
            if (data) {
                if (!this.fonts.includes(data)) {
                    this.fonts.push(data);
                }
                return data;
            }
            return "Arial";
        },
        getValue: function () {
            return this.state.value;
        },
        onChange: function () {
            const {onChange} = this.props;
            this.setState({value: this.$el.find("select").val()});
            if (onChange) {
                onChange(this.getValue());
            }
        },
        bindAction: function () {
            this.$el.find("select").unbind("select").change(this.onChange.bind(this));
        }
    });

    var IconSimpleStyle = base.WidgetBase.extend({
        template: "CssWidget.iconTemplate",
        onChange: function () {
            const {onChange} = this.props;
            if (onChange) {
                onChange();
            }
        },
        bindAction: function () {
            this.$el.find("span").unbind("click").click(this.onChange.bind(this));
        }
    });

    var IconTemplateStyle = IconSimpleStyle.extend({
        init: function (parent, params) {
            this._super(parent, params);
            this.state = {value: this._prepareValue()};
        },
        _prepareValue: function () {
            const {el, name, value} = this.props;
            if (!value) {
                return el.css(name);
            }
            return value;
        },
        getValue: function () {
            const {value} = this.state;
            return value;
        },
        onChange: function () {
            const {onChange, data} = this.props, {value} = this.state;
            var _value = data, reset = value == data;
            if (Array.isArray(data)) {
                data.includes(value) ? (reset = true) : (_value = data[0]);
            }
            this.setState({value: _value});
            if (onChange) {
                onChange(_value, reset);
            }
        },
        bindStyle: function () {
            const {data} = this.props, {value} = this.state;
            this.$el.find("span").addClass(Array.isArray(data) ? (data.includes(value) ? "active" : "") : (value == data ? "active" : ""));
        },
    });

    var IConChooseColor = IconTemplateStyle.extend({
        onShowColorPicker: function () {
            const {onChange} = this.props,
                chooseColor = new ChooseColor(this, {
                    onChange: (color) => {
                        onChange(color);
                    }
                });
            chooseColor.onClickShow();
        },
        onChange: function () {
            this.onShowColorPicker();
        },
        bindStyle: function () {
            const {value} = this.state;
            this.$el.find("svg > path:eq(0)").attr({fill: value});
        }
    });

    const UNITS = ['pt', 'px', 'pc', 'in', 'mm', 'cm', 'em', 'ex', 'ch', 'rem', 'vw', 'vh', 'vmin', 'vmax', '%'];

    var InputTemplateStyle = base.WidgetBase.extend({
        template: "CssWidget.inputTemplate",
        init: function (parent, params) {
            this._super(parent, params);
            this.state = {value: this._prepareValue() || null}
        },
        _prepareValue: function () {
            var {property, value, el} = this.props, {name, unit, unitVal, nfe} = property;
            if (!value && !nfe) {
                value = el.css(name);
            }
            if (unit && unitVal && value) {
                UNITS.map((_unit) => {
                    if (value.indexOf(_unit) >= 0) {
                        property.unitVal = _unit;
                        value = value.replace(_unit, "");
                    }
                });
            }
            return value;
        },
        getValue: function () {
            const {value} = this.state, {unit, unitVal} = this.props.property || {};
            if (unit) {
                return `${value}${unitVal}`;
            }
            return value;
        },
        isReset: function () {
            const {value} = this.state;
            return value ? false : true;
        },
        onChange: function (e) {
            e.stopPropagation();
            const {onChange} = this.props, value = $(e.currentTarget).val();
            this.setState({value: value});
            if (e.keyCode == 13) {
                if (onChange) {
                    onChange(this.getValue(), this.isReset());
                }
            }
        },
        bindAction: function () {
            this.$el.find("input").keyup(this.onChange.bind(this));
        }
    });

    var GroupStyle = base.WidgetBase.extend({
        template: "CssWidget.group",
        init: function (parent, params) {
            this._super(parent, params);
            const {view} = this.props;
            this.state = {propActive: view[0]}
        },
        onFocusInput: function (e) {
            this.setState({propActive: $(e.currentTarget).attr("name")});
            this.renderUnits();
        },
        onChangeUnit: function (e) {
            const {propActive} = this.state, {property} = this.props;
            property[propActive].unitVal = $(e.currentTarget).val();
        },
        renderUnits: function () {
            const {units, property} = this.props, {propActive} = this.state, {unitVal, noChangeUnit} = property[propActive];
            if (units) {
                this.$el.find(".wUnits").empty().append(QWeb.render("CssWidget.chooseUnits", {
                    currentUnit: unitVal,
                    disable: noChangeUnit
                }));
                this.bindAction();
            }
        },
        renderView: function () {
            const {view, property, styleData, el, onChangeStyle, node} = this.props,
                tagName = node.tag, wrap = this.$el.find(".wpgCon").empty();
            view.map((view) => {
                const _property = property[view], {tags, widget, unit, name, unitVal, prepareProps, onChange} = _property;
                if (unit) {
                    _property.unitVal = unitVal || "px";
                }
                if ((tags && tags.includes(tagName)) || !tags) {
                    if (widget) {
                        const propsDefault = prepareProps ? prepareProps() : {};
                        const propsWidget = {el: el, node: node, key: view, ..._property, property: _property};
                        propsWidget.value = styleData[name] || propsDefault[name] || null;
                        propsWidget.onChange = (data, reset) => (onChange || onChangeStyle)(_property, data, reset);
                        const opInst = new widget(this, propsWidget);
                        opInst.appendTo(wrap);
                    }
                }
            });
            this.renderUnits();
        },
        bindAction: function () {
            this.$el.find(".sUnits").unbind('change').change(this.onChangeUnit.bind(this));
            this.$el.find(".ipT").unbind('focus').focus(this.onFocusInput.bind(this));
        }
    });

    var LayerSettingWidget = base.WidgetBase.extend({
        template: "ViewStudio.Widget.CssWidget",
        init: function (parent, params) {
            this._super(parent, params);
            this.state = {value: this.getDataFromEl(), copy: false, paste: false};
        },
        initParams: function () {
            const {node} = this.props;
            this.property = {
                copy: {icon: "copy", widget: IconSimpleStyle, onChange: this.onSetCopy.bind(this)},
                paste: {
                    icon: "paste",
                    widget: IconSimpleStyle,
                    onChange: this.onSetPaste.bind(this),
                    classes: "disable"
                },
                duplicate: {icon: "duplicate", widget: IconSimpleStyle, onChange: this.onSetCopy.bind(this)},
                remove: {icon: "remove", widget: IconSimpleStyle, onChange: this.onSetRemove.bind(this)},
                rotation: {icon: "rotation", name: true},
                link: {
                    icon: "link",
                    widget: IconSimpleStyle,
                    onChange: this.onSetLink.bind(this),
                    classes: ["p", "label"].includes(node.tag) ? "enable" : "disable"
                },
                'align-left': {icon: "align-left", data: "left", name: "text-align", widget: IconTemplateStyle},
                'align-center': {icon: "align-center", data: "center", name: "text-align", widget: IconTemplateStyle},
                'align-right': {icon: 'align-right', data: "right", name: "text-align", widget: IconTemplateStyle},
                'text-bold': {
                    icon: "text-bold",
                    data: ["700", "bold", "bolder"],
                    rsd: "400",
                    name: "font-weight",
                    widget: IconTemplateStyle
                },
                'text-italic': {icon: "text-italic", data: "italic", name: "font-style", widget: IconTemplateStyle},
                'text-decoration': {
                    icon: 'text-underline',
                    data: "underline",
                    name: "text-decoration",
                    prepareProps: this.prepareTextUnderline.bind(this),
                    widget: IconTemplateStyle,
                },
                width: {label: "W:", unit: true, name: "width", widget: InputTemplateStyle, nfe: true},
                height: {
                    label: "H:",
                    unit: true,
                    noChangeUnit: true,
                    name: "height",
                    widget: InputTemplateStyle,
                    nfe: true
                },
                align: {},
                decoration: {},
                color: {icon: "color", name: "color", widget: IConChooseColor},
                'background-color': {icon: "bgColor", name: "background-color", widget: IConChooseColor},
                'font-size': {label: 'Font Size', name: "font-size", widget: FontSizeStyle},
                font: {label: "Font", name: "font-family", widget: FontStyle},
                'margin-left': {label: "L:", unit: true, name: "margin-left", widget: InputTemplateStyle},
                'margin-right': {label: "R:", unit: true, name: "margin-right", widget: InputTemplateStyle},
                'margin-top': {label: "T:", unit: true, name: "margin-top", widget: InputTemplateStyle},
                'margin-bottom': {label: "B:", unit: true, name: "margin-bottom", widget: InputTemplateStyle},
                'padding-left': {label: "L:", unit: true, name: "padding-left", widget: InputTemplateStyle},
                'padding-right': {label: "R:", unit: true, name: "padding-right", widget: InputTemplateStyle},
                'padding-top': {label: "T:", unit: true, name: "padding-top", widget: InputTemplateStyle},
                'padding-bottom': {label: "B:", unit: true, name: "padding-bottom", widget: InputTemplateStyle},
                'block': {label: "Block", name: "display", data: "block", widget: IconTemplateStyle},
                'inline': {label: "Inline", name: "display", data: "inline", widget: IconTemplateStyle},
                'border': {
                    label: "Border",
                    name: "border",
                    onChange: this.onChangeBorder.bind(this),
                    widget: BorderStyle
                }
            };
            this.groups = [
                {view: ["copy", "paste", "remove"], name: "group1"},
                {view: ["align-left", "align-center", "align-right"]},
                {view: ["color", "background-color", "link"]},
                {view: ["text-bold", "text-italic", "text-decoration"]},
                {view: ["border"], col: "12"},
                {view: ["inline", "block"], type: "display"},
                {view: ["font"], type: "font"}, {view: ["font-size"], label: "Font Size (px)", type: "font-size"},
                {label: "Size", view: ["width", "height"], type: "gIp", units: true},
                {
                    label: "Margin",
                    view: ["margin-top", "margin-bottom", "margin-right", "margin-left"],
                    type: "gIp", units: true
                },
                {
                    label: "Padding",
                    view: ["padding-top", "padding-bottom", "padding-right", "padding-left"],
                    type: "gIp", units: true
                }];
            this.ref.groups = {};
            this.hideEdit = this.getStorage().hide;
        },
        prepareTextUnderline: function () {
            const {el} = this.props, props = {};
            if (el.css("text-decoration-line") == "underline") {
                props.value = "underline";
            }
            return props;
        },
        getDataFromEl: function () {
            const {el} = this.props, styles = el.attr("style"), data = {};
            if (styles) {
                styles.split(";").map((style) => {
                    style = style.split(":");
                    if (style.length > 1) {
                        const name = style[0].trim(), value = String(style[1]).replace("!important", "").trim();
                        data[name] = value;
                    }
                });
            }
            return data;
        },
        setStyle: function (style, change) {
            const {onChange} = this.props, {value} = this.state;
            this.setState({value: Object.assign({}, value, style)});
            if (change) {
                return onChange(this.objStyleToStr());
            }
            this.bindValue();
        },
        // strStyleToObj: function () {
        //     const {value} = this.props, data = {};
        //     if (typeof value == "string") {
        //         value.split(";").map((style) => {
        //             style = style.split(":");
        //             if (style.length > 1) {
        //                 const key = style[0].trim(), value = String(style[1]).trim();
        //                 data[key] = `${value} !important`;
        //             }
        //         });
        //     }
        //     return data;
        // },
        objStyleToStr: function () {
            const {value} = this.state;
            return Object.entries(value).map((style) => {
                const key = style[0].trim(), value = String(style[1]).trim();
                return key + ":" + value + " !important";
            }).join(";");
        },
        onChangeStyle: function (property, data, reset = false) {
            var {value} = this.state, {rsd, name} = property, data = {[name]: reset ? rsd : data};
            if (reset && !rsd) {
                data = {};
                delete value[name];
            }
            this.setStyle(data, true);
        },
        onChangeBorder: function (property, data) {
            this.setState({value: {...this.state.value, ...data}});
            var style = this.objStyleToStr() || [];
            this.onChange(style);
        },
        onChange: function (data) {
            const {onChange} = this.props;
            if (onChange) {
                onChange(data);
            }
        },
        onSetLink: function () {
            const {node} = this.props;
            if (node) {
                node.tag = "a";
                node.attrs.target = "_blank";
                node.changeTag = true;
                this.onChange(this.objStyleToStr());
            }
        },
        onSetCopy: function () {
            const {paste} = this.property;
            this.property.paste = Object.assign(paste, {copy: true, classes: "enable"});
            this.ref.groups["group1"].renderElement();
        },
        onSetRemove: function () {
            const {node, onRemoveNode} = this.props;
            if (node && onRemoveNode) {
                onRemoveNode([node.nodeId]);
            }
        },
        onSetPaste: function () {
            const {node, onCopyNode} = this.props;
            if (node && onCopyNode) {
                onCopyNode(node.nodeId);
            }
        },
        onClose: function () {
            this.$el.remove();
        },
        getStorage: function () {
            const storage = JSON.parse(window.localStorage.getItem('cssWidget')) || {};
            return storage;
        },
        setStorage: function (name, value) {
            const cssStore = this.getStorage();
            cssStore[name] = value;
            window.localStorage.setItem('cssWidget', JSON.stringify(cssStore));
        },
        onToggle: function () {
            const cssStore = this.getStorage(), val = !(cssStore.hide || false);
            this.setStorage("hide", val);
            this.hideEdit = val;
            this.renderElement();
        },
        bindStyle: function () {
            var {position, hide} = this.getStorage();
            if (position && !hide) {
                this.$el.css({top: position.top, left: position.left});
            }
        },
        bindAction: function () {
            const self = this;
            this.$el.draggable({
                cancel: ".cwCon", stop: function (event, ui) {
                    self.setStorage("position", ui.position);
                }
            });
            this.$el.find(".close").click(this.onClose.bind(this));
            this.$el.find(".toggle").click(this.onToggle.bind(this));
        },
        renderView: function () {
            const {el, node} = this.props;
            this.groups.map((group) => {
                const groupInst = new GroupStyle(this, {
                    ...group, el: el, node: node,
                    styleData: this.state.value,
                    onChangeStyle: this.onChangeStyle.bind(this),
                    property: this.property
                });
                if (group.name) {
                    this.ref.groups[group.name] = groupInst;
                }
                groupInst.appendTo(this.$el.find(".cwCon"));
            });
        },
    });

    var TextWidget = base.WidgetBase.extend({
        template: "Studio.TextWidget",
        custom_events: _.extend({}, base.WidgetBase.prototype.custom_events || {}, {
            field_changed: '_onFieldChanged',
        }),
        init: function (parent, params) {
            this._super(parent, params);
            this.state = {value: this.props.value || "Welcome to Studio"};
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
            // this.widgetModel.onCreate({name: newValue, type: "text", view_id: viewInfo.view_id});
        },
        prepareField: function () {
            const {value} = this.state;
            const record = {
                data: {text_edit: value},
                fields: {text_edit: {string: "Text", type: "char"}},
                fieldsInfo: {text: {text_edit: this.nodeField({fieldName: 'text_edit'})}},
                getContext: () => ({})
            }
            return record;
        },
        createTextEditor: function () {
            const {editMode} = this.props, widget = new TextEditor(this, "text_edit", this.prepareField(),
                {viewType: 'text', mode: editMode === false ? "readonly" : "edit"});
            this.ref.view = widget;
        },
        onSave: function () {
            const {onChange} = this.props;
            if (onChange) {
                onChange(this.ref.view.wysiwyg.getValue());
            }
        },
        onShowText: function (e) {
            e.stopPropagation();
            e.stopImmediatePropagation();
            const {label} = this.props, elWrap = $("<div>");
            this.renderTextEdit(elWrap);
            this.$dialog = new Dialog(this, {
                buttons: [
                    {
                        text: _t("Cancel"),
                        classes: 'btn',
                        close: true,
                    },
                    {
                        text: _t("Save"),
                        classes: 'btn-primary',
                        close: true,
                        click: this.onSave.bind(this),
                    },
                ],
                $content: elWrap,
                size: 'medium',
                studio: true,
                classes: "dialogText",
                title: _t(label),
            }).open();
        },
        bindStyle: function () {
        },
        bindAction: function () {
            const {popup} = this.props;
            this._super();
            if (popup) {
                this.$el.find(".sLb").click(this.onShowText.bind(this));
            }
        },
        renderTextEdit: function (container) {
            const self = this;
            this.ref.view.appendTo(container).then(() => {
                self.bindAction();
                self.bindStyle();
            });
        },
        renderView: function () {
            const {popup} = this.props;
            this.createTextEditor();
            if (!popup) {
                this.renderTextEdit(this.$el.find(".wTextCon"));
            }
        },
    });

    var ParentElNode = base.WidgetBase.extend({
        classes: "wTpl",
        init: function (parent, params) {
            this._super(parent, params);
            const {template, node} = this.props;
            this.state = {template: template, node: node};
        },
        onClickNode: function (node) {
            const {onClickTag} = this.props;
            this.setState({node: node});
            this.bindStyle();
            if (onClickTag) {
                onClickTag(node);
            }
        },
        _getIcon: function (node) {
            const icons = [
                {tags: ["span", "p", "strong"], icon: "i-cursor"},
                {tags: ["div"], icon: "folder"},
                {tags: ["table"], icon: "table"},
                {tags: ["tbody", "thead"], icon: "th"},
                {tags: ["t"], icon: "cog"},
                {tags: ["table"], icon: "table"},
                {tags: ["tr"], icon: "ellipsis-h"},
                {tags: ["th", "td"], icon: "square-o"},
                {tags: ["img"], icon: "image"},
                {tags: ["hr"], icon: "window-minimize"}
            ];
            var iconsByClass = [{
                    check: ["col", "col-1", "col-2", "col-3", "col-4", "col-5", "col-6", "col-7", "col-8", "col-9", "col-10", "col-11", "col-12"],
                    icon: "columns"
                }, {check: ["row"], icon: "ellipsis-h"}, {check: ["oe_image"], icon: "image"}],
                classes = node.attrs.class || "", icon = null;
            if (classes) {
                classes.split(" ").map((cl) => {
                    cl = cl.trim();
                    const matched = iconsByClass.filter((ck) => ck.check.includes(cl));
                    if (!icon && matched.length) {
                        icon = matched[0].icon;
                    }
                });
            }
            if (!icon) {
                icon = icons.filter((icon) => icon.tags.includes(node.tag));
                icon = icon.length ? icon[0].icon : "i-cursor";
            }
            return icon;
        },
        renderTemplate: function (node, listEl) {
            if (node && node.tag) {
                const {getNode} = this.props,
                    nodeEl = $(QWeb.render("Report.NodeTemplate.Item", {
                        tagName: node.tag,
                        node: node,
                        icon: this._getIcon(node)
                    }));
                nodeEl.find(".itHead").click(() => this.onClickNode.bind(this)(node));
                listEl.splice(0, 0, nodeEl);
                if (node.parentId) {
                    this.renderTemplate(getNode(node.parentId), listEl);
                }
            }
        },
        renderView: function () {
            const {node} = this.state, listEl = [];
            if (node) {
                this.renderTemplate(node, listEl);
                this.$el.append(listEl);
            }
        },
        bindStyle: function () {
            const {node} = this.state;
            this.$el.addClass("wTpl");
            this.$el.find(".tplItem.active").removeClass("active").find(".itProps").empty();
            if (node) {
                this.$el.find(".tplItem[node-id='" + node.nodeId + "']").addClass("active");
            }
        },
    });

    var ChangeImage = base.WidgetBase.extend({
        template: "StudioWidget.changeImage",
        onChangeImage: function (e) {
            e.stopPropagation();
            e.stopImmediatePropagation();
            const {onChange} = this.props, MediaDialog = odoo.__DEBUG__.services['wysiwyg.widgets.MediaDialog'],
                $image = $('<img/>');
            const mediaDialog = new MediaDialog(this, {
                onlyImages: true,
            }, $image[0]);
            mediaDialog.open();
            mediaDialog.on('save', this, function (image) {
                onChange(image.getAttribute("src"));
            });
        },
        bindAction: function () {
            this._super();
            this.$el.find("a").click(this.onChangeImage.bind(this));
        }
    })

    var WidgetOptions = base.WidgetBase.extend({
        init: function (parent, params = {}) {
            this._super(parent, params);
            const {value} = this.props;
            this.state.value = value || {};
            this.fieldOptions = {};
            this.fieldOptions.string = {widget: basicFields.Input};
            this.fieldOptions.array = {widget: basicFields.FieldM2mRaw, prepare: this._prepareArrayProps};
            this.fieldOptions.boolean = {widget: basicFields.Radio};
        },
        _prepareArrayProps: function (name, data) {
            const {value} = this.props, {params, string, default_value} = data, props = {label: string};
            if (!params && params.type != "selection") {
                return {}
            }
            props.options = params.params.map((option) => ({label: option.label, value: option.field_name}));
            if (default_value) {
                props.value = default_value.map((v) => ({label: v, value: v}));
            }
            if (name in value) {
                props.value = value[name].map((v) => ({label: v, value: v}));
            }
            return props;
        },
        bindStyle: function () {
            this.$el.addClass("widgetOptions");
        },
        onChange: function (name, type, value) {
            const {onChange} = this.props;
            if (type == "array") {
                value = value.map((d) => d.value);
            }
            this.state.value[name] = value;
            if (onChange) {
                onChange(this.state.value);
            }
        },
        renderView: function () {
            const {options} = this.props, {value} = this.state;
            if (!options) {
                return;
            }
            Object.entries(options).map((option) => {
                const opName = option[0],
                    opValue = option[1], {string, type} = opValue, {widget, prepare} = this.fieldOptions[type] || {};
                if (widget) {
                    const widgetProps = {
                        label: string,
                        name: opName,
                        onChange: (value) => this.onChange.bind(this)(opName, type, value)
                    }
                    if (opName in value) {
                        widgetProps.value = value[opName];
                    }
                    const widgetInst = new widget(this, Object.assign(widgetProps, prepare ? prepare.bind(this)(opName, opValue) : {}));
                    widgetInst.appendTo(this.$el);
                }
            });
        }
    });

    var ActionStudio = base.WidgetBase.extend({
        template: "ViewEdit.ActionStudio",
        init: function (parent, params) {
            this._super(parent, params);
            this.newField = params.node.newField || false;
        },
        onClickShow: function (e) {
            const self = this, {modelName, onChange, value} = this.props;
            this['_rpc']({
                model: "view.center.button",
                method: 'get_button_action_info',
                args: [modelName],
                context: {},
            }).then(function (data) {
                const options = {
                    view_id: data.view_id,
                    res_model: "base.automation", res_id: value, disable_multiple_selection: true,
                    context: {
                        default_name: "Button Action",
                        default_trigger: "button_action",
                        default_model_id: data.model_id
                    },
                    title: "Action Studio",
                    on_saved: (record) => {
                        onChange(record.res_id);
                    },
                    on_remove: () => {
                    }
                };
                let dialog = new FormViewDialog(self, options);
                dialog.open()
            });
        },
        onRemove: function (e) {
        },
        bindAction: function () {
            this.$el.find("button").click(this.onClickShow.bind(this));
        }
    });

    var RecordColor = base.WidgetBase.extend({
        template: "ViewStudio.Widget.TreeColor",
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

    return {
        ViewMoreProps: ViewMoreProps,
        Tab: Tab,
        ActionStudio: ActionStudio,
        ChartProps: ChartProps,
        ChooseField: ChooseField,
        ChooseFieldDialog: ChooseFieldDialog,
        StyleWidget: StyleWidget,
        ButtonDomain: ButtonDomain,
        ChooseIcon: ChooseIcon,
        ChooseColor: ChooseColor,
        OptionsEdit: OptionsEdit,
        CssWidget: LayerSettingWidget,
        RecordColor: RecordColor,
        Button: Button,
        TextWidget: TextWidget,
        ParentElNode: ParentElNode,
        WidgetOptions: WidgetOptions,
        ChangeImage: ChangeImage,
    };
});
