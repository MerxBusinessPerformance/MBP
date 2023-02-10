odoo.define('dashboard_studio.ViewsCenter', function (require) {
    "use strict";

    var core = require('web.core');
    var BaseCenter = require("dashboard_studio.BaseCenter");
    // var ActionManager = require('web.ActionManager');
    var session = require('web.session');
    var QWeb = core.qweb;
    var {useService} = require("@web/core/utils/hooks");


    var ViewsCenter = BaseCenter.extend({
        title: "Views Center",
        init: function (parent, params) {
            this._super(parent, params);
            this.categorys.choose_view = {
                name: "choose_view",
                label: "Choose View",
                views: ["graph", "calendar", "kanban", "pivot", "list", "plan", "activity"]
            };
            this.state = {...this.state, hideLeft: true, category: "choose_view"};
            this.action_manager = useService("action");
        },
        getViewInfo: function () {
            const self = this, {viewType} = this.state;
            if (viewType in self.fieldsViews) {
                const viewInfo = this.controlView._processFieldsView(self.fieldsViews[viewType], viewType);
                if (["list", "kan_ban".replace("_", "")].includes(viewType)) {
                    const {fields} = viewInfo, fieldsInfo = viewInfo.fieldsInfo[viewType],
                        fieldsNode = Object.keys(fieldsInfo).filter((fieldName) => {
                            return viewType == "kan_ban".replace("_", "") ? (fieldsInfo[fieldName].Widget ? true : false) : true;
                        }), fieldWithout = {list: ["activity_exception_decoration"]};
                    const withoutField = fieldWithout[viewType] || [];
                    Object.keys(fields).map((fieldName) => {
                        if (!fieldsNode.includes(fieldName) && !withoutField.includes(fieldName)) {
                            const fieldNode = {tag: "field", children: []};
                            fieldNode.attrs = {name: fieldName};
                            self.controlView._processNode(fieldNode, viewInfo);
                            viewInfo.fieldsInfo[viewType][fieldName].willShow = true;
                        }
                    });
                }
                return {...viewInfo, fields: {...viewInfo.fields}};
            }
        },
        prepareNewView: function () {
            const {res_model} = this.action, {viewType} = this.state, viewTemplate = `DashboardStudio.Widget.${viewType}`,
                viewInfo = {view_mode: viewType, action_id: this.action.id}, data = {};
            data.arch = QWeb.templates[viewTemplate].children[0].outerHTML;
            data.name = `${res_model}.${viewType}`;
            data.model = res_model;
            viewInfo.data = data;
            return viewInfo;
        },
        createView: function () {
            return this.controlModel.createNewView(this.prepareNewView());
        },
        onSave: function () {
            const self = this;
            this.controlModel.storeView(this.ref.view.prepareDataToSave()).then(() => {
                self.reloadView()
            });
        },
        onReset: function () {
            const self = this;
            this.controlModel.resetView(this.ref.view.prepareDataToReset()).then(() => {
                self.reloadView()
            });
        },
        onClickCard: async function (e) {
            const elCard = $(e.currentTarget), viewType = elCard.attr("name");
            this.setState({step: "setup", viewType: viewType});
            if (!(viewType in this.fieldsViews)) {
                await this.createView();
            }
            this.renderElement();
        },
        loadAction: async function () {
            const {step} = this.state, state = $.bbq.getState(true);
            this.action = await this.action_manager.loadAction(state.action);
            const params = {
                resModel: this.action.res_model,
                views: this.action.views,
                context: this.action.context,
            };
            const options = {
                actionId: this.action.id,
                loadActionMenus: true,
                loadIrFilters: true,
                studioKey: Math.random(),
            };
            this.fieldsViews = await this.vm.loadViews(params, options);
            this.steps[step].render();
            // this.bindAction();
        },
        reloadView: async function () {
            this.fieldsViews = await this.vm.loadViews(this.action);
            this.ref.view.setViewInfo(this.getViewInfo());
        },
        renderViewSetup: function () {
            const {viewType} = this.state;
            if (viewType) {
                const widgetView = new this.viewWidgets[viewType](this,
                    {viewInfo: this.getViewInfo(), action: this.action});
                widgetView.appendTo(this.$el.find(".wgCon"));
                this.ref.view = widgetView;
            }
        },
        renderView: function () {
            this.loadAction();
        }
    });


    return ViewsCenter;
});
