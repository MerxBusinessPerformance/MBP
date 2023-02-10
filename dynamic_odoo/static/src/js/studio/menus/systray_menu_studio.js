/** @odoo-module **/

const start = require('dynamic_odoo.start');
const base = require('dynamic_odoo.base');
const SysTrayMenu = require('web.SystrayMenu');
const session = require('web.session');
const {mount} = owl;


var StudioMode = base.WidgetBase.extend({
    template: "Studio.Icon",
    init: function (parent, params = {}) {
        this._super(parent, params);
    },
    renderStudioMode: async function (e) {
        e.stopPropagation();
        e.stopImmediatePropagation();
        const root = await
            mount(start, {
                env: odoo['__WOWL_DEBUG__'].root.env,
                target: document.getElementsByClassName("o_action_manager")[0],
                position: "first-child"
            });
        root.render();
    },
    bindAction: function () {
        this._super();
        this.$el.click(this.renderStudioMode.bind(this));
    }
});

if (session['showStudio']) {
    StudioMode.prototype.sequence = 1;
    SysTrayMenu.Items.push(StudioMode);
}
