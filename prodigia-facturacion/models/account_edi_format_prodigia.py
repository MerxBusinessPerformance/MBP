# -*- coding: utf-8 -*-
from odoo import api, models, fields, tools, _
from odoo.tools.xml_utils import _check_with_xsd
from odoo.exceptions import UserError, ValidationError, Warning

import logging
import re
import base64
import json
import requests
import random
import string

from lxml import etree
from lxml.objectify import fromstring
from datetime import datetime
from io import BytesIO
from suds.client import Client
from json.decoder import JSONDecodeError
import base64

_logger = logging.getLogger(__name__)


class AccountEdiFormatProdigia(models.Model):
    _inherit = "account.edi.format"

    def _l10n_mx_edi_get_prodigia_credentials(self, move):

        if not move.company_id.l10n_mx_edi_pac_username or not move.company_id.l10n_mx_edi_pac_password:
            return {
                'errors': [_("The username and/or password are missing.")]
            }

        return {
            'username': move.company_id.l10n_mx_edi_pac_username,
            'password': move.company_id.l10n_mx_edi_pac_password,
            'test': move.company_id.l10n_mx_edi_pac_test_env,
            'contract': move.company_id.l10n_mx_edi_pac_contract,
            'sign_url': 'https://timbrado.pade.mx/odoo/PadeOdooTimbradoService?wsdl',
            'cancel_url': 'https://timbrado.pade.mx/odoo/PadeOdooTimbradoService?wsdl',
        }

    def _l10n_mx_edi_prodigia_sign(self, move, credentials, cfdi):
        try:
            base64_bytes = base64.b64encode(cfdi)
            cfdi = base64_bytes.decode('utf-8')

            client = Client(credentials['sign_url'], timeout=50)
            if(credentials['test']):
                print("cfdi al tratar de timbrar: ", cfdi)
                response = client.service.timbradoOdooPrueba(
                    credentials['contract'], credentials['username'], credentials['password'], cfdi)
            else:
                # raise ValidationError('No deberia entrar aqui')
                response = client.service.timbradoOdoo(
                    credentials['contract'], credentials['username'], credentials['password'], cfdi)
        except Exception as e:
            return {
                'errors': [_("The prodigia service failed to sign with the following error: %s", str(e))],
            }

        # print("respuesta del servidor de pruebas: ", response)

        if response:
            msg = getattr(response, 'mensaje', None)
            code = getattr(response, 'codigo', None)
            xml_signed = getattr(response, 'xml', None)
            timbrado = getattr(response, 'timbradoOk', None)

            if timbrado:
                base64_bytes = xml_signed.encode('utf-8')
                message_bytes = base64.b64decode(base64_bytes)
                xml_signed = message_bytes.decode('utf-8')

                if xml_signed:
                    return {
                        'cfdi_signed': message_bytes,
                        'cfdi_encoding': 'str'
                    }
                else:
                    errors = []
                    if code:
                        errors.append(_("Code : %s") % code)
                    if msg:
                        errors.append(_("Message : %s") % msg)
                    return {'errors': errors}
            else:
                errors = []
                if code:
                    errors.append(_("Code : %s") % code)
                if msg:
                    errors.append(_("Message : %s") % msg)
                return {'errors': errors}

    def _l10n_mx_edi_prodigia_cancel(self, move, credentials, cfdi):
        uuid = move.l10n_mx_edi_cfdi_uuid
        certificates = move.company_id.l10n_mx_edi_certificate_ids
        certificate = certificates.sudo().get_valid_certificate()
        company = move.company_id
        cer_pem = certificate.get_pem_cer(certificate.content)
        key_pem = certificate.get_pem_key(
            certificate.key, certificate.password)
        try:

            username = credentials['username']
            password = credentials['password']
            contract = credentials['contract']
            test = credentials['test']
            rfc_receptor = move.partner_id.vat
            rfc_emisor = move.company_id
            cer_pem = base64.encodestring(cer_pem).decode('UTF-8')
            key_pem = base64.encodestring(key_pem).decode('UTF-8')

            # uuids = [inv.l10n_mx_edi_cfdi_uuid]
            rfc_receptor = move.partner_id
            rfc_rec = ""
            if rfc_receptor.vat is False:
                rfc_rec = "XAXX010101000"
            else:
                rfc_rec = rfc_receptor.vat

            monto = f"{move.l10n_mx_edi_cfdi_amount or 0 :.6f}"

            uuids = [uuid+"|"+rfc_rec +
                     "|"+rfc_emisor.vat+"|" + str(monto)]

            cancelled = False
            if(test):
                cancelled = True
                msg = 'Este comprobante se cancelo en modo pruebas'
                code = '201'
                return {'success': True}
            else:
               #  move._l10n_mx_edi_post_cancel_process(cancelled, code, msg)
                # raise ValidationError('No deberia entrar aqui')
                client = Client(credentials['cancel_url'], timeout=50)
                response = client.service.cancelar(
                    contract, username, password, rfc_emisor.vat, uuids, cer_pem, key_pem, certificate.password)
        except Exception as e:
            return {
                'errors': [_("The prodigia service failed to cancel with the following error: %s", str(e))],
            }
        if response:
            code = getattr(response, 'codigo', None)
            cancelled = code in ('201', '202')
            msg = '' if cancelled else getattr(response, 'mensaje', None)
            code = '' if cancelled else code

            errors = []
            if code:
                errors.append(_("Code : %s") % code)
            if msg:
                errors.append(_("Message : %s") % msg)
            if errors:
                return {'errors': errors}

            return {'success': True}
        else:
            errors = []
            if code:
                errors.append(_("Code : %s") % '999')
            if msg:
                errors.append(_("Message : %s") % 'El Servidor no responde')
            if errors:
                return {'errors': errors}

    def _l10n_mx_edi_prodigia_sign_invoice(self, invoice, credentials, cfdi):
        return self._l10n_mx_edi_prodigia_sign(invoice, credentials, cfdi)

    def _l10n_mx_edi_prodigia_cancel_invoice(self, invoice, credentials, cfdi):
        return self._l10n_mx_edi_prodigia_cancel(invoice, credentials, cfdi)

    def _l10n_mx_edi_prodigia_sign_payment(self, move, credentials, cfdi):
        return self._l10n_mx_edi_prodigia_sign(move, credentials, cfdi)

    def _l10n_mx_edi_prodigia_cancel_payment(self, move, credentials, cfdi):
        return self._l10n_mx_edi_prodigia_cancel(move, credentials, cfdi)
