import csv
import re
import json
import xlrd
import base64
import io

def leer_fichero(binario):
    csv_data = base64.b64decode(binario)
    data_file = io.StringIO(csv_data.decode("latin-1"))
    data_file.seek(0)
    csvreader = csv.reader(data_file, delimiter=',')
    fichero = list(csvreader)
    return fichero

def convertir_moneda(dato):
    dato = dato.replace('$', '').replace(',', '')
    dato = dato.replace('-', '') if dato == '-' else dato
    dato = float(dato) if dato else None
    return dato

def limpiar_string(texto):
    # Quitamos espacios blancos
    dato = ' '.join(texto.split())
    return dato


def convertir_fecha(fecha, agregar_pre_anio=False):
    print('fecha', fecha)
    fecha = fecha.split('/')
    fecha.reverse()

    if agregar_pre_anio:
        fecha[0] = '20'+fecha[0]

    fecha = '-'.join(fecha)
    return fecha

def banorte(fichero):
    fichero = leer_fichero(fichero)

    lineas_banorte = []
    del fichero[0]
    for row in fichero:
        cuenta, fecha_de_operacion, fecha, referencia, descripcion, cod_transac, sucursal, depositos, retiros, saldo, movimiento, descripcion_detallada, cheque = row

        depositos = convertir_moneda(depositos)
        retiros = convertir_moneda(retiros)
        descripcion = limpiar_string(descripcion)
        descripcion_detallada = limpiar_string(descripcion_detallada)
        amount = depositos if depositos else -retiros

        fecha_de_operacion = convertir_fecha(fecha_de_operacion)


        linea = {
            'date': fecha_de_operacion,
            'payment_ref': descripcion,
            'ref': movimiento,
            'amount': amount,
            'narration': descripcion_detallada
        }

        lineas_banorte.append(linea)
    return lineas_banorte

def bbva(fichero):

    fichero = leer_fichero(fichero)

    lineas = []
    fichero = fichero[3:]
    for row in fichero:
        fecha_operacion, concepto, referencia, referencia_ampliada, cargo, abono, saldo = row

        cargo = convertir_moneda(cargo)
        abono = convertir_moneda(abono)
        concepto = limpiar_string(concepto)
        referencia = limpiar_string(referencia)
        referencia_ampliada = limpiar_string(referencia_ampliada)
        amount = cargo if -cargo else abono
        fecha_operacion = convertir_fecha(fecha_operacion)


        linea = {
            'date': fecha_operacion,
            'payment_ref': concepto,
            'ref': referencia,
            'amount': amount,
            'narration': referencia_ampliada
        }

        lineas.append(linea)
    return lineas

def banamex(fichero):
    fichero = leer_fichero(fichero)

    def obtener_referencias(d):
        referencia_numerica = re.search("Referencia Númerica: (\d*)", d)
        referencia_numerica = referencia_numerica.group(1)

        referencia_alfanumerica = re.search(
            "Referencia Alfanúmerica: (.*) Autorización:", d)
        referencia_alfanumerica = referencia_alfanumerica.group(1)

        return referencia_numerica, referencia_alfanumerica

    lineas = []
    fichero = fichero[13:]
    for row in fichero:
        fecha, descripcion, depositos, retiros, saldo = row

        depositos = convertir_moneda(depositos)
        retiros = convertir_moneda(retiros)

        referencia, referencia_alfanumerica = obtener_referencias(descripcion)

        # Referencia Alfanúmerica

        referencia = limpiar_string(referencia)
        referencia_alfanumerica = limpiar_string(referencia_alfanumerica)

        amount = depositos if depositos else -retiros
        fecha = convertir_fecha(fecha)

        linea = {
            'date': fecha,
            'payment_ref': referencia_alfanumerica,
            'ref': referencia,
            'amount': amount,
            'narration': descripcion
        }

        lineas.append(linea)
    return lineas

