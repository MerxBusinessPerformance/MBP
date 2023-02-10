import ast
from lxml import etree
from odoo.tools.json import scriptsafe
from textwrap import dedent

from odoo.addons.base.models.qweb import QWeb
from odoo import models, api


class IrQWeb(models.AbstractModel, QWeb):
    _inherit = 'ir.qweb'

    def _render(self, template, values=None, **options):
        if values is None:
            values = {}
        values['json'] = scriptsafe
        values['type'] = type
        if self.is_studio():
            self.clear_caches()
        return super(IrQWeb, self)._render(template, values=values, **options)

    @api.model
    def load_template(self, view_id):
        element = self._get_template(int(view_id), {"full_branding": self.is_studio()})[0]
        return etree.tostring(element)

    def _get_template(self, template, options):
        element, document, ref = super(IrQWeb, self)._get_template(template, options)
        if self.is_studio():
            view_id = self.env['ir.ui.view']._view_obj(template).id
            if not view_id:
                raise ValueError("Template '%s' undefined" % template)

            root = element.getroottree()
            basepath = len('/'.join(root.getpath(root.xpath('//*[@t-name]')[0]).split('/')[0:-1]))
            for node in element.iter(tag=etree.Element):
                node.set('data-oe-id', str(view_id))
                node.set('data-oe-xpath', root.getpath(node)[basepath:])
        return (element, document, ref)

    def _is_static_node(self, el, options):
        return not self.is_studio() and super(IrQWeb, self)._is_static_node(el, options)

    def is_studio(self):
        return self.env.context.get("STUDIO", False)

    def _compile_directive_options(self, el, options, indent):
        if self.is_studio():
            data_options = el.get("t-options")
            if data_options:
                el.set("data-oe-options", data_options)
        return super(IrQWeb, self)._compile_directive_options(el, options, indent)

    def _compile_directive_field(self, el, options, indent):
        if self.is_studio():
            el.set('oe-field', el.get('t-field'))
        res = super(IrQWeb, self)._compile_directive_field(el, options, indent)
        return res

    def _compile_directive_esc(self, el, options, indent):
        if self.is_studio():
            el.set("oe-esc", el.get("t-esc"))
        return super(IrQWeb, self)._compile_directive_esc(el, options, indent)

    def _compile_all_attributes(self, el, options, indent, attr_already_created=False):
        code = []
        if self.is_studio():
            attr_already_created = True

            code = [self._indent(dedent("""
                attrs = {}
                attrs['data-oe-context'] = values['json'].dumps({
                    key: values['type'](values[key]).__name__
                    for key in values.keys()
                    if  key
                        and key != 'true'
                        and key != 'false'
                        and not key.startswith('_')
                        and ('_' not in key or key.rsplit('_', 1)[0] not in values or key.rsplit('_', 1)[1] not in ['even', 'first', 'index', 'last', 'odd', 'parity', 'size', 'value'])
                        and (values['type'](values[key]).__name__ not in ['LocalProxy', 'function', 'method', 'Environment', 'module', 'type'])
                })
                """).strip(), indent)]

        return code + super(IrQWeb, self)._compile_all_attributes(el, options, indent, attr_already_created=attr_already_created)
