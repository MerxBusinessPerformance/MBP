odoo.define('dashboard_studio.basic_fields', function (require) {
    "use strict";

    var core = require('web.core');
    var Domain = require('web.Domain');
    var base = require('dashboard_studio.base');
    var FieldRegistry = require('web.field_registry');
    var DomainSelectorDialog = require("web.DomainSelectorDialog");
    var StandaloneFieldManagerMixin = require('web.StandaloneFieldManagerMixin');
    var RelationalFields = require('web.relational_fields');
    var DatePicker = require('web.datepicker');


    var Input = base.WidgetBase.extend({
        template: 'DashboardStudio.Field.Input',
        init: function (parent, params) {
            this._super(parent, params);
            const {value} = params;
            this.state = {value: value || ""};
            this.oldVal = value;
        },
        onKeyUp: function (e) {
            const {onChange} = this.props, value = $(e.currentTarget).val();
            this.setState({value: value});
            if (onChange && e.keyCode == 13) {
                this.oldVal = value;
                onChange(value);
            }
            this.bindStyle();
        },
        bindAction: function () {
            this.$el.find("input").keyup(this.onKeyUp.bind(this));
        },
        bindStyle: function () {
            const {value} = this.state;
            this.$el[this.oldVal != value ? "addClass" : "removeClass"]("valDiff");
            this._super();
        },
    });

    var ToggleSwitch = base.WidgetBase.extend({
        template: "DashboardStudio.Field.ToggleSwitch",
        init: function (parent, params) {
            this._super(parent, params);
            const {value} = params;
            this.state = {value: value || false};
        },
        onChecked: function (e) {
            const {onChange} = this.props, el = $(e.currentTarget), checked = el.prop("checked");
            this.setState({value: checked});
            if (onChange) {
                onChange(checked);
            }
        },
        bindAction: function () {
            this.$el.find("input").change(this.onChecked.bind(this));
        }
    });

    var Radio = base.WidgetBase.extend({
        template: 'DashboardStudio.Field.Radio',
        init: function (parent, params) {
            this._super(parent, params);
            const {value} = params;
            this.state = {value: value || false};
        },
        onCheck: function () {
            const {value} = this.state, {onChange} = this.props;
            this.setState({value: !value});
            this.bindStyle();
            if (onChange) {
                onChange(!value);
            }
        },
        bindAction: function () {
            this.$el.click(this.onCheck.bind(this));
        },
        bindStyle: function () {
            const {value} = this.state;
            value ? this.$el.addClass("checked") : this.$el.removeClass("checked");
        },
    });

    var RadioCondition = base.WidgetBase.extend({
        custom_events: _.extend({}, base.WidgetBase.prototype.custom_events, {
            domain_changed: "_onDomainSelectorValueChange",
            domain_selected: "_onDomainSelectorDialogValueChange",
        }),
        template: 'DashboardStudio.Field.RadioCondition',
        init: function (parent, params) {
            this._super(parent, params);
            const {value} = params;
            this.state = {value: value || false};
        },
        _onDomainSelectorValueChange: function (e) {
        },
        _onDomainSelectorDialogValueChange: function (e) {
            const domain = Domain.prototype.arrayToString(e['data'].domain);
            this.setValue(domain);
        },
        onClickCondition: function () {
            this.renderDomainSelector();
        },
        bindAction: function () {
            this._super();
            this.$el.find(".aSCon").click(this.onClickCondition.bind(this));
        },
        setValue: function (newValue) {
            const {value} = this.state, {onChange} = this.props;
            if (typeof value == "boolean" && newValue == "[]") {
                newValue = value;
            }
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
        getValRadio: function () {
            const {value} = this.state;
            if (typeof value == "string") {
                return value != "[]";
            }
            return value;
        },
        renderDomainSelector: function () {
            const {model} = this.props;
            this.ref.domainSelector = new DomainSelectorDialog(this, model, this.getValDomain(), {
                readonly: false,
                debugMode: true,
            });
            this.ref.domainSelector.open();
        },
        renderRadio: function () {
            this.ref.radio = new Radio(this, {
                ...this.props,
                onChange: this.setValue.bind(this),
                value: this.getValRadio()
            });
            this.ref.radio.renderElement();
            this.$el.find(".wRadio").append(this.ref.radio.$el);
        },
        renderView: function () {
            this.renderRadio();
        }
    });

    var Selection = base.WidgetBase.extend({
        template: "DashboardStudio.Field.Selection",
        init: function (parent, params) {
            this._super(parent, params);
            this.state = {value: params.value || false}
        },
        start: function () {
            const {options} = this.props;
            this.data = options || [];
        },
        getValue: function () {
            return this.state.value;
        },
        resetValue: function () {
            this.$el.find("select").val(null);
        },
        onChangeValue: function (e) {
            const {onChange, store} = this.props;
            let value = $(e.currentTarget).val();
            store === false ? this.resetValue() : this.setState({value: value});
            if (onChange) {
                onChange(value);
            }
        },
        bindAction: function () {
            this.$el.find("select").change(this.onChangeValue.bind(this));
            this.$el.find("select").val(this.getValue());
        }
    });

    var ChooseField = Selection.extend({
        start: function () {
            this.data = this.prepareFields();
        },
        prepareFields: function () {
            const {fields, fieldTypes, condition} = this.props, data = [];
            for (let [key, value] of Object.entries(fields || {})) {
                const item = {label: value.string, value: key}
                if ((fieldTypes ? fieldTypes.includes(value.type) : true) && (condition ? condition({
                    ...value,
                    name: key
                }) : true)) {
                    data.push(item);
                }
            }
            return data;
        }
    });

    var ChooseWidget = Selection.extend({
        start: function () {
            this.data = this.prepareFields();
        },
        prepareFields: function () {
            const {fieldType} = this.props;
            return Object.keys(FieldRegistry.map).filter((widgetName) => {
                let widget = FieldRegistry.map[widgetName], {supportedFieldTypes} = widget.prototype;
                return supportedFieldTypes && supportedFieldTypes.includes(fieldType || "char");
            }).map((widgetName) => ({label: this.capitalize(widgetName), value: widgetName}));
        }
    });

    var RecordColor = base.WidgetBase.extend({
        template: "DashboardStudio.Widget.TreeColor",
        init: function (parent, params) {
            this._super(parent, params);
            const {value} = params;
            this.props = params;
            this.oldVal = value || {};
            this.state = {value: value || {}};
            this.viewInfo = {
                "decoration-danger": {}, "decoration-warning": {},
                "decoration-success": {}, "decoration-primary": {}, "decoration-info": {},
                "decoration-muted": {}, "decoration-bf": {placeholder: "Bold"},
                "decoration-it": {placeholder: "Italic"}
            };
        },
        onKeyUp: function (e) {
            const self = this, {onChange} = this.props, {value} = this.state;
            let el = $(e.currentTarget), name = el.attr("name"), newVal = {...value, [name]: el.val()};
            this.setState({value: newVal});
            if (onChange && e.keyCode == 13) {
                this.oldVal = newVal;
                onChange(newVal);
            }
            Object.keys(newVal).map((colorName) => {
                let oldVal = self.oldVal[colorName];
                self.$el.find("div[name='" + colorName + "']")[oldVal != newVal[colorName] ? "addClass" : "removeClass"]("_oSave");
            });
        },
        bindAction: function () {
            this.$el.find('.colorItem input').keyup(this.onKeyUp.bind(this));
        },
    });

    var FieldM2mRaw = base.WidgetBase.extend({
        template: "DashboardStudio.Field.M2mRaw",
        init: function (parent, params) {
            this._super(parent, params);
            const {value} = this.props;
            this.state = {...this.state, value: value || []};
        },
        onChange: function (data, remove = false) {
            const {onChange, options} = this.props, {value} = this.state,
                option = options.filter((option) => option.value == data);
            this.setState({value: remove ? value.filter((val) => val.value != data) : value.concat(option[0])});
            if (onChange) {
                const {value} = this.state;
                onChange(value);
            }
            this.reload();
        },
        onRemoveVal: function (e) {
            const el = $(e.currentTarget), fieldName = el.parent().attr("name");
            this.onChange(fieldName, true);
        },
        bindAction: function () {
            this.$el.find(".fa-close").click(this.onRemoveVal.bind(this));
        },
        renderView: function () {
            const {options} = this.props, value = this.state.value.map((val) => val.value);
            const selectWidget = new Selection(this, {
                options: options.filter((option) => !value.includes(option.value)),
                store: false, onChange: this.onChange.bind(this)
            });
            selectWidget.renderElement();
            this.$el.find(".wSelect").append(selectWidget.$el);
        },
    });

    var Datetime = base.WidgetBase.extend({
        template: "DashboardStudio.Field.Datetime",
        renderView: function () {
            const {onChange, value} = this.props;
            const datetimeWidget = new DatePicker.DateTimeWidget(this, {});
            datetimeWidget.appendTo(this.$el.find(".wDT").empty()).then(() => {
                if (value) {
                    datetimeWidget.$el.find('.o_input').val(value).focus();
                }
            });
            datetimeWidget.on('datetime_changed', this, function () {
                onChange(datetimeWidget.getValue());
            });
        }
    });

    var FieldMany2many = base.WidgetBase.extend(StandaloneFieldManagerMixin, {
        template: "DashboardStudio.Field.Many2many",
        init: function (parent, params) {
            this._super(parent, params);
            StandaloneFieldManagerMixin.init.call(this);
        },
        _confirmChange: function (id, fields, event) {
            this.onChangeData(id);
            return StandaloneFieldManagerMixin['_confirmChange'].apply(this, arguments);
        },
        onChangeData: function (id) {
            const {onChange, field} = this.props, record = this.model.get(id);
            if (onChange) {
                return onChange(record.data[field.name].res_ids);
            }
        },
        renderView: function () {
            const self = this, {value, field} = this.props, {model, name, string, relation} = field;
            self.model.makeRecord(model || name, [{
                name: name,
                string: string,
                relation: relation,
                type: 'many2many',
                value: value,
            }]).then((recordID) => {
                var record = self.model.get(recordID);
                record.data[name].fieldsInfo.default.id = {name: "id"};
                record.data[name].fieldsInfo.default.display_name = {name: "display_name"};
                let many2many = new RelationalFields.FieldMany2ManyTags(self, name, record, {mode: 'edit'});
                self._registerWidget(recordID, name, many2many);
                many2many.appendTo(self.$el.find(".wContent"));
            });
        },
    });

    var FieldMany2one = base.WidgetBase.extend(StandaloneFieldManagerMixin, {
        template: "DashboardStudio.Field.Many2one",
        init: function (parent, params) {
            this._super(parent, params);
            StandaloneFieldManagerMixin.init.call(this);
        },
        _confirmChange: function (id, fields, event) {
            this.onChangeData(id);
            return StandaloneFieldManagerMixin['_confirmChange'].apply(this, arguments);
        },
        onChangeData: function (id) {
            const {onChange, field} = this.props, record = this.model.get(id);
            if (onChange) {
                this['_rpc']({
                    model: field.relation,
                    method: 'search_read',
                    fields: [],
                    domain: [['id', '=', record.data[field.name].res_id]],
                }).then(function (result) {
                    if (result.length) {
                        onChange(result[0]);
                    }
                });
            }
        },
        renderView: async function () {
            const self = this, {value, field} = this.props, {model, name, string, relation} = field;
            self.model.makeRecord(model || name, [{
                name: name,
                string: string,
                relation: relation,
                type: 'many2one',
                value: value,
            }]).then((recordID) => {
                var record = self.model.get(recordID);
                let many2one = new RelationalFields.FieldMany2One(self, name, record, {
                    mode: 'edit',
                    attrs: {
                        options: {no_open: true}
                    }
                });
                self._registerWidget(recordID, name, many2one);
                many2one.appendTo(self.$el.find(".wContent"));
            });
        },
    });

    var Groups = base.WidgetBase.extend({
        template: "DashboardStudio.Widget.Groups",
        init: function (parent, params) {
            this._super(parent, params);
            const {value} = params;
            this.state.value = value;
        },
        onChange: function (data_ids) {
            const {onChange} = this.props;
            return this['_rpc']({
                model: "view.center",
                method: 'get_group_xmlid',
                args: [data_ids],
                kwargs: {},
            }).then(function (result) {
                if (onChange) {
                    onChange(result);
                }
                return result;
            });
        },
        getGroupId: function () {
            const {value} = this.state;
            if (Array.isArray(value)) {
                return this['_rpc']({
                    model: "res.groups",
                    method: 'search_read',
                    fields: ['id', 'display_name'],
                    domain: [['id', 'in', value]],
                }).then(function (result) {
                    return result;
                });
            }
            if (!value) {
                return $.Deferred().resolve([]);
            }
            return this['_rpc']({
                model: "view.center",
                method: 'get_group_id',
                args: [value],
                kwargs: {},
            }).then(function (result) {
                return result;
            });
        },
        renderView: async function () {
            const self = this, groupValue = await this.getGroupId(),
                fieldGroup = {string: "Groups", model: "ir.model.fields", name: "groups", relation: "res.groups"},
                many2many = new FieldMany2many(self, {
                    field: fieldGroup,
                    value: groupValue,
                    label: "Groups",
                    onChange: this.onChange.bind(this)
                });
            many2many.renderElement();
            this.$el.append(many2many.$el);
        },
    });

    return {
        Datetime: Datetime,
        Selection: Selection,
        FieldMany2one: FieldMany2one,
        FieldMany2many: FieldMany2many,
        FieldM2mRaw: FieldM2mRaw,
        ChooseField: ChooseField,
        ChooseWidget: ChooseWidget,
        RecordColor: RecordColor,
        Groups: Groups,
        RadioCondition: RadioCondition,
        Radio: Radio,
        Input: Input,
        ToggleSwitch: ToggleSwitch
    };
});
