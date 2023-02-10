odoo.define('dynamic_odoo.ViewsCenter', function (require) {
    "use strict";

    var core = require('web.core');
    var BaseCenter = require("dynamic_odoo.BaseCenter");
    var basic_fields = require('dynamic_odoo.basic_fields');
    // var ActionManager = require('web.ActionManager');
    var ReportCenter = require('dynamic_odoo.ReportCenter');
    var AutomationContent = require('dynamic_odoo.AutomationContent');
    var FormView = require('web.FormView');
    var session = require('web.session');
    var BasicView = require('web.BasicView');
    var Dialog = require('web.Dialog');
    var QWeb = core.qweb;
    var _t = core._t;


    var ViewsCenter = BaseCenter.extend({
        title: "Views Center",
        custom_events: _.extend({}, BaseCenter.prototype.custom_events, {
            onReloadButtonGroup: 'renderButtonAction',
        }),
        init: function (parent, params) {
            this._super(parent, params);
            const {typeEdit} = params;
            this.categorys.choose_view = {
                name: "choose_view",
                label: "Choose View",
                views: ["form", "list", "graph", "calendar", "kanban", "pivot", "plan", "activity"]
            };
            this.state = {...this.state, hideLeft: true, category: "choose_view", typeEdit: typeEdit || false};
            this.controllerStack = [];
            this.edit_types = {
                views: {label: "Views", classes: "viewEdit", render: this.renderViewViews.bind(this)},
                reports: {
                    label: "Reports",
                    classes: "reportEdit",
                    model: "ir.actions.report",
                    render: this.renderViewReport.bind(this)
                },
                translation: {
                    classes: "accessEdit",
                    model: "ir.translation",
                    label: 'Translations',
                    title: "Translate View",
                    action: "base.action_translation",
                    render: this.renderViewAccess.bind(this)
                },
                automation: {
                    label: 'Automation',
                    model: "base.automation",
                    title: "Automated Actions",
                    classes: "accessEdit",
                    action: "base_automation.base_automation_act",
                    render: this.renderViewAccess.bind(this)
                },
                access_control: {
                    label: 'Access Controls',
                    model: "ir.model.access",
                    title: "Access Control Lists",
                    classes: "accessEdit",
                    action: "base.ir_access_act",
                    render: this.renderViewAccess.bind(this)
                },
                filter_rules: {
                    label: "Filter Rules",
                    model: "ir.filters",
                    title: "Filter Rules",
                    classes: "accessEdit",
                    action: "base.actions_ir_filters_view",
                    render: this.renderViewAccess.bind(this)
                },
                record_rules: {
                    label: "Record Rules",
                    model: "ir.rule",
                    title: "Record Rules",
                    classes: "accessEdit",
                    action: "base.action_rule",
                    render: this.renderViewAccess.bind(this)
                }
            };
        },
        renderButtonAction: function () {
            const elWrap = this.$el.find(".wGAC").empty(), {typeEdit, step} = this.state, params = {
                save: typeEdit == "views",
                reset: (typeEdit == "reports" && this.ref.view.state.step == "edit") || typeEdit == "views"
            };
            if (step == "setup" && (params.save || params.reset)) {
                elWrap.append(QWeb.render("ViewStudio.GroupsAction", params));
            }
            this.bindAction();
        },
        setFieldsInfo: function (viewInfo, fieldWithout = []) {
            const self = this, {fields, type} = viewInfo, fieldsInfo = viewInfo.fieldsInfo[type],
                fieldsNode = Object.keys(fieldsInfo).filter((fieldName) => {
                    return fieldsInfo[fieldName].Widget ? true : false
                });
            viewInfo._fieldsInfo = Object.keys(fieldsInfo);
            Object.keys(fields).map((fieldName) => {
                if (!fieldsNode.includes(fieldName) && !fieldWithout.includes(fieldName)) {
                    const fieldNode = {tag: "field", children: []};
                    fieldNode.attrs = {name: fieldName};
                    self.controlView._processNode(fieldNode, viewInfo);
                    fieldsInfo[fieldName].willShow = true;
                } else {
                    const field = fields[fieldName], fieldInfo = fieldsInfo[fieldName];
                    if (["one2many", "many2many"].includes(field.type)) {
                        Object.values(fieldInfo.views).map((view) => {
                            const {fieldsGet, viewFields, fields} = view, fieldsName = Object.keys(fields);
                            view.inParent = true;
                            Object.keys(fieldsGet).map((fgName) => {
                                if (!fieldsName.includes(fgName)) {
                                    const fg = fieldsGet[fgName];
                                    fg.views = {};
                                    fields[fgName] = fg;
                                    viewFields[fgName] = fg;
                                }
                            });
                        });
                    }
                }
            });
        },
        _processFieldsView: function (archXMl, viewType) {
            const controls = {form: FormView};
            var ControlView = (controls[viewType] || BasicView).extend({
                init: function (parent, params) {
                }
            });
            this.controlView = new ControlView(this, {});
            return this.controlView._processFieldsView(archXMl, viewType);
        },
        getViewInfo: function () {
            const self = this, {viewType} = this.state;
            if (viewType in self.fieldsViews) {
                const viewInfo = this._processFieldsView(self.fieldsViews[viewType], viewType);
                if (["list", "form", "kan_ban".replace("_", "")].includes(viewType)) {
                    const fieldWithout = {list: ["activity_exception_decoration"]};
                    this.setFieldsInfo(viewInfo, fieldWithout[viewType] || [])
                }
                return {...viewInfo, fields: {...viewInfo.fields}};
            }
        },
        prepareNewView: function () {
            const {res_model} = this.action, {viewType} = this.state, viewTemplate = `ViewStudio.Widget.${viewType}`,
                viewInfo = {view_mode: viewType == "list" ? "tree" : viewType, action_id: this.action.id},
                data = {}, viewCheck = this.fieldsViews[viewType];
            data.arch = viewCheck && !viewCheck.viewId ? viewCheck.arch : QWeb.templates[viewTemplate].children[0].outerHTML;
            data.name = `${res_model}.${viewType}`;
            data.model = res_model;
            viewInfo.data = data;
            return viewInfo;
        },
        activeConfirm: function () {
            const self = this;
            Dialog.studioConfirm(this, _t("Are you sure that you want to active this view ?"), {
                confirm_callback: async () => {
                    await this.createView();
                    delete self.action;
                    self.renderElement();
                },
                cancel_callback: async () => {
                    // self.onClose();
                }
            });
        },
        createView: async function () {
            await this.controlModel.createNewView(this.prepareNewView());
            // await this.loadAction();
        },
        setCurrentStack: function (stackId) {
            this.state.stack = stackId;
            this.controllerStack.map((stack) => {
                if (stack.stackId == stackId) {
                    stack.view.show();
                    const {isSubView} = stack.view;
                    this.ref.view = stack.view;
                    this.renderTitle({
                        label: stack.label,
                        controller: stack,
                        back: this.controllerStack.length > 1,
                        editTitle: !isSubView
                    });
                } else {
                    stack.view.hide();
                }
            });
            this.bindAction();
        },
        setStackId: function (viewControl, active, label) {
            const id = ("SCid" + Math.random()).replace(".", "_"),
                newStack = {view: viewControl, stackId: id, label: label || "View Setup"};
            this.controllerStack.push(newStack);
            viewControl.stackId = id;
            if (active) {
                this.setCurrentStack(id);
            }
        },
        onGet: async function (domain) {
            const result = await this.controlModel.getView(domain);
            return result;
        },
        onSave: function (e) {
            e.stopPropagation();
            e.stopImmediatePropagation();
            const self = this;
            if (this.ref.view.canSave()) {
                this.controlModel.storeView(this.ref.view.prepareDataToSave()).then(() => {
                    odoo['studio'].env.bus.trigger("CLEAR-CACHES");
                    self.reloadView({reset: true});
                });
            }
        },
        onResetReport: async function () {
            const reportEdit = this.ref.view.ref.content, reportView = reportEdit.ref.widget;
            const data = reportEdit.prepareDataToReset(), {values} = data;
            await this.controlModel.resetReport(values);
            reportView.reload();
        },
        onReset: async function (e) {
            e.stopPropagation();
            e.stopImmediatePropagation();
            const self = this, {typeEdit} = this.state;
            Dialog.studioConfirm(this, _t("Would you like to reset all changed ? "), {
                confirm_callback: async () => {
                    if (typeEdit == "reports") {
                        return self.onResetReport();
                    }
                    const data = await self.ref.view.prepareDataToReset(), {values, store} = data;
                    self.controlModel[store ? 'storeView' : 'resetView'](values).then(() => {
                        self.reloadView({reset: !store});
                    });
                },
            });
        },
        _goBack: function (index = false, reload = true) {
            const {stack} = this.state;
            if (!index) {
                index = this.controllerStack.findIndex((item) => item.stackId == stack);
            }
            for (var i = index; i < this.controllerStack.length; i++) {
                this.controllerStack[i].view.$el.remove();
            }
            this.controllerStack.splice(index);
            this.setCurrentStack(this.controllerStack.slice(-1)[0].stackId);
            if (reload && this.ref.view.renderView) {
                this.ref.view.renderView();
            }
        },
        onGoBack: function (e) {
            e.stopPropagation();
            e.stopImmediatePropagation();
            const self = this, view = self.ref.view;
            if (view.viewHasChange) {
                Dialog.studioConfirm(this, _t("Would you like to save your changes before go back?"), {
                    confirm_callback: async () => {
                        self.controlModel.storeView(view.prepareDataToSave()).then(() => {
                            self.reloadView();
                            // self._goBack()
                        });
                    },
                    cancel_callback: async () => {
                        view.resetPropsChange();
                        self._goBack();
                    }
                });
            } else {
                self._goBack();
            }
        },
        onClickCard: async function (e) {
            const elCard = $(e.currentTarget), viewType = elCard.attr("name"), viewInfo = this.fieldsViews[viewType];
            this.setState({step: "setup", typeEdit: "views", viewType: viewType});
            if (!viewInfo || (viewInfo && !viewInfo.viewId)) {
                return this.activeConfirm();
            }
            this.renderElement();
        },
        onClickTypeEdit: function (e) {
            e.stopPropagation();
            const el = $(e.currentTarget);
            this.setState({typeEdit: el.attr("name")});
            this.renderElement();
        },
        validAction: function () {
            return !["ir.actions.client"].includes(this.action.type);
        },
        loadAction: async function (callback = () => {
        }, action = odoo['studio'].state.action, params = {}) {
            odoo['studio'].env.bus.trigger("CLEAR-CACHES");
            const {active_id} = odoo['studio'].state, ctx = {};
            if (active_id) {
                ctx.active_id = active_id;
                ctx.active_ids = [active_id];
            }
            this.action = await this.action_manager.loadAction(action, ctx);
            if (!this.validAction()) {
                return this.renderEmpty();
            }
            await this.loadViews(callback, params);
        },
        loadViews: async function (callback = () => {
        }, viewParams = {}) {
            const params = {
                resModel: this.action.res_model,
                views: this.action.views,
                context: {...this.action.context, action: this.action.id},
                ...viewParams
            };
            const options = {
                actionId: this.action.id,
                loadActionMenus: true,
                loadIrFilters: true,
                studioKey: Math.random(),
            };
            this.fieldsViews = await this.vm.loadViews(params, options);
            callback();
        },
        bindAction: function () {
            this._super();
            this.$el.find(".faBack").unbind("click").click(this.onGoBack.bind(this));
            this.$el.find(".wHasViews a").unbind("click").click(this.onClickCard.bind(this));
            this.$el.find(".wEditTypes a").unbind("click").click(this.onClickTypeEdit.bind(this));
        },
        reloadView: function (params = {}) {
            this.loadViews(() => {
                const viewInfo = this.getViewInfo();
                this.ref.viewRoot.setViewInfo(viewInfo, params).then(() => {
                    this._goBack(1, false);
                });
            })
        },
        renderEmpty: function () {
            this.$el.addClass("empty_action").find(".cateWidgets").empty().append("<h1>We don't support this action !!!</h1>");
        },
        renderViewReport: async function () {
            const self = this, {typeEdit} = this.state, {label, title, model} = this.edit_types[typeEdit];
            this.renderTitle({label: label});
            await this.loadAction(() => {
                const domain = [['model_name', '=', self.res_model]];
                const reportCenter = new ReportCenter(self, {
                    modelName: model,
                    viewInfo: self.fieldsViews.kanban,
                    action_manager: self.action_manager,
                    title: title,
                    domain: domain,
                });
                reportCenter.appendTo(self.$el.find(".wgCon"));
                self.ref.view = reportCenter;
                self.bindAction();
            }, "base.ir_action_report");
        },
        renderViewAccess: async function () {
            const self = this, {typeEdit} = this.state, {model, label, action, title} = this.edit_types[typeEdit];
            this.renderTitle({label: label});
            await this.loadAction(() => {
                var domain = [];
                if (typeEdit != "translation") {
                    domain = [['model_name', '=', odoo['studio'].state.model]];
                    if (typeEdit == "automation") {
                        domain.push(['trigger', '!=', 'button_action']);
                    }
                }
                const automationContent = new AutomationContent(self, {
                    modelName: model,
                    viewInfo: self.fieldsViews,
                    title: title,
                    domain: domain,
                    searchInfo: self.fieldsViews.search
                });
                automationContent.appendTo(self.$el.find(".wgCon"));
                self.bindAction();
            }, action, {views: odoo['studio'].views[typeEdit]});
        },
        renderTitle: function (props) {
            const self = this, {viewType, step, typeEdit} = this.state;
            if (step == "setup" && typeEdit != "views" || (typeEdit == "views" && this.ref.view.isRootView)) {
                const viewSupport = ["list", "kanban", "calendar", "graph", "pivot", "plan", "activity"], {views} = this.action,
                    _views = views.filter((view) => !["form", "search"].includes(view[1]) && viewSupport.includes(view[1])).map((view) => ({
                        type: view[1],
                        has: true
                    }));

                viewSupport.map((_v) => _views.findIndex((_v_) => _v_.type == _v) < 0 ? _views.push({
                    type: _v,
                    has: false
                }) : false);

                _views.push({type: "form", has: views.findIndex((v) => v[1] == "form") >= 0});
                _views.push({type: "search", has: views.findIndex((v) => v[1] == "search") >= 0});

                Object.assign(props, {
                    viewSupport: _views, editTypes: this.edit_types, typeEdit: typeEdit
                });
                if (typeEdit == "views") {
                    Object.assign(props, {
                        viewSupport: _views,
                        showViewSupport: true,
                        views: this.views,
                        viewType: viewType
                    });
                }
            }
            const $title = $(QWeb.render("ViewStudio.ViewsCenter.Title", props || {}));
            if (props.editTitle) {
                const inputTitle = new basic_fields.Input(this, {
                    onChange: (val) => {
                        props.controller.label = val;
                        self.controlModel.storeAction(self.action.id, {name: val});
                    }, value: props.label,
                });
                inputTitle.appendTo($title.find(".landing-title"));
            }
            const onStopSort = function (event, ui) {
                const views = self.action.views, viewViews = views.map((v) => v[1]);
                var viewsOrder = ui.item.parent().find("a").map((index, item) => $(item).attr("name")).toArray();
                self.action.views = viewsOrder.filter((v) => viewViews.includes(v)).map((v) => views.find(e => e[1] == v));
                self.controlModel.storeAction(self.action.id, {
                    name: props.controller.label,
                    views_order: JSON.stringify(viewsOrder).replace("list", "tree"),
                });
            };
            $title.find(".wHasViews").sortable({
                connectWith: ".wHasViews",
                items: ">:not(.disable, [name='form'], [name='search'])",
                stop: function (event, ui) {
                    onStopSort(event, ui);
                },
            }).disableSelection();
            this.$el.find('.wgHead').empty().append($title);
        },
        _renderViewView: async function (viewInfo, wrap, props) {
            const params = {
                viewInfo: viewInfo,
                action: {},
                onGet: this.onGet.bind(this),
                processFieldsView: this._processFieldsView.bind(this),
                renderSubView: this.renderSubView.bind(this)
            };
            Object.assign(params, props || {});
            const widgetView = new this.viewWidgets[viewInfo.type](this, params);
            await widgetView.appendTo(wrap);
            return widgetView;
        },
        renderSubView: async function (viewInfo) {
            const viewType = viewInfo.type, viewContent = this.ref.view.ref.widget,
                urlState = $.bbq.getState(true),
                {initialState, model} = viewContent, viewProps = {}, {string, name} = viewInfo.parentField.fieldInfo;
            const params = {parentView: this.ref.view, viewRoot: this.ref.viewRoot},
                res_ids = initialState.data[name].res_ids || [],
                loadParams = {localData: model.localData, parentID: initialState.data[name].id};
            if (["list", "tree"].includes(viewType)) {
                viewProps.hasSelectors = false;
                viewProps._static = true;
                loadParams.res_ids = res_ids;
                loadParams.parentID = initialState.id;
            } else if (["form"].includes(viewType)) {
                loadParams.res_id = res_ids.length ? res_ids[0] : undefined;
                loadParams.parentID = initialState.data[name].id;
                loadParams.context = {action_id: urlState.action};
            }
            this.setFieldsInfo(viewInfo);
            params.viewProps = viewProps;
            params.loadParams = loadParams;
            const widgetView = await this._renderViewView(viewInfo, this.$el.find(".wgCon"), params);
            widgetView.isSubView = true;
            this.setStackId(widgetView, true, string);
        },
        renderViewViews: async function (wrap) {
            var self = this, {viewType} = this.state, {id} = $.bbq.getState(true);
            if (!(this.action && this.action.id == odoo['studio'].state.action)) {
                await this.loadAction(() => {
                    self.renderButtonAction();
                    self.bindAction();
                });
            }
            if (!this.validAction()) {
                return false;
            }
            if (!(viewType in this.viewWidgets)) {
                this.setState({viewType: Object.keys(this.fieldsViews).filter((vType) => this.viewWidgets[vType])[0]});
                viewType = this.state.viewType;
            }
            if (viewType in this.fieldsViews) {
                this.controllerStack = [];
                const params = {
                        action: this.action,
                        loadParams: {res_id: id || undefined, res_ids: id ? [id] : undefined}
                    },
                    widgetView = await this._renderViewView(this.getViewInfo(), wrap || this.$el.find(".wgCon"), params);
                widgetView.isRootView = true;
                this.setStackId(widgetView, true, self.action.display_name);
                this.ref.viewRoot = widgetView;
            } else {
                this.activeConfirm();
            }
        },
        renderViewSetup: async function () {
            const {typeEdit} = this.state;
            await this.edit_types[typeEdit].render();
        },
        onPushState: function (state) {
            if (state) {
                this.setState({typeEdit: "views", step: "setup", viewType: state.view_type});
            }
            this.action = false;
            this.renderElement();
        },
        renderView: async function () {
            const {step} = this.state;
            await this.steps[step].render();
            if (this.validAction()) {
                this.renderButtonAction();
            }
        }
    });


    return ViewsCenter;
});
