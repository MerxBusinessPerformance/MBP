
from odoo import api, models


class ThemeClarico(models.AbstractModel):
    _inherit = 'theme.utils'

    @api.model
    def _reset_default_config(self):

        self.disable_view('theme_clarico_vega.customize_header_style_1')
        self.disable_view('theme_clarico_vega.customize_header_style_2')
        self.disable_view('theme_clarico_vega.customize_header_style_3')
        self.disable_view('theme_clarico_vega.customize_header_style_4')
        self.disable_view('theme_clarico_vega.customize_header_style_5')
        self.disable_view('theme_clarico_vega.customize_header_style_6')
        self.disable_view('theme_clarico_vega.customize_header_style_7')
        self.disable_view('theme_clarico_vega.customize_header_style_8')
        self.disable_view('theme_clarico_vega.customize_header_style_9')
        self.disable_view('theme_clarico_vega.customize_header_style_10')

        super(ThemeClarico, self)._reset_default_config()