def santander(fichero):
    fichero = leer_fichero(fichero)

    def corregir_fecha(fecha):
        fecha = fecha.replace('\'', '')
        mes_anio = fecha[-6:]
        anio = mes_anio[-4:]
        mes = mes_anio[0:2]
        dia = fecha[:-6]
        fecha = [dia, mes, anio]
        fecha =  ('/').join(fecha)
        fecha = convertir_fecha(fecha)
        return fecha

    lineas = []
    fichero = fichero[1:]
    for row in fichero:
        cuenta, fecha, hora, sucursal, descripcion, cargo_abono, importe, saldo, referencia, concepto, banco_participante, clabe_beneficiario, nombre_beneficiario, cta_ordenante, nombre_ordenante, codigo_devolucion, causa_devolucion, rfc_beneficiario, rfc_ordenante, clave_de_rastreo = row

        importe = convertir_moneda(cargo_abono+importe)
        referencia = limpiar_string(referencia)
        descripcion = limpiar_string(descripcion)
        fecha = corregir_fecha(fecha)

        linea = {
            'date': fecha,
            'payment_ref': descripcion,
            'ref': referencia,
            'amount': importe,
            'narration': concepto
        }

        lineas.append(linea)
    return lineas

def american_express(fichero):
    def leer_xls(file):
        file = base64.b64decode(file)
        libro = xlrd.open_workbook(file_contents=file)
        hoja = libro.sheet_by_index(0)
        lista = [hoja.row(x) for x in range(hoja.nrows)]
        return lista

    lineas = []

    fichero = leer_xls(fichero)
    fichero = fichero[18:]
    for row in fichero:
        fecha_de_pago, numero_de_pago, cargos_totales, creditos, monto_del_envio, monto_del_descuento, cuotas_e_incentivos, nombre_dba, contracargos, codigo_de_clasificacion_bancario, ajustes, monto_del_pago, numero_de_afiliacion_del_que_recibe_el_pago, numero_de_sucursal_del_que_recibe_el_pago, cantidad_de_transacciones, saldo_de_debito_inicial, n_de_cuenta_bancaria, iva, monto_pagado_al_banco = row

        # Hay que convertir desde el tipo celda
        fecha_de_pago = fecha_de_pago.value
        fecha_de_pago = convertir_fecha(fecha_de_pago)
        nombre_dba = nombre_dba.value
        numero_de_pago = numero_de_pago.value
        
        
        numero_de_afiliacion_del_que_recibe_el_pago = numero_de_afiliacion_del_que_recibe_el_pago.value

        monto_del_descuento = monto_del_descuento.value

        linea = {
            'date': fecha_de_pago,
            'payment_ref': nombre_dba,
            'ref': numero_de_pago,
            'amount': monto_del_descuento,
            'narration': f'Descuento. {numero_de_afiliacion_del_que_recibe_el_pago}'
        }
        lineas.append(linea)

        cuotas_e_incentivos = cuotas_e_incentivos.value
        linea = {
            'date': fecha_de_pago,
            'payment_ref': nombre_dba,
            'ref': numero_de_pago,
            'amount': cuotas_e_incentivos,
            'narration': f'Cuota. {numero_de_afiliacion_del_que_recibe_el_pago}'
        }
        lineas.append(linea)


        monto_del_envio = monto_del_envio.value
        linea = {
            'date': fecha_de_pago,
            'payment_ref': nombre_dba,
            'ref': numero_de_pago,
            'amount': monto_del_envio,
            'narration': f'Monto del envio. {numero_de_afiliacion_del_que_recibe_el_pago}'
        }
        lineas.append(linea)

        iva = iva.value
        linea = {
            'date': fecha_de_pago,
            'payment_ref': nombre_dba,
            'ref': numero_de_pago,
            'amount': iva,
            'narration': f'IVA. {numero_de_afiliacion_del_que_recibe_el_pago}'
        }
        
        saldo_de_debito_inicial = saldo_de_debito_inicial.value
        linea = {
            'date': fecha_de_pago,
            'payment_ref': nombre_dba,
            'ref': numero_de_pago,
            'amount': saldo_de_debito_inicial,
            'narration': f'Saldo de débito incial. {numero_de_afiliacion_del_que_recibe_el_pago}'
        }
        lineas.append(linea)


        
    return lineas


