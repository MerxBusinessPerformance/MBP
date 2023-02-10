odoo.define('dynamic_odoo.AppCenter', function (require) {
    "use strict";

    var core = require('web.core');
    var base = require('dynamic_odoo.base');

    var basic_fields = require('dynamic_odoo.basic_fields');
    var basic_widgets = require('dynamic_odoo.basic_widgets');
    var session = require('web.session');
    var {useService} = require("@web/core/utils/hooks");
    const rootWidget = require('root.widget');
    const {Component, tags} = owl;

    var QWeb = core.qweb;

    var MenuCreator = base.WidgetBase.extend({
        template: "ViewStudio.MenuCreator",
        init: function (parent, params) {
            this._super(parent, params);
            this.fields = {};
            this.fields.empty_view = {label: "Use empty view", name: "empty_view", widget: basic_fields.ToggleSwitch};
            this.fields.object_name = {
                label: "Choose menu name", name: "object_name",
                required: true, placeholder: "e.g. Props", widget: basic_fields.Input
            };
            this.fields.model_name = {
                label: "Choose object name", name: "model_name",
                required: true, placeholder: "e.g. x_model_demo", widget: basic_fields.Input
            };
            this.fields.model_id = {
                name: "model_id",
                label: "Choose model",
                widget: basic_fields.FieldMany2one,
                propChange: this.onChangeModel.bind(this),
                required: true,
                props: {model: "no", relation: "ir.model", domain: []}
            };
            this.fields.new_model = {
                label: "New model", name: "new_model", widget: basic_fields.ToggleSwitch, reload: true,
                propChange: this.onChangeIsNew.bind(this), value: true
            };

            this.views = ["object_name", "new_model", "model_name"];
        },
        getData: function () {
            const data = {};
            this.views.map((fieldName) => {
                const field = this.fields[fieldName];
                data[fieldName] = field.value;
            });
            return data;
        },
        onChangeModel: function (field, value) {
            field.value = value.id;
        },
        onChangeIsNew: function (field, value) {
            value ? this.views.splice(2, 2, "model_name") : this.views.splice(2, 1, ...["empty_view", "model_id"]);
            field.value = value;
        },
        onChangeInfo: function (field, value) {
            if (field.propChange) {
                field.propChange(field, value);
            } else {
                field.value = value;
            }
            if (field.reload) {
                this.renderView();
            }
        },
        onCreate: function (values) {
            values = Object.assign(values, this.getData());
            return this['_rpc']({
                model: "ir.ui.menu",
                method: 'create_new_menu',
                args: [values],
                kwargs: {},
            });
        },
        onFinish: function (e) {
            e.stopPropagation();
            this.onCreate();
        },
        bindAction: function () {
            this._super();
            this.$el.find(".nFinish").click(this.onFinish.bind(this));
        },
        renderView: function () {
            const elWrap = this.$el.find(".wCon").empty();
            this.views.map((fieldName) => {
                const field = this.fields[fieldName],
                    fieldWidget = new field.widget(this, {
                        ...field, ...(field.props || {}),
                        onChange: (value) => this.onChangeInfo(field, value)
                    });
                fieldWidget.appendTo(elWrap);
            });
        }
    });

    var IconCreator = base.WidgetBase.extend({
        template: "ViewStudio.IconCreator",
        init: function (parent, params) {
            this._super(parent, params);
            this.fProps = {};
            this.fProps.choose_icon = {label: "Choose Icon", name: "choose_icon", widget: basic_widgets.ChooseIcon};
            this.fProps.icon_color = {
                label: "Icon Color",
                name: "icon_color",
                type: "simple",
                widget: basic_widgets.ChooseColor,
                value: "#37afeb"
            };
            this.fProps.icon_bg = {
                label: "Icon Bg Color",
                name: "icon_bg",
                type: "simple",
                widget: basic_widgets.ChooseColor,
                value: "#424869"
            };
            this.state = {editable: 'editable' in params ? params.editable : true};
        },
        setEditable: function (editable) {
            this.setState({editable: editable});
            this.reload();
        },
        iconHtmlToData: async function () {
            const dataUrl = await (domtoimage || {
                toPng: async () => {
                }
            }).toPng(document.getElementsByClassName("IC")[0]);
            return dataUrl;
        },
        onChooseIC: function (e) {
            e.stopPropagation();
            e.stopImmediatePropagation();
            const el = $(e.currentTarget), {top, left} = el.offset(), type = el.attr("type"),
                elWrap = $("<div class='elWrap'>");
            const _onChange = (value) => {
                this.fProps[type].value = value;
                this.bindStyle();
            }
            this.$el.find(".elWrap").remove();
            const propIcon = this.fProps[type], propICWidget = new propIcon.widget(this,
                {...propIcon, onChange: _onChange.bind(this), label: false, wrap: elWrap}),
                css = {top: top + 22 + "px", left: left + 22 + "px"};
            this.ref.propIcon = propIcon;
            this.$el.append(elWrap.css(css));
            if (type == "choose_icon") {
                propICWidget.appendTo(elWrap);
            } else {
                propICWidget.onClickShow();
            }
            this.bindAction();
        },
        _onClDialog: function (e) {
            e.stopPropagation();
            this.$el.find(".elWrap").remove()
        },
        bindStyle: function () {
            this._super();
            const {icon_color, choose_icon, icon_bg} = this.fProps, icon = choose_icon.value,
                icColor = icon_color.value, icBg = icon_bg.value;
            if (icon) {
                const ic = this.$el.find(".IC i, .cIc i"), icCls = $(ic[0]).attr("class").split(" ").filter(
                    (cl) => !(cl || "").includes("fa"));
                icCls.push(...["fa", "fa-" + icon]);
                ic.attr({class: icCls.join(" ")});
            }
            if (icColor) {
                this.$el.find(".IC i").css({color: icColor});
                this.$el.find(".cICl").css({backgroundColor: icColor});
            }
            if (icBg) {
                this.$el.find(".IC").css({backgroundColor: icBg});
                this.$el.find(".cBgCl").css({backgroundColor: icBg});
            }
        },
        bindAction: function () {
            this._super();
            $(document).click(this._onClDialog.bind(this));
            this.$el.find(".cIc, .cICl, .cBgCl").click(this.onChooseIC.bind(this));
            this.$el.find(".elWrap").click((e) => e.stopPropagation());
        },
    });

    var AppCreator = base.WidgetBase.extend({
        template: "ViewStudio.AppCreator",
        init: function (parent, params) {
            this._super(parent, params);
            this.fields = {};
            this.fields.app_name = {
                label: "Choose an app name", name: "app_name", placeholder: "e.g. Odoo Studio",
                required: true, widget: basic_fields.Input
            };
            this.views = ["app_name"];
        },
        getData: function () {
            const data = {};
            this.views.map((fieldName) => {
                const field = this.fields[fieldName];
                data[fieldName] = field.value;
            });
            return data;
        },
        onChangeInfo: function (field, value) {
            if (field.propChange) {
                field.propChange(field, value);
            } else {
                field.value = value;
            }
            if (field.reload) {
                this.renderView();
            }
        },
        renderView: function () {
            const elWrap = this.$el.find(".wCon").empty();
            this.views.map((fieldName) => {
                const field = this.fields[fieldName],
                    fieldWidget = new field.widget(this, {
                        ...field, ...(field.props || {}),
                        onChange: (value) => this.onChangeInfo(field, value)
                    });
                fieldWidget.appendTo(elWrap);
            });
        }
    });


    var BaseChooseView = base.WidgetBase.extend({
        template: "ViewStudio.NewApp",
        init: function (parent, params) {
            this._super(parent, params);
            this.fields = {};
            this.state = {step: "first"};
            this.steps = {
                first: {title: "Create your App", next: "second", widget: AppCreator},
                second: {title: "Create your first Menu", prev: "first", widget: MenuCreator}
            };
            this.menuService = useService("menu");
        },
        onStep: function (e) {
            e.stopPropagation();
            e.stopImmediatePropagation();
            const el = $(e.currentTarget), type = el.attr("type"), {step} = this.state;
            if (this.checkStepFinish() || (type == "prev")) {
                this.setState({step: this.steps[step][type]});
                this.renderElement();
            }
        },
        onCreate: async function (e) {
            e.stopPropagation();
            const {first, second, iconCreator} = this.ref, data = first.getData();
            Object.assign(data, second.getData());
            var imageData = await iconCreator.iconHtmlToData();
            if (imageData) {
                imageData = imageData.split(",")[1];
                data.web_icon_data = imageData;
            }
            const menu = await this['_rpc']({
                model: "ir.ui.menu",
                method: 'create_new_app',
                args: [data],
                kwargs: {},
            });
            await this.menuService.reload();
            this.menuService.selectMenu(menu.menu_id);
        },
        bindAction: function () {
            this._super();
            this.$el.find(".wCtrlStep button[type]").click(this.onStep.bind(this));
            this.$el.find(".nFinish").click(this.onCreate.bind(this));
        },
        checkStepFinish: function () {
            const {step} = this.state, creator = this.ref[step];
            if (!creator) {
                return false;
            }
            var checkRq = 0, checkVl = 0;
            creator.views.map((view) => {
                const field = creator.fields[view], {required, value} = field;
                if (required) {
                    checkRq += 1;
                    if (value) {
                        checkVl += 1;
                    }
                }
            });
            return checkRq == checkVl;
        },
        renderStepCreator: function () {
            const self = this, {step} = this.state, group = this.steps[step], complete = this.checkStepFinish(),
                instanceCreator = this.ref[step], wrapInfo = $(QWeb.render("ViewStudio.NewApp.Info",
                {title: group.title, complete: complete, finish: complete && step == "second"}));
            if (instanceCreator) {
                instanceCreator.renderElement();
                wrapInfo.find(".wField").append(instanceCreator.$el);
            } else {
                const menuCreator = new group.widget(this, {}), superChange = menuCreator.onChangeInfo;
                menuCreator.onChangeInfo = (field, value) => {
                    superChange.bind(menuCreator)(field, value);
                    self.renderStepCreator();
                    self.bindAction();
                }
                menuCreator.appendTo(wrapInfo.find(".wField"));
                this.ref[step] = menuCreator;
            }
            this.$el.find(".clInfo").empty().append(wrapInfo);
        },
        renderIconCreator: function () {
            const {step} = this.state;
            if (this.ref.iconCreator) {
                this.ref.iconCreator.setEditable(step == "first");
            } else {
                const iconCreator = new IconCreator(this, {editable: step == "first"});
                this.ref.iconCreator = iconCreator;
            }
            this.ref.iconCreator.appendTo(this.$el.find(".colIcon").empty());

        },
        renderView: function () {
            this.renderStepCreator();
            this.renderIconCreator();
            this.bindAction();
        }
    });

    class AppCenter extends Component {
        mounted() {
            const appCenter = new BaseChooseView(rootWidget, {});
            appCenter.renderElement();
            $(this.el).append(appCenter.$el);
        }
    }

    AppCenter.template = tags.xml `
        <t t-name="studio.AppCenter">
             <div class="wrapAppCenter" style="width: 100%; display: flex"></div>
        </t>
    `;

    return AppCenter;
});
