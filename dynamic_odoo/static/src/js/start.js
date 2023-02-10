/** @odoo-module alias=dynamic_odoo.start**/

const ViewCenter = require('dynamic_odoo.ViewsCenter');
const base = require('dynamic_odoo.base');
const {useService} = require("@web/core/utils/hooks");
const rootWidget = require('root.widget');
const {Component, tags} = owl;


var StudioResource = base.WidgetBase.extend({
    init: function (parent, params = {}) {
        this._super(parent, params);
    },
    start: async function () {
        const fieldWidgets = await this.getReportFieldWidget();
        odoo['studio'].fieldWidgetOptions = fieldWidgets;
        odoo['studio'].models = await this.getModels();
        odoo['studio'].views = await this.getViews();
    },
    getViews: async function () {
        const views = await this['_rpc']({
            model: "ir.ui.view",
            method: 'get_views',
            fields: [],
            domain: []
        });
        return views;
    },
    getModels: async function () {
        const models = await this['_rpc']({
            model: "ir.model",
            method: 'search_read',
            fields: ['id', 'model', 'display_name'],
            domain: []
        }), prepareData = {};
        models.map((model) => {
            prepareData[model.model] = model;
        });
        return prepareData;
    },
    getReportFieldWidget: function () {
        return this['_rpc']({
            model: "report.center",
            method: 'get_field_widget',
            args: [],
            kwargs: {},
        });
    },
});

export default class StudioEditor extends Component {
    setup() {
        this.actionService = useService("action");
        this.menuService = useService("menu");
        this.title = useService("title");
        this.user = useService("user");
        useService("legacy_service_provider");
    }

    mounted = async () => {
        odoo.studio = {env: this.env, state: $.bbq.getState(true)};
        await (new StudioResource(rootWidget, {})).start();
        const newView = new ViewCenter(rootWidget, {
            step: 'setup',
            typeEdit: "views",
            title: "Columns Setup",
            viewType: odoo['studio'].state.view_type,
        });
        odoo['studio'].instance = newView;
        odoo.rootStudio = this;
        newView.renderElement();
        $('body').addClass("editMode");
        $(this.el).append(newView.$el);
    }
}

StudioEditor.template = tags.xml`
    <t t-name="web.ActionContainer">
        <div class="wrapStudioMode"></div>
    </t>
    `
