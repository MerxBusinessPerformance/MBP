odoo.define('dynamic_odoo.basic_fields', function (require) {
    "use strict";

    var core = require('web.core');
    var Domain = require('web.Domain');
    var base = require('dynamic_odoo.base');
    var FieldRegistry = require('web.field_registry');
    var DomainSelectorDialog = require("web.DomainSelectorDialog");
    var StandaloneFieldManagerMixin = require('web.StandaloneFieldManagerMixin');
    var RelationalFields = require('web.relational_fields');
    var DatePicker = require('web.datepicker');
    var BasicFields = require("web.basic_fields");
    var fieldUtils = require('web.field_utils');


    var Input = base.WidgetBase.extend({
        template: 'ViewStudio.Field.Input',
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

    var TextArea = Input.extend({
        template: 'ViewStudio.Field.TextArea',
        bindAction: function () {
            this.$el.find(".txtArea").keyup(this.onKeyUp.bind(this));
        },
    });

    var ToggleSwitch = base.WidgetBase.extend({
        template: "ViewStudio.Field.ToggleSwitch",
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
        template: 'ViewStudio.Field.Radio',
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
        template: 'ViewStudio.Field.RadioCondition',
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
        template: "ViewStudio.Field.Selection",
        init: function (parent, params) {
            this._super(parent, params);
            this.state = {value: params.value || false}
        },
        initParams: function () {
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
        initParams: function () {
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
        initParams: function () {
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


    var FieldM2mRaw = base.WidgetBase.extend({
        template: "ViewStudio.Field.M2mRaw",
        init: function (parent, params) {
            this._super(parent, params);
            const {value, options} = this.props;
            this.state = {...this.state, value: value || []};
            this.options = options || this.prepareOptions();
        },
        onChange: function (data, remove = false) {
            const {onChange} = this.props, {value} = this.state,
                option = this.options.filter((option) => option.value == data);
            this.setState({value: remove ? value.filter((val) => val.value != data) : value.concat(option[0])});
            if (onChange) {
                const {value} = this.state;
                onChange(value);
            }
            this.reload();
        },
        prepareOptions: function () {
            const {fields, fieldTypes, condition} = this.props, options = [];
            for (let [key, value] of Object.entries(fields || {})) {
                const item = {label: value.string, value: key}
                if ((fieldTypes ? fieldTypes.includes(value.type) : true) && (condition ? condition({
                    ...value,
                    name: key
                }) : true)) {
                    options.push(item);
                }
            }
            return options;
        },
        onRemoveVal: function (e) {
            const el = $(e.currentTarget), fieldName = el.parent().attr("name");
            this.onChange(fieldName, true);
        },
        bindAction: function () {
            this.$el.find(".fa-close").click(this.onRemoveVal.bind(this));
        },
        renderView: function () {
            const value = this.state.value.map((val) => val.value);
            const selectWidget = new Selection(this, {
                options: this.options.filter((option) => !value.includes(option.value)),
                store: false, onChange: this.onChange.bind(this)
            });
            selectWidget.renderElement();
            this.$el.find(".wSelect").append(selectWidget.$el);
        },
    });

    var DateRange = base.WidgetBase.extend(StandaloneFieldManagerMixin, {
        // template: "ViewStudio.Field.Many2many",
        serverFormat: 'YYYY-MM-DD HH:mm:ss',
        init: function (parent, params) {
            this._super(parent, params);
            StandaloneFieldManagerMixin.init.call(this);
        },
        loadRecord: function () {
            const self = this, {value, model, name, string} = this.props;
            self.model.makeRecord(model || "studio", [{
                name: name,
                string: string,
                type: 'datetime',
                value: false,
            }]).then((recordID) => {
                var record = self.model.get(recordID);
                self.record = record;
            });
        },

        willStart: function () {
            return Promise.all([this._super.apply(this, arguments), this.loadRecord()]);
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
        _applyChanges: function (ev, picker) {
            const {onChange} = this.props,
                displayStartDate = fieldUtils.format["datetime"](picker.startDate, {}, {timezone: false}),
                displayEndDate = fieldUtils.format["datetime"](picker.endDate, {}, {timezone: false}),
                changedStartDate = picker.startDate, changedEndDate = picker.endDate;
            const server = {}, client = {start: displayStartDate, end: displayEndDate};
            server.start = this.tzValue(this.dateRange._parseValue(changedStartDate));
            server.end = this.tzValue(this.dateRange._parseValue(changedEndDate));
            this.$el.find("input").val(`${client.start} - ${client.end}`);
            onChange({client: client, server: server});
        },
        tzValue: function (value) {
            return value.clone().add(-this.getSession().getTZOffset(value), 'minutes').format(this.serverFormat);
        },
        renderView: function () {
            const self = this, {name, value} = this.props, {client} = value || {};
            const widget = new BasicFields.FieldDateRange(this, name, this.record, {mode: 'edit'});
            widget._applyChanges = this._applyChanges.bind(this);
            widget.appendTo(this.$el).then(() => {
                if (client) {
                    self.$el.find("input").val(`${client.start} - ${client.end}`);
                }
            });
            this.dateRange = widget;
            this._registerWidget(this.record.id, name, widget);
        },
    });

    var Datetime = base.WidgetBase.extend({
        template: "ViewStudio.Field.Datetime",
        serverFormat: 'YYYY-MM-DD HH:mm:ss',
        renderView: function () {
            const self = this, {onChange, value} = this.props;
            const datetimeWidget = new DatePicker.DateTimeWidget(this, {});
            datetimeWidget.appendTo(this.$el.find(".wDT").empty()).then(() => {
                if (value) {
                    datetimeWidget.$el.find('.o_input').val(value).focus();
                }
            });
            datetimeWidget.on('datetime_changed', this, function () {
                // onChange(datetimeWidget.getValue().format(this.serverFormat));
                const value = datetimeWidget.getValue();
                onChange({client: value, server: self.tzValue(value)});
            });
        },
        tzValue: function (value) {
            return value.clone().add(-this.getSession().getTZOffset(value), 'minutes').format(this.serverFormat);
        }
    });

    var FieldMany2many = base.WidgetBase.extend(StandaloneFieldManagerMixin, {
        template: "ViewStudio.Field.Many2many",
        init: function (parent, params) {
            this._super(parent, params);
            StandaloneFieldManagerMixin.init.call(this);
        },
        loadRecord: function () {
            const self = this, {value, field} = this.props, {model, name, string, relation} = field;
            self.model.makeRecord(model, [{
                name: name,
                string: string,
                relation: relation,
                type: 'many2many',
                value: value || field.value,
            }]).then((recordID) => {
                var record = self.model.get(recordID);
                record.data[name].fieldsInfo.default.id = {name: "id"};
                record.data[name].fieldsInfo.default.display_name = {name: "display_name"};
                self.record = record;
            });
        },
        willStart: function () {
            return Promise.all([this._super.apply(this, arguments), this.loadRecord()]);
        },
        _confirmChange: function (id, fields, event) {
            this.onChangeData(id);
            return StandaloneFieldManagerMixin['_confirmChange'].apply(this, arguments);
        },
        onChangeData: function (id) {
            const {onChange, returnObj, field} = this.props, record = this.model.get(id);
            if (onChange) {
                var data = record.data[field.name].res_ids;
                if (returnObj) {
                    data = record.data[field.name].data.map((data) => data.data);
                }
                return onChange(data);
            }
        },
        renderView: function () {
            const {field} = this.props, {name} = field;
            const many2many = new RelationalFields.FieldMany2ManyTags(this, name, this.record, {mode: 'edit'});
            this._registerWidget(this.record.id, name, many2many);
            many2many.appendTo(this.$el.find(".wContent"));
        },
    });

    var FieldMany2one = base.WidgetBase.extend(StandaloneFieldManagerMixin, {
        template: "ViewStudio.Field.Many2one",
        init: function (parent, params) {
            this._super(parent, params);
            const {value} = params;
            StandaloneFieldManagerMixin.init.call(this);
            this.state = {value: value};
        },
        loadRecord: function () {
            const self = this, {label, relation, name, field, domain, model} = this.props, {value} = this.state;
            return self.model.makeRecord(model, [{
                name: name,
                string: label,
                relation: relation,
                type: 'many2one',
                domain: domain || [],
                value: value || (field || {}).value || false,
            }]).then(function (recordID) {
                var record = self.model.get(recordID);
                self.record = record;
            });
        },
        willStart: function () {
            return Promise.all([this._super.apply(this, arguments), this.loadRecord()]);
        },
        _confirmChange: function (id, fields, event) {
            this.onChangeData(id);
            return StandaloneFieldManagerMixin['_confirmChange'].apply(this, arguments);
        },
        onChangeData: function (id) {
            const {onChange, relation, name} = this.props, record = this.model.get(id);
            return this['_rpc']({
                model: relation,
                method: 'read',
                args: [record.data[name].res_id],
                kwargs: {},
            }).then(function (result) {
                if (result && result.length) {
                    onChange(result[0]);
                }
            });
        },
        renderView: function () {
            const self = this, {name} = this.props;
            const many2one = new RelationalFields.FieldMany2One(self, name, self.record, {mode: 'edit', noOpen: true});
            this._registerWidget(this.record.id, name, many2one);
            many2one.appendTo(self.$el.find(".wContent"));
        },
    });

    var Relation = FieldMany2one.extend({
        init: function (parent, params) {
            this._super(parent, params);
            const {value} = params;
            StandaloneFieldManagerMixin.init.call(this);
            this.state = {value: value};
        },
        getRelationValue: async function () {
            const self = this, {value} = this.state;
            if (Array.isArray(value) && value.length) {
                return $.Deferred().resolve({id: value[0], display_name: value[1]});
            }
            var result = {};
            if (value) {
                result = await this['_rpc']({
                    model: "studio.view.center",
                    method: 'get_relation_id',
                    args: [value],
                    kwargs: {},
                });
            }
            self.setState({value: result.id || false});
            return this.loadRecord();
        },
        willStart: function () {
            return Promise.all([this.getRelationValue()]);
        },
        onChangeData: function (id) {
            const self = this, {onChange, relation, name} = this.props, record = this.model.get(id);
            this['_rpc']({
                model: relation,
                method: 'read',
                args: [record.data[name].res_id],
                kwargs: {},
            }).then(function (result) {
                if (result && result.length) {
                    self.state.value = result[0].id;
                    onChange(result[0].model);
                }
            });
        },
    });

    var Groups = base.WidgetBase.extend({
        template: "ViewStudio.Widget.Groups",
        init: function (parent, params) {
            this._super(parent, params);
            const {value} = params;
            this.state.value = value;
        },
        onChange: function (data_ids) {
            const {onChange, no_xml} = this.props;
            if (no_xml) {
                return onChange(data_ids);
            }
            return this['_rpc']({
                model: "studio.view.center",
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
                model: "studio.view.center",
                method: 'get_group_id',
                args: [value],
                kwargs: {},
            }).then(function (result) {
                return result;
            });
        },
        renderView: async function () {
            const self = this, {label} = this.props, groupValue = await this.getGroupId(),
                fieldGroup = {string: label, model: "ir.model.fields", name: "groups", relation: "res.groups"},
                many2many = new FieldMany2many(self, {
                    field: fieldGroup, value: groupValue,
                    label: label, onChange: this.onChange.bind(this)
                });
            many2many.appendTo(this.$el);
        },
    });

    return {
        Datetime: Datetime,
        DateRange: DateRange,
        Selection: Selection,
        FieldMany2many: FieldMany2many,
        TextArea: TextArea,
        FieldM2mRaw: FieldM2mRaw,
        ChooseField: ChooseField,
        ChooseWidget: ChooseWidget,
        Groups: Groups,
        RadioCondition: RadioCondition,
        Radio: Radio,
        Input: Input,
        FieldMany2one: FieldMany2one,
        Relation: Relation,
        ToggleSwitch: ToggleSwitch
    };
});
