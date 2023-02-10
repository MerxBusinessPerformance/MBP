/** @odoo-module **/
const {NavBar} = require("@web/webclient/navbar/navbar");
const {patch} = require('web.utils');
const MenuEditor = require("view_center.menu_center");
const rootWidget = require("root.widget");
const {useService} = require("@web/core/utils/hooks");

const {Component, tags} = owl;

class NarBarEdit extends Component {
    setup() {
        this.menuService = useService("menu")
    }
    onShowEdit() {
        const menuEditor = new MenuEditor(rootWidget, {menuService: this.menuService});
        menuEditor.appendTo($("body"));
    }
}

NarBarEdit.template = tags.xml`
    <t t-name="studio.IconEdit">
        <a class="navEdit o_menu_sections_more" tabindex="0" t-on-click="onShowEdit">
            <i class="fa fa-pencil" /> Edit
            <i style="display: none" data-section="-1"></i>
        </a>
    </t>
`


patch(NavBar.prototype, 'view_center.navBar', {
    get currentAppSections() {
        return this._super();
    }
});

NavBar.components = {...NavBar.components, NarBarEdit};
