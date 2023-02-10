# -*- coding: utf-8 -*-

import logging
import re

from collections import OrderedDict
from werkzeug.urls import url_encode

from odoo import _, http
from odoo.http import request
from odoo.addons.http_routing.models.ir_http import slug
from odoo.addons.portal.controllers.portal import get_records_pager, CustomerPortal, pager as portal_pager
from odoo.osv.expression import OR
from odoo.tools.safe_eval import safe_eval


_logger = logging.getLogger(__name__)


class CustomerPortal(CustomerPortal):
    """
    Overwritting the controller to add vendor pages, forms and menus
    """
    def _prepare_portal_layout_values(self):
        """
        Overwrite to pass new params such as configured options

        Returns:
         * dict

        Extra info:
         * we do not include archived products to count
        """
        values = super(CustomerPortal, self)._prepare_portal_layout_values()
        ICPSudo = request.env['ir.config_parameter'].sudo()
        vendor_portal_stocks = safe_eval(ICPSudo.get_param('show_stocks_in_portal', "False"))
        vendor_product = request.env['vendor.product']
        vendor_location = request.env['vendor.location']
        com_partner = request.env.user.partner_id.commercial_partner_id
        responsible_user = request.env.user.partner_id.user_id or com_partner.user_id
        products_count = vendor_product.search_count([
            ("partner_id", "child_of", com_partner.id),
        ])
        locations_count = vendor_location.search_count([
            ("partner_id", "child_of", com_partner.id),
        ])
        values.update({
            "products_count": products_count,
            "vendor_portal_stocks": vendor_portal_stocks,
            "locations_count": locations_count,
            "responsible_user": responsible_user,
        })
        return values

    def _return_search_in_products(self, search_in, search):
        """
        The method to construct domain based on current user search

        Returns:
         * list - domain to search
        """
        search_domain = []
        if search_in in ('product_name', 'all'):
            search_domain = OR([search_domain, [('product_name', 'ilike', search)]])
        if search_in in ('product_code', 'all'):
            search_domain = OR([search_domain, [('product_code', 'ilike', search)]])
        return search_domain

    def _return_search_in_locations(self, search_in, search):
        """
        The method to construct domain based on current user search

        Returns:
         * list - domain to search
        """
        search_domain = []
        if search_in in ('name', 'all'):
            search_domain = OR([search_domain, [('name', 'ilike', search)]])
        if search_in in ('address', 'all'):
            search_domain = OR([search_domain, [('address', 'ilike', search)]])
        return search_domain

    def _return_searchbar_sortings_products(self, values):
        """
        Returns:
         * dict
            ** search_by_sortings - {}
            ** searchbar_filters dict - {}
            ** searchbar_inputs - {}

        Returns:
         * dict
        """
        searchbar_sortings = {
            'v_name': {'label': _('Name'), 'order': 'product_name asc, id desc'},
            'v_code': {'label': _('Code'), 'order': 'product_code asc, id desc'},
        }
        searchbar_filters = {
            'all': {'label': _('All'), 'domain': ['|', ('active', '=', True), ('active', '=', False)]},
            'active': {'label': _("Active"), 'domain': [('active', '=', True)]},
            'archived': {'label': _("Archived"), 'domain': [('active', '=', False)]},

        }
        if values.get("vendor_portal_stocks"):
            searchbar_filters.update({
                'out_of_stock':
                    {'label': _("Out of Stock"), 'domain': [('zero_qty', '=', True), ('active', '=', True)]},
            })
        searchbar_inputs = {
            'name': {'input': 'product_name', 'label': _('Search by name')},
            'code': {'input': 'product_code', 'label': _('Search by code')},
            'all': {'input': 'all', 'label': _('Search in all')},
        }
        return {
            "searchbar_sortings": searchbar_sortings,
            "searchbar_filters": searchbar_filters,
            "searchbar_inputs": searchbar_inputs,
        }

    def _return_searchbar_sortings_locations(self, values):
        """
        Returns:
         * dict
            ** search_by_sortings - {}
            ** searchbar_filters dict - {}
            ** searchbar_inputs - {}

        Returns:
         * dict
        """
        searchbar_sortings = {
            'v_name': {'label': _('Name'), 'order': 'name asc, id desc'},
        }
        searchbar_filters = {
            'all': {'label': _('All'), 'domain': ['|', ('active', '=', True), ('active', '=', False)]},
            'active': {'label': _("Active"), 'domain': [('active', '=', True)]},
            'archived': {'label': _("Archived"), 'domain': [('active', '=', False)]},
        }
        searchbar_inputs = {
            'name': {'input': 'name', 'label': _('Search by name')},
            'address': {'input': 'address', 'label': _('Search by address')},
            'all': {'input': 'all', 'label': _('Search in all')},
        }
        return {
            "searchbar_sortings": searchbar_sortings,
            "searchbar_filters": searchbar_filters,
            "searchbar_inputs": searchbar_inputs,
        }

    def _prepare_products_helper(self, page=1, sortby=None, filterby=None, search=None, search_in='content', domain=[],
                                 url="/my/products", **kw):
        """
        The helper method for products list

        Returns:
         * dict
        """
        values = self._prepare_portal_layout_values()
        product_object = request.env['vendor.product']
        if not sortby:
            sortby = 'v_name'
        if not filterby:
            filterby = 'active'
        searches_res = self._return_searchbar_sortings_products(values)
        searchbar_sortings = searches_res.get("searchbar_sortings")
        searchbar_filters = searches_res.get("searchbar_filters")
        searchbar_inputs = searches_res.get("searchbar_inputs")
        sort_order = searchbar_sortings[sortby]['order']
        domain += searchbar_filters[filterby]['domain']
        if search and search_in:
            search_domain = self._return_search_in_products(search_in, search)
            domain += search_domain
        products_count_count = product_object.search_count(domain)
        pager = portal_pager(
            url=url,
            url_args={
                'sortby': sortby,
                'filterby': filterby,
                'search': search,
                'search_in': search_in,
            },
            total=products_count_count,
            page=page,
            step=self._items_per_page,
        )
        product_ids = product_object.search(
            domain,
            order=sort_order,
            limit=self._items_per_page,
            offset=pager['offset']
        )
        values.update({
            'product_ids': product_ids,
            'pager': pager,
            'searchbar_sortings': searchbar_sortings,
            'searchbar_inputs': searchbar_inputs,
            'search_in': search_in,
            'sortby': sortby,
            'searchbar_filters': OrderedDict(sorted(searchbar_filters.items())),
            'filterby': filterby,
        })
        return values

    def _prepare_locations_helper(self, page=1, sortby=None, filterby=None, search=None, search_in='content', domain=[],
                                 url="/my/locations", **kw):
        """
        The helper method for locations list

        Returns:
         * dict
        """
        values = self._prepare_portal_layout_values()
        location_object = request.env['vendor.location']
        if not sortby:
            sortby = 'v_name'
        if not filterby:
            filterby = 'active'
        searches_res = self._return_searchbar_sortings_locations(values)
        searchbar_sortings = searches_res.get("searchbar_sortings")
        searchbar_filters = searches_res.get("searchbar_filters")
        searchbar_inputs = searches_res.get("searchbar_inputs")
        sort_order = searchbar_sortings[sortby]['order']
        domain += searchbar_filters[filterby]['domain']
        if search and search_in:
            search_domain = self._return_search_in_locations(search_in, search)
            domain += search_domain
        locations_count_count = location_object.search_count(domain)
        pager = portal_pager(
            url=url,
            url_args={
                'sortby': sortby,
                'filterby': filterby,
                'search': search,
                'search_in': search_in,
            },
            total=locations_count_count,
            page=page,
            step=self._items_per_page,
        )
        location_ids = location_object.search(
            domain,
            order=sort_order,
            limit=self._items_per_page,
            offset=pager['offset']
        )
        values.update({
            'location_ids': location_ids,
            'pager': pager,
            'searchbar_sortings': searchbar_sortings,
            'searchbar_inputs': searchbar_inputs,
            'search_in': search_in,
            'sortby': sortby,
            'searchbar_filters': OrderedDict(sorted(searchbar_filters.items())),
            'filterby': filterby,
        })
        return values

    def _prepare_vals_products(self, page=1, sortby=None, filterby=None, search=None, search_in='all', **kw):
        """
        The method to prepare values for products list

        Returns:
         * dict
        """
        domain = [
            ("partner_id", "child_of", request.env.user.partner_id.commercial_partner_id.id),
            "|",
                ("active", "=", True),
                ("active", "=", False),
        ]
        url="/my/products"
        values = self._prepare_products_helper(page=page, sortby=sortby, filterby=filterby, search=search,
                                               search_in=search_in, domain=domain, url=url, **kw)
        values.update({
            'page_name': _('My Products'),
            'default_url': '/my/products',
        })
        request.session['all_products'] = values.get("product_ids").ids[:100]
        return values

    def _prepare_vals_locations(self, page=1, sortby=None, filterby=None, search=None, search_in='all', **kw):
        """
        The method to prepare values for locations list

        Returns:
         * dict
        """
        domain = [
            ("partner_id", "child_of", request.env.user.partner_id.commercial_partner_id.id),
            "|",
                ("active", "=", True),
                ("active", "=", False),
        ]
        url="/my/locations"
        values = self._prepare_locations_helper(page=page, sortby=sortby, filterby=filterby, search=search,
                                                search_in=search_in, domain=domain, url=url, **kw)
        values.update({
            'page_name': _('My Locations'),
            'default_url': '/my/locations',
        })
        request.session['all_locations'] = values.get("location_ids").ids[:100]
        return values

    def _prepare_product(self, product_id):
        """
        Method to pass values by product

        Args:
         * product_id - vendor.product object

        Returns:
         * dict
        """
        vals = self._prepare_portal_layout_values()
        vals.update({
            'vendor_product': product_id,
            "page_name": _("Product"),
        })
        history = request.session.get('all_products', [])
        vals.update(get_records_pager(history, product_id))
        if product_id.success:
            vals.update({'success': product_id.success,})
            product_id.sudo().write({'success': False,})
        if product_id.error:
            vals.update({'error': product_id.error,})
            product_id.sudo().write({'error': False,})
        return vals

    def _prepare_location(self, location_id):
        """
        Method to pass values by location

        Args:
         * location_id - vendor.location object

        Returns:
         * dict
        """
        vals = self._prepare_portal_layout_values()
        vals.update({
            'vendor_location': location_id,
            "page_name": _("My Location"),
        })
        history = request.session.get('all_locations', [])
        vals.update(get_records_pager(history, location_id))
        if location_id.success:
            vals.update({'success': location_id.success,})
            location_id.sudo().write({'success': False,})
        if location_id.error:
            vals.update({'error': location_id.error,})
            location_id.sudo().write({'error': False,})
        return vals

    @http.route(['/my/products', '/my/products/page/<int:page>',], type='http', auth="user", website=True)
    def vendor_products_page(self, page=1, sortby=None, filterby=None, search=None, search_in='all', **kw):
        """
        The route to open the list of vendor products
        """
        values = self._prepare_vals_products(page=page, sortby=sortby, filterby=filterby, search=search,
                                             search_in=search_in, **kw)
        res = request.render("vendor_portal_management.vendor_products", values)
        return res

    @http.route(['/my/products/<model("vendor.product"):product_id>'], type='http', auth="user", website=True)
    def portal_my_product(self, product_id=None, **kw):
        """
        The route to open product

        Returns:
         * rendered page
        """
        vals = self._prepare_product(product_id=product_id)
        res = request.render("vendor_portal_management.vendor_product", vals)
        return res

    @http.route(['/my/locations', '/my/locations/page/<int:page>',], type='http', auth="user", website=True)
    def vendor_locations_page(self, page=1, sortby=None, filterby=None, search=None, search_in='all', **kw):
        """
        The route to open the list of vendor products
        """
        values = self._prepare_vals_locations(page=page, sortby=sortby, filterby=filterby, search=search,
                                              search_in=search_in, **kw)
        if values.get("vendor_portal_stocks"):
            res = request.render("vendor_portal_management.vendor_locations", values)
        else:
            res = request.render("vendor_portal_management.403")
        return res

    @http.route(['/my/locations/<model("vendor.location"):location_id>'], type='http', auth="user", website=True)
    def portal_my_location(self, location_id=None, **kw):
        """
        The route to open location

        Returns:
         * rendered page
        """
        values = self._prepare_location(location_id=location_id)
        if values.get("vendor_portal_stocks"):
            res = request.render("vendor_portal_management.vendor_location", values)
        else:
            res = request.render("vendor_portal_management.403")
        return res
