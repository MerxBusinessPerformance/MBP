/** @odoo-module alias=dashboard_studio.MenuCreator**/
const base = require('dashboard_studio.base');
const basic_fields = require('dashboard_studio.basic_fields');

var MenuCreator = base.WidgetBase.extend({
    template: "DashboardStudio.MenuCreator",
    init: function (parent, params) {
        this._super(parent, params);
        this.fields = {};
        this.fields.name = {
            label: "Menu", name: "name",
            required: true, placeholder: "e.g. Props", widget: basic_fields.Input
        };
        this.fields.groups_id = {label: "Groups", name: "groups_id", no_xml: true, widget: basic_fields.Groups};
        this.views = ["name", "groups_id"];
        this.prepareValue();
    },
    prepareValue: function () {
        const {value} = this.props;
        if (!value) return;
        Object.keys(value).map((fieldName) => {
            if (fieldName in this.fields) {
                this.fields[fieldName].value = value[fieldName];
            }
        });
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
    onUpdate: function (values) {
        const {menuId} = this.props;
        return this['_rpc']({
            model: "ir.ui.menu",
            method: 'write',
            args: [menuId, values],
            kwargs: {},
        });
    },
    onAction: function (values = {}) {
        const data = Object.assign({}, values, this.getData());
        return this.onUpdate(data);
    },
    onFinish: function (e) {
        e.stopPropagation();
        this.onAction();
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

export default MenuCreator;
