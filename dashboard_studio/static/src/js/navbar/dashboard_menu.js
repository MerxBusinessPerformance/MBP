/** @odoo-module alias=dashboard_studio.MenuEditor**/

const core = require('web.core');
const base = require('dashboard_studio.base');
const basic_fields = require('dashboard_studio.basic_fields');
const Dialog = require('web.Dialog');
const ActiveDashboard = require("dashboard_studio.ActiveDashboard");
const MenuCreator = require("dashboard_studio.MenuCreator");

var _t = core._t;


var MenuEditor = base.WidgetBase.extend({
    template: "dashboard.menu.SortEdit",
    init: function (parent, params) {
        this._super(parent, params);
        this.menuObj = {};
        this.menuDelete = [];
        this.menuUpdate = {};
        this.isApp = false;
        this.state = {menuId: false};
        this.menuService = params.menuService;
        this.menus = this.getMenuData();
    },
    getMenuData: function () {
        return this.isApp ? this.menuService.getApps() : [this.menuService.getCurrentApp()];
    },
    prepareMenuData: function () {
        const data = {}, {menuId} = this.state;
        if (menuId) {
            const menuData = this.menuObj[menuId], {sequence, parent_id} = menuData;
            data.parent_id = parent_id ? parent_id[0] : false;
            data.sequence = sequence + 1;
        }
        return data;
    },
    getMenuId: function (el) {
        return parseInt(String(el.closest('li').data("menu-id") || 0));
    },
    onSave: async function () {
        await this['_rpc']({
            model: 'ir.ui.menu',
            method: 'update_menu',
            args: [this.menuUpdate, this.menuDelete],
        });
        this.reload_menu();
    },
    reload_menu: async function (destroy = false) {
        await this.menuService.reload();
        if (destroy) {
            return this.onClose();
        }
        this.menus = this.getMenuData();
        this.renderElement();
    },
    onXpath: function (menu, menu_xpath, parent_xpath, position = "after") {
        const self = this, parent_menu = this.menuObj[menu.parent_id[0]];
        if (!parent_menu) {
            const menuIdx = this.menus.findIndex((mn) => mn.id == menu.id);
            this.menus.splice(menuIdx, 1);
            let mXIdx = this.menus.findIndex((mn) => mn.id == menu_xpath.id), sequenceRP = (menu_xpath.sequence + 1);
            this.menus.splice(position == "before" ? mXIdx : mXIdx + 1, 0, menu);
            if (position == "after") {
                menu.sequence = sequenceRP;
                self.menuUpdate[menu.id] = {sequence: sequenceRP};
            } else {
                menu.sequence = menu_xpath.sequence;
                self.menuUpdate[menu.id] = {sequence: menu_xpath.sequence};
                const reSequence = (m) => {
                    const nextMn = this.menus[mXIdx + 1];
                    if (nextMn && nextMn.sequence == sequenceRP) {
                        m.sequence = sequenceRP;
                        sequenceRP += 1;
                        mXIdx += 1;
                        self.menuUpdate[m.id] = {sequence: sequenceRP};
                        reSequence(nextMn);
                    } else if (nextMn && nextMn.sequence < sequenceRP) {
                        m.sequence = nextMn.sequence;
                        nextMn.sequence = sequenceRP;
                        self.menuUpdate[m.id] = {sequence: nextMn.sequence};
                        self.menuUpdate[nextMn.id] = {sequence: sequenceRP};
                    } else {
                        m.sequence = sequenceRP;
                        self.menuUpdate[m.id] = {sequence: sequenceRP};
                    }
                }
                reSequence(menu_xpath);
            }
            return true;
        }
        const menuIdx = parent_menu.childrenTree.findIndex((mn) => mn.id == menu.id);
        parent_menu.childrenTree.splice(menuIdx, 1);
        if (position == "append") {
            parent_xpath.childrenTree.push(menu);
        } else if (menu_xpath) {
            var xpathIndex = parent_xpath.childrenTree.findIndex((mn) => mn.id == menu_xpath.id);
            xpathIndex = position == "before" ? xpathIndex : xpathIndex + 1;
            parent_xpath.childrenTree.splice(xpathIndex, 0, menu);
            parent_xpath.childrenTree.map((mn, idx) => {
                mn['sequence'] = idx;
                const up = self.menuUpdate[mn.id] || {};
                up.sequence = mn.sequence;
                self.menuUpdate[mn.id] = up;
            });
        }
        menu.parent_id = [parent_xpath.id, parent_xpath.name];
        self.menuUpdate[menu.id] = {sequence: menu.sequence, parent_id: parent_xpath.id};
    },
    onStopSort: function (event, ui) {
        const getMenuId = (el) => this.menuObj[el.data("menu-id")];
        var item = ui.item, menu = getMenuId(item), menu_xpath = null, position = "before", parentMenu = null;
        const parent_id = item.attr("parent_id");
        if (parent_id) {
            parentMenu = this.menuObj[parent_id];
            position = "append";
        } else {
            parentMenu = getMenuId(item.parent());
            menu_xpath = item.next();
            if (!menu_xpath.length && item.prev().length) {
                menu_xpath = item.prev();
                position = "after";
            }
            menu_xpath.length ? menu_xpath = getMenuId(menu_xpath) : (position = "append");
        }
        this.onXpath(menu, menu_xpath, parentMenu, position);
        this.renderElement();
    },
    prevMenu: function (el) {
        var prev = el.prev();
        if (prev.hasClass("ui-sortable-helper")) {
            prev = prev.prev();
        }
        return prev;
    },
    _clearCh: function (ui) {
        ui.placeholder.removeClass("aCh");
        ui.item.removeAttr("parent_id");
    },
    _addCh: function (ui, prev) {
        ui.placeholder.addClass("aCh");
        ui.item.attr("parent_id", prev.data("menu-id"));
    },
    onSortSort: function (event, ui) {
        const {placeholder, item} = ui, prev = this.prevMenu(placeholder);
        const prevPos = prev.position(), itemPos = item.position();
        if (!prev.length || !((itemPos.left - prevPos.left) > 30)) {
            return this._clearCh(ui);
        }
        this._addCh(ui, prev);
    },
    onChangeSort: function (event, ui) {
        const {left} = ui.placeholder.position(), prev = this.prevMenu(ui.placeholder);
        if (prev.length && left > 60) {
            this._addCh(ui, prev);
        }
    },
    onOverSort: function (event, ui) {
        ui.placeholder.addClass("dragging");
    },
    bindSortable: function () {
        const self = this, params = {
            connectWith: "._wrapUlEdit",
            sort: function (event, ui) {
                self.onSortSort(event, ui);
            },
            over: function (event, ui) {
                self.onOverSort(event, ui);
            },
            stop: function (event, ui) {
                self.onStopSort(event, ui);
            },
            change: function (event, ui) {
                self.onChangeSort(event, ui);
            }
        }
        if (this.isApp) {
            params.axis = "y";
        }
        this.$el.find(this.isApp ? '._con > ._wrapUlEdit' : '._con > ._wrapUlEdit ._wrapUlEdit').sortable(params);
    },
    onClose: function () {
        this.$el.remove();
    },
    onEditMenu: async function (e) {
        e.stopPropagation();
        e.stopImmediatePropagation();
        const menuId = this.getMenuId($(e.currentTarget));
        var menu = await this['_rpc']({
            model: "ir.ui.menu",
            method: "search_read",
            domain: [['id', '=', menuId]]
        });
        if (menu.length) {
            menu = menu[0];
            this._onEditMenu({edit: true, menuId: menuId, value: {name: menu.name, groups_id: menu.groups_id}});
        }
    },
    onRemoveMenu: function (e) {
        const self = this;
        Dialog.specialConfirm(this, _t("Are you sure that you want to delete this menu ?"), {
            confirm_callback: async () => {
                const line = $(e.currentTarget).closest("li"), menuId = parseInt(line.first().data("menu-id"));
                delete self.menuUpdate[menuId];
                self.menuDelete.push(menuId);
                line.remove();
            },
            cancel_callback: async () => {
            }
        });
    },
    onCreateMenu: function (e) {
        e.stopPropagation();
        e.stopImmediatePropagation();
        this.state.menuId = this.getMenuId($(e.currentTarget));
        this.onMenuCreator();
    },
    _onEditMenu: function (params) {
        const self = this, elWrap = $("<div>"), menuCreator = new MenuCreator(this, params);
        menuCreator.appendTo(elWrap);
        this.$dialog = new Dialog(this, {
            buttons: [
                {
                    text: _t("Cancel"),
                    classes: 'btn',
                    close: true,
                },
                {
                    text: _t("Save"),
                    classes: 'btn-primary',
                    close: true,
                    click: async (e) => {
                        e.stopPropagation();
                        await menuCreator.onAction({});
                        await self.reload_menu(false);
                    },
                },
            ],
            $content: elWrap,
            size: 'medium',
            dialogClass: "specialConfirm",
            studio: true,
            classes: "dialogOptions",
            title: _t("Options Center"),
        });
        const _superWillStart = this.$dialog.willStart.bind(this.$dialog);
        this.$dialog.willStart = () => {
            return _superWillStart().then(() => {
                self.$dialog.$modal.addClass("canUse specialConfirm sp_small");
            });
        }
        this.$dialog.open();
    },
    onMenuCreator: function () {
        const activeDashboard = new ActiveDashboard(this, {isMenu: true, menuData: this.prepareMenuData()});
        activeDashboard.appendTo($("body"));
    },
    renderSwitchInApps: function () {
        const self = this;
        const toggleSW = new basic_fields.ToggleSwitch(this, {
            label: "In Apps", value: this.isApp, onChange: (val) => {
                self.isApp = val;
                self.menus = self.getMenuData();
                self.renderElement();
            }
        });
        toggleSW.appendTo(this.$el.find(".wpTS"));
    },
    renderElement: function () {
        this._super();
        this.renderSwitchInApps();
    },
    bindAction: function () {
        this._super();
        this.$el.find("._aClose").click(this.onClose.bind(this));
        this.$el.find(".faEdit").click(this.onEditMenu.bind(this));
        this.$el.find(".faRemove").click(this.onRemoveMenu.bind(this));
        this.$el.find("._wAdd").click(this.onCreateMenu.bind(this));
        this.$el.find("._btnConfirm").click(this.onSave.bind(this));
        this.bindSortable();
    }
});

export default MenuEditor;
