odoo.define('dynamic_odoo.AutomationContent', function (require) {
    "use strict";

    var core = require('web.core');
    var session = require('web.session');
    var ListController = require('web.ListController');
    var ListView = require('web.ListView');
    var FormView = require('web.FormView');
    var base = require('dynamic_odoo.base');

    ListView.include({
        init: function (viewInfo, params) {
            this._super(viewInfo, params);
            const {fromStudio, onOpenRecord} = params;
            this.controllerParams.fromStudio = fromStudio;
            this.controllerParams.onOpenRecord = onOpenRecord;
        },
    });

    ListController.include({
        init: function (parent, model, renderer, params) {
            this._super(parent, model, renderer, params);
            this.props = params;
        },
        _onOpenRecord: function (ev) {
            ev.stopPropagation();
            const {fromStudio, onOpenRecord} = this.props;
            if (fromStudio && onOpenRecord) {
                var record = this.model.get(ev.data.id, {raw: true});
                return onOpenRecord(record.res_id);
            }
            this._super(ev);
        },
        _onCreateRecord: function (ev) {
            if (ev) {
                ev.stopPropagation();
            }
            const {fromStudio, onOpenRecord} = this.props;
            if (fromStudio && onOpenRecord) {
                return onOpenRecord(false);
            }
            this._super(ev);
        },
    });


    var AutomationView = base.WidgetBase.extend({
        className: "wAutomationAccess",
        custom_events: _.extend({}, base.WidgetBase.prototype.custom_events, {
            stOpenRecord: 'openRecord',
        }),
        init: function (parent, params) {
            this._super(parent, params);
            this.views = {
                list: {title: 'List', render: this.renderListView.bind(this)},
                form: {render: this.renderFormView.bind(this)}
            };
            this.state = {viewInfo: false, viewType: 'list'};
        },
        openRecord: function (res_id) {
            this.setState({viewType: 'form', res_id: res_id});
            this.renderView();
        },
        renderListView: function () {
            const self = this, {modelName, title, viewInfo, domain, searchInfo} = this.props;
            const listView = new ListView(viewInfo.list, {
                viewInfo: viewInfo,
                context: session.user_context,
                domain: domain || [],
                groupBy: [],
                limit: 80,
                filter: [],
                modelName: modelName,
                displayName: title,
                fromStudio: true,
                onOpenRecord: this.openRecord.bind(this),
                controlPanelFieldsView: searchInfo
            });
            listView.getController(self).then(function (widget) {
                self.ref.view = widget;
                widget.appendTo(self.$el.empty()).then(() => {
                    if (widget.on_attach_callback) {
                        widget.on_attach_callback();
                    }
                    self.bindAction();
                });
            });
        },
        renderFormView: function () {
            const self = this, {modelName, viewInfo} = this.props, {res_id} = this.state;
            const formView = new FormView(viewInfo.form, {
                modelName: modelName,
                context: session.user_context,
                ids: res_id ? [res_id] : [],
                currentId: res_id || undefined,
                index: 0,
                mode: res_id ? 'readonly' : 'edit',
            });
            formView.getController(self).then(function (widget) {
                self.ref.view = widget;
                widget.appendTo(self.$el.empty().addClass("hide")).then(() => {
                    self.$el.removeClass("hide");
                    self.bindAction();
                });
            });
        },
        renderView: async function () {
            var {viewType} = this.state;
            this.views[viewType].render();
        }
    });

    return AutomationView;

});
