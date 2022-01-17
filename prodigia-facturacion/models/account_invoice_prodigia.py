import base64
from itertools import groupby
import re
import logging
from datetime import datetime
from dateutil.relativedelta import relativedelta
from io import BytesIO
import requests
from pytz import timezone

from lxml import etree
from lxml.objectify import fromstring
from suds.client import Client

from odoo import _, api, fields, models, tools
from odoo.tools.xml_utils import _check_with_xsd
from odoo.tools import DEFAULT_SERVER_TIME_FORMAT
from odoo.tools import float_round
from odoo.exceptions import UserError
from odoo.tools.float_utils import float_repr


class AccountInvoice(models.Model):

    _inherit = 'account.move'

    @api.model
    def _l10n_mx_edi_prodigia_info(self, company_id, service_type):

        test = company_id.l10n_mx_edi_pac_test_env
        contract = company_id.l10n_mx_edi_pac_contract
        password = company_id.l10n_mx_edi_pac_password
        user = company_id.l10n_mx_edi_pac_username
        return {
            'username': user,
            'password': password,
            'contract': contract,
            'test': test,
            'sign_url': 'https://timbrado.pade.mx/odoo/PadeOdooTimbradoService?wsdl',
            'cancel_url': 'https://timbrado.pade.mx/odoo/PadeOdooTimbradoService?wsdl',
        }

    def _l10n_mx_edi_get_finkok_credentials(self, move):
        if move.company_id.l10n_mx_edi_pac_test_env:
            return {
                'username': 'cfdi@vauxoo.com',
                'password': 'vAux00__',
                'sign_url': 'http://demo-facturacion.finkok.com/servicios/soap/stamp.wsdl',
                'cancel_url': 'http://demo-facturacion.finkok.com/servicios/soap/cancel.wsdl',
            }
        else:
            if not move.company_id.l10n_mx_edi_pac_username or not move.company_id.l10n_mx_edi_pac_password:
                return {
                    'errors': [_("The username and/or password are missing.")]
                }

            return {
                'username': move.company_id.l10n_mx_edi_pac_username,
                'password': move.company_id.l10n_mx_edi_pac_password,
                'sign_url': 'http://facturacion.finkok.com/servicios/soap/stamp.wsdl',
                'cancel_url': 'http://facturacion.finkok.com/servicios/soap/cancel.wsdl',
            }

    def _l10n_mx_edi_prodigia_sign(self, pac_info):
        '''SIGN for Prodigia.
        '''
        url = pac_info['url']
        username = pac_info['username']
        password = pac_info['password']
        contract = pac_info['contract']
        test = pac_info['test']
        for inv in self:
            cfdi = inv.l10n_mx_edi_cfdi.decode('UTF-8')
            # cfdi = base64.decodestring(inv.l10n_mx_edi_cfdi)
            try:
                client = Client(url, timeout=50)
                if(test):
                    response = client.service.timbradoOdooPrueba(
                        contract, username, password, cfdi)
                else:
                    response = client.service.timbradoOdoo(
                        contract, username, password, cfdi)
            except Exception as e:
                inv.l10n_mx_edi_log_error(str(e))
                continue
            msg = getattr(response, 'mensaje', None)
            code = getattr(response, 'codigo', None)
            xml_signed = getattr(response, 'xml', None)
            inv._l10n_mx_edi_post_sign_process(xml_signed, code, msg)

    def _l10n_mx_edi_prodigia_cancel(self, pac_info):
        '''CANCEL Prodigia.
        '''

        url = pac_info['url']
        username = pac_info['username']
        password = pac_info['password']
        contract = pac_info['contract']
        test = pac_info['test']
        rfc_receptor = self.partner_id.vat
        rfc_emisor = self.company_id
        if self:
            certificate_id = self[0].company_id.l10n_mx_edi_certificate_ids[0].sudo(
            )
        for inv in self:

            # uuids = [inv.l10n_mx_edi_cfdi_uuid]
            rfc_receptor = inv.partner_id
            rfc_rec = ""
            if rfc_receptor.vat is False:
                rfc_rec = "XAXX010101000"
            else:
                rfc_rec = rfc_receptor.vat

            uuids = [inv.l10n_mx_edi_cfdi_uuid+"|"+rfc_rec +
                     "|"+rfc_emisor.vat+"|" + str(inv.amount_total)]

            if not certificate_id:
                certificate_id = inv.l10n_mx_edi_cfdi_certificate_id.sudo()
            cer_pem = base64.encodestring(certificate_id.get_pem_cer(
                certificate_id.content)).decode('UTF-8')
            key_pem = base64.encodestring(certificate_id.get_pem_key(
                certificate_id.key, certificate_id.password)).decode('UTF-8')
            key_password = certificate_id.password
            rfc_emisor = self.company_id
            cancelled = False
            if(test):
                cancelled = True
                msg = 'Este comprobante se cancelo en modo pruebas'
                code = '201'
                inv._l10n_mx_edi_post_cancel_process(cancelled, code, msg)
                continue
            try:
                client = Client(url, timeout=50)
                response = client.service.cancelar(
                    contract, username, password, rfc_emisor.vat, uuids, cer_pem, key_pem, key_password)
            except Exception as e:
                inv.l10n_mx_edi_log_error(str(e))
                continue
            code = getattr(response, 'codigo', None)
            cancelled = code in ('201', '202')
            msg = '' if cancelled else getattr(response, 'mensaje', None)
            code = '' if cancelled else code
            inv._l10n_mx_edi_post_cancel_process(cancelled, code, msg)
