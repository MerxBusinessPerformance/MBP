from odoo import models, fields, api


class IrUiMenu(models.Model):
    _inherit = 'ir.ui.menu'

    def load_web_menus(self, debug):
        web_menus = super(IrUiMenu, self).load_web_menus(debug)
        obj_menus = self.browse(list(filter(lambda x: x != 'root', web_menus.keys())))

        for m in obj_menus:
            if m.id and m.id in web_menus:
                web_menus[m.id]['parent_id'] = [m.parent_id.id, m.parent_id.display_name]
                web_menus[m.id]['sequence'] = m.sequence

        return web_menus

    @api.model
    def update_menu(self, menu_update, menu_delete):
        self.browse(menu_delete).unlink()
        for menu in menu_update:
            self.browse(int(menu)).write(menu_update[menu])


IrUiMenu()
