odoo.define('dynamic_odoo.ReportCenter', function (require) {
    "use strict";

    var base = require("dynamic_odoo.base");
    var ReportKanBan = require('dynamic_odoo.ReportKanBan');
    var ReportEdit = require('dynamic_odoo.ReportEdit');
    var Dialog = require('web.Dialog');
    var core = require('web.core');
    var _t = core._t, QWeb = core.qweb;

    const ViewContainer = require("dynamic_odoo.ViewContainer");

    var QWeb = core.qweb;
    var {mount} = owl;


    var ChooseTemplate = base.WidgetBase.extend({
        classes: "wChooseTem",
        onClickItem: function (type) {
            const {onCreateReport} = this.props;
            if (onCreateReport) {
                onCreateReport(type.template);
            }
        },
        renderView: function () {
            const reportType = [
                {
                    label: "External",
                    description: "Business header/footer",
                    template: "ViewStudio.ReportTemplates.External"
                },
                {
                    label: "Internal",
                    description: "Minimal header/footer",
                    template: "ViewStudio.ReportTemplates.Internal"
                },
                {
                    label: "Blank",
                    description: "No header/footer",
                    template: "ViewStudio.ReportTemplates.Blank"
                }];
            reportType.map((type) => {
                const item = $(QWeb.render("ViewStudio.ChooseReport.item", type));
                item.click(() => this.onClickItem(type));
                this.$el.append(item);
            });
        },
    });

    var ReportCenter = base.WidgetBase.extend({
        template: 'ViewStudio.ReportCenter',
        custom_events: _.extend({}, base.WidgetBase.prototype.custom_events, {
            onCreateReport: 'showChooseTemplate',
        }),
        init: function (parent, params) {
            this._super(parent, params);
            this.steps = {
                choose: {render: this.renderKanBanView.bind(this)},
                edit: {render: this.renderReportEdit.bind(this)}
            };
            this.state = {step: "choose"};
        },
        onCreateReport: function (template) {
            const self = this, {model} = $.bbq.getState(true), elTemplate = QWeb.templates[template].children[0],
                cloneTemplate = elTemplate.cloneNode(true), name = `${model.replaceAll(".", "_")}_${Math.random()}`,
                xmlId = `studio.${name}`;
            cloneTemplate.setAttribute('t-name', name);
            const values = {
                xml: new XMLSerializer().serializeToString(cloneTemplate),
                xml_id: xmlId, name: name, model: model,
                string: "New Report", module: "studio",
                report_xml_id: `studio.action_${name}`,
                report_file: xmlId, report_name: xmlId
            }
            return this['_rpc']({
                model: 'report.center',
                method: 'create_new_report',
                args: [values],
                kwargs: {},
            }).then((data) => {
                self.onLoadReport(data);
                self.$dialog.close();
            });
        },
        showChooseTemplate: function () {
            const chooseTemplate = new ChooseTemplate(this, {onCreateReport: this.onCreateReport.bind(this)});
            chooseTemplate.renderElement();
            this.$dialog = new Dialog(this, {
                buttons: [
                    {
                        text: _t("Cancel"),
                        classes: 'btn',
                        close: true,
                    },
                    {
                        text: _t("Create"),
                        classes: 'btn-primary',
                        close: true,
                        click: this.onCreateReport.bind(this),
                    },
                ],
                $content: chooseTemplate.$el,
                size: 'medium',
                studio: true,
                classes: "drCreate",
                title: _t("Choose Report Template"),
            }).open();
        },
        onLoadReport: function (data) {
            this.setState({report_data: data, step: "edit"});
            this.renderElement();
        },
        _getReportData: async function (reportName) {
            return this['_rpc']({
                model: "ir.actions.report",
                method: 'search_read',
                fields: [],
                domain: [['report_name', '=', reportName]]
            });
        },
        renderReportEdit: async function () {
            const self = this, {model, id} = $.bbq.getState(), {report_data} = this.state,
                context = {active_model: model};
            if (id) {
                const activeId = parseInt(id);
                context.active_id = activeId;
                context.active_ids = [activeId];
            } else {
                const result = await this['_rpc']({
                    model: model,
                    method: 'search_read',
                    fields: ['id'],
                    domain: []
                });
                if (result.length) {
                    context.active_id = result[0].id;
                    context.active_ids = [result[0].id];
                }
            }
            if (!context.active_id) {
                alert("No Record to load!. Pls create a record before edit pdf template.");
                return false;
            }
            const reportData = await this._getReportData(report_data.report_name), reportParams = reportData[0];
            reportParams.context = context;
            const reportEdit = new ReportEdit(self, {
                ...self.props, action: {}, bindAction: self.bindAction.bind(self), reportParams: reportParams
            });
            reportEdit.appendTo(self.$el.empty());
            self.ref.content = reportEdit;
        },
        _renderKanBanView: function () {
            const self = this, {viewInfo, modelName} = this.props, {model} = $.bbq.getState();
            const params = {
                onClickRecord: this.onLoadReport.bind(this),
                context: {},
                domain: [['model', '=', model]],
                displayName: "Report Center",
                groupBy: [],
                limit: 80,
                filter: [],
                modelName: modelName,
            };
            const kanBanView = new ReportKanBan(viewInfo, params);
            kanBanView.getController(self).then(function (widget) {
                widget.appendTo(self.$el.empty());
            });
        },

        renderKanBanView: async function () {
            const {viewInfo, modelName} = this.props, {model} = $.bbq.getState(), props = {
                onClickRecord: this.onLoadReport.bind(this),
                onCreateReport: this.showChooseTemplate.bind(this),
                context: {},
                domain: [['model', '=', model]],
                displayName: "Report Center",
                groupBy: [],
                limit: 80,
                filter: [],
                modelName: modelName,
            };
            const info = {
                View: ReportKanBan,
                Component: ReportKanBan,
                viewInfo: viewInfo,
                componentProps: props
            }, env = odoo['rootStudio'].env;
            await mount(ViewContainer, {
                env: Object.assign(Object.create(env), {config: {}}),
                props: {info: info, isLegacy: true},
                target: this.$el.empty()[0],
                position: "first-child"
            });
            // this.resetNode();
            // this.bindAction();
            // this.bindStyle();
            // this.ref.container = viewContainer;
            // const {component} = viewContainer.__owl__.refs;
            // this.ref.widget = this.isLegacy ? component.widget : component;
        },
        renderView: function () {
            const {step} = this.state;
            this.steps[step].render();
            this.trigger_up("onReloadButtonGroup", {});
        }
    });

    return ReportCenter;

});
