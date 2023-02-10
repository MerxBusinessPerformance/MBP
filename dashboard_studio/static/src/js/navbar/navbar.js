/** @odoo-module **/
const {NavBar} = require("@web/webclient/navbar/navbar");
const {patch} = require('web.utils');
const MenuEditor = require("dashboard_studio.MenuEditor");
const rootWidget = require("root.widget");
const {useService} = require("@web/core/utils/hooks");

const {Component, tags} = owl;

class DBNavBarEdit extends Component {
    setup() {
        this.menuService = useService("menu")
    }
    onShowEdit() {
        const menuEditor = new MenuEditor(rootWidget, {menuService: this.menuService});
        menuEditor.appendTo($("body"));
    }
}

DBNavBarEdit.template = tags.xml`
    <t t-name="dashboard.IconEdit">
        <a class="navDB" tabindex="0" t-on-click="onShowEdit">
            <i class="fa fa-plus" />
        </a>
    </t>
`


/*patch(NavBar.prototype, 'view_center.navBar', {
    get currentAppSections() {
        return this._super();
    }
});*/

NavBar.components = {...NavBar.components, DBNavBarEdit};
