/** @odoo-module alias=dashboard_studio.ActiveDashboard**/

const core = require('web.core');
const base = require('dashboard_studio.base');
const QWeb = core.qweb;

var ActiveDashboard = base.WidgetBase.extend({
    template: "DashboardStudio.ActiveDashboard",
    init: function (parent, props) {
        this._super(parent, props);
    },
    prepareViewData: function () {
        const name = this.$el.find("input").val(), state = $.bbq.getState(true), {model, action} = state;
        return {
            data: {
                name: name,
                model: "view.dashboard",
                arch: QWeb.templates["DashboardStudio.Widget.dashboard"].children[0].outerHTML,
                type: "dashboard",
            },
            name: name,
            action_id: action,
            view_mode: "dashboard",
        }
    },
    onCreate: function () {
        var {isMenu, menuData} = this.props, data = this.prepareViewData();
        if (isMenu) {
            data = {...menuData, view: data}
        }
        // const self = this, {env} = this.props;
        return this['_rpc']({
            model: "view.center",
            method: isMenu ? "create_new_menu" : "create_new_view",
            args: [data],
            kwargs: {},
        }).then((view_id) => {
            window.location.reload();
        })
    },
    onClose: function () {
        this.$el.remove();
    },
    bindAction: function () {
        this.$el.find(".iClose, .btnCancel").click(this.onClose.bind(this));
        this.$el.find(".btnCreate").click(this.onCreate.bind(this));
    }
});

export default ActiveDashboard
