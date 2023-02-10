#coding: utf-8

from odoo import _, api, fields, models
from odoo.addons.http_routing.models.ir_http import slug


class vendor_location(models.Model):
    _name = "vendor.location"
    _inherit = ["vendor.location", "portal.mixin",]

    def _compute_access_url(self):
        """
        Overwritting the compute method for access_url to pass our pathes

        Methods:
         * super
        """
        for location in self:
            location.access_url = u'/my/locations/{}'.format(slug(location))

    success = fields.Text(help="Tech field for the website")
    error = fields.Text(help="Tech field for the website")

    def get_this_location_values(self):
        """
        The method to retrieve this location values (used for js)

        Returns:
         * dict
           ** id
           ** product_name
           ** product_code
           ** description

        Extra info:
         * Expected singleton
        """
        self.ensure_one()
        return {
            "id": self.id,
            "name": self.name,
            "address": self.address,
            "description": self.description,
            "delivery_time": self.delivery_time,
        }

    @api.model
    def create_location_from_portal(self, values):
        """
        The method to create vendor.location from values and prepare defaults

        Returns:
          * char - url

        Extra info:
         * We purposefully do not pass query params to newly created url to: (a) simplify the code; (b) to avoid
           missing of new product in previous tree search
        """
        partner_id = self.env.user.partner_id.commercial_partner_id.id
        values.update({"partner_id": partner_id})
        location_id = self.create(values)
        url = location_id.access_url
        return url

    def toggle_vendor_location_active(self):
        """
        The method to archive / restore vendor.location from portal

        Extra info:
         * Expected singleton
        """
        self.ensure_one()
        self.write({
           "active": not self.active,
           "success": _(u"The location has been successfully {}".format(self.active and "archived" or "restored")),
        })
        return True
