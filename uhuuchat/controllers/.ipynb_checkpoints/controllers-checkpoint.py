# -*- coding: utf-8 -*-
from odoo import http
import logging
_logger = logging.getLogger(__name__)

class Myuhuu(http.Controller):
    #@http.route('/myuhuu', auth='public', methods=['GET'])
    #def index(self, **kw):
    #    return "Hello, world - Uhuu"
    
    
    @http.route('/myuhuu', auth='user', methods=['POST'], type='json')
    def index(self, **kw):
        json_data = http.request.jsonrequest
        query, statusCode, message, contacts = [], 200, "Ok", []
        #session = http.request.session
        #query = json_data["query"]
        #_logger.info(json_data)
        #_logger.info(session)
        _logger.info(http.request.session.sid)
        #self = http.request.env['res.users'].browse(session.uid)
        #expected = self._compute_session_token(session.sid)
        #_logger.info(expected)
        #users_db = http.request.env['res.partner'].search(query)
        #for record in users_db :
        #            contact = {
        #                "id": record['id'],
        #                "name": record['name']
        #            }
        #            contacts.append(contact)
                    
                    
        #fieldsData = {'id', 'login', 'password', 'active'}
        #_logger.info(http.request.uid)
        #_logger.info(http.request.session.uid)
        #_logger.info(http.request.env.context.get('uid'))
        
        #session_fields = ', '.join(sorted(fieldsData))
        #http.request.cr.execute("""SELECT %s, (SELECT value FROM ir_config_parameter WHERE key='database.secret')
        #                        FROM res_users
        #                        WHERE id=%%s""" % (session_fields), (2,))
        #data = http.request.cr.fetchall()
        #_logger.info(data)
        
        # generate hmac key
        #key = (u'%s' % (data_fields,)).encode('utf-8')
        # hmac the session id
        #data = sid.encode('utf-8')
        #h = hmac.new(key, data, sha256)
        # keep in the cache the token
        #return h.hexdigest()
        
        #new_token = h.hexdigest()
        #request.session.session_token = new_token
            
        return {'status':'Ok','msg':'Hello, world - Uhuu', 'data':http.request.session.sid}
    
    
    # -------------------------------------
    # CONTACTS - Custom API - C,R,U
    # -------------------------------------
    #
    @http.route('/myuhuu/contacts', auth='user', methods=['GET'], type='json')
    def getContacts(self, **kw):
        ## Validar con try/catch para evitar problemas, o gestionar las respuestas del api
        json_data = http.request.jsonrequest
        query, statusCode, message, contacts = [], 200, "Ok", []
        if 'query' in json_data :
            query = json_data["query"]
            try:
                contacts_db = http.request.env['res.partner'].search(query)
                contacts=[]
                for record in contacts_db :
                    contact = {
                        "id": record['id'],
                        "name": record['name']
                    }
                    contacts.append(contact)
            
            except Exception as err:
                print("A fault occurred")
                print(err)
                statusCode = 500
                message = err
        else:
            statusCode = 422
            message = "Missing query data"
            
        data = {
            "status" : statusCode,
            "response": contacts,
            "message": message
        }
        return data
    
    @http.route('/myuhuu/contacts', auth='user', methods=['POST'], type='json')
    def createContacts(self, **kw):
        json_data = http.request.jsonrequest
        record, contact_db, statusCode, message = {}, {}, 200, "Ok"
        
        if 'record' in json_data :
            record = json_data["record"]
            try:
                contact_rs = http.request.env['res.partner'].create([record])
                contact_db = {'id':contact_rs.id}
                
            except Exception as err:
                print("A fault occurred")
                print(err)
                statusCode = 500
                message = err
            
        else:
            statusCode = 500
            message = "Missing record data"
        
        data = {
            "status" : statusCode,
            "response": contact_db,
            "message": message
        }
        return data
    
    @http.route('/myuhuu/contacts/<int:contactId>', auth='user', methods=['PUT'], type='json')
    def updateContacts(self, contactId, **kw):
        json_data = http.request.jsonrequest
        record, contact_db, statusCode, message = {}, {}, 200, "Ok"
        if 'record' in json_data :
            record = json_data["record"]
            try:
                contact_rs = http.request.env['res.partner'].browse([contactId])
                contact_rs.write(record)
                contact_db = {'id':contact_rs.id}
                message = "Record updated successfully"
                
            except Exception as err:
                print("A fault occurred")
                print(err)
                statusCode = 500
                message = err
        else:
            statusCode = 422
            message = "Missing record data"
        
        data = {
            "status" : statusCode,
            "response": contact_db,
            "message": message
        }
        return data
    
    # -------------------------------------
    # LEADS - Custom API - C,R,U
    # -------------------------------------
    #
    @http.route('/myuhuu/leads', auth='user', methods=['GET'], type='json')
    def getLeads(self, **kw):
        json_data = http.request.jsonrequest
        query, statusCode, message, leads = [], 200, "Ok", []
        if 'query' in json_data :
            query = json_data["query"]
            try:
                leads_db = http.request.env['crm.lead'].search(query)
                for record in leads_db :
                    lead = {
                        "id": record['id'],
                        "name": record['name']
                    }
                    leads.append(lead)
            
            except Exception as err:
                print("A fault occurred")
                print(err)
                statusCode = 500
                message = err
        else:
            statusCode = 422
            message = "Missing query data"
            
        data = {
            "status" : statusCode,
            "response": leads,
            "message": message
        }
        
        return data
    
    @http.route('/myuhuu/leads', auth='user', methods=['POST'], type='json')
    def createLeads(self, **kw):
        json_data = http.request.jsonrequest
        record, lead_db, statusCode, message = {}, {}, 200, "Ok"
        
        if 'record' in json_data :
            record = json_data["record"]
            try:
                lead_rs = http.request.env['crm.lead'].create([record])
                lead_db = {'id':lead_rs.id}
            except Exception as err:
                print("A fault occurred")
                print(err)
                statusCode = 500
                message = err
            
        else:
            statusCode = 500
            message = "Missing record data"
        
        data = {
            "status" : statusCode,
            "response": lead_db,
            "message": message
        }
        return data
    
    
    @http.route('/myuhuu/leads/<int:leadId>', auth='user', methods=['PUT'], type='json')
    def updateLeads(self, leadId, **kw):
        json_data = http.request.jsonrequest
        record, lead_db, statusCode, message = {}, {}, 200, "Ok"
        if 'record' in json_data :
            record = json_data["record"]
            try:
                lead_rs = http.request.env['crm.lead'].browse([leadId])
                lead_rs.write(record)
                lead_db = {'id':lead_rs.id}
                message = "Record updated successfully"
                
            except Exception as err:
                print("A fault occurred")
                print(err)
                statusCode = 500
                message = err
        else:
            statusCode = 422
            message = "Missing record data"
        
        data = {
            "status" : statusCode,
            "response": lead_db,
            "message": message
        }
        return data
    
    
    # -------------------------------------
    # NOTES - Custom API - C,R,U
    # -------------------------------------
    #
    @http.route('/myuhuu/notes', auth='user', methods=['GET'], type='json')
    def getNotes(self, **kw):
        json_data = http.request.jsonrequest
        query, notes, statusCode, message = [], [], 200, "Ok"
        if 'query' in json_data :
            query = json_data["query"]
            try:
                notes_db = http.request.env['mail.message'].search(query)
                for record in notes_db :
                    note = {
                        "id": record['id'],
                        "name": record['body']
                    }
                    notes.append(note)
                    
            except Exception as err:
                statusCode = 500
                message = err
                
        else:
            statusCode = 422
            message = "Missing query data"
            
        data = {
            "status" : statusCode,
            "response": notes,
            "message": message
        }
        
        return data
    
    @http.route('/myuhuu/notes', auth='user', methods=['POST'], type='json')
    def createNotes(self, **kw):
        json_data = http.request.jsonrequest
        parentId, parentModel, record, statusCode, message, response = '', '', {}, 200, "Record created successfully", ""

        if 'parentId' in json_data :
            parentId = json_data['parentId']
            
        if 'parentModel' in json_data :
            if not json_data['parentModel'].lower() == 'crm.lead'.lower() :
                parentModel = 'res.partner'
            else :
                parentModel = 'crm.lead'
            
            
        if 'record' in json_data and parentModel and parentId:
            record = json_data['record']
            try:
                #note_db = http.request.env[parentModel].message_post( [record] )
                parent_db = http.request.env[parentModel].browse( [parentId] )
                if parent_db :
                    res = parent_db.message_post(**record)
                    response = {'id':res.id}
                else :
                    http.Response.status = '500'
                    statusCode = 500
                    message = "Parent record not found"
                    
            except Exception as error:
                http.Response.status = '500'
                statusCode = 500
                message = error
                
        else :
            statusCode = 422
            http.Response.status = '422'
            message = "Record data or parent data is missing"            
        
        return { "status":statusCode, "message":message, "response":response }

#    @http.route('/myuhuu/myuhuu/objects', auth='public')
#    def list(self, **kw):
#        return http.request.render('myuhuu.listing', {
#            'root': '/myuhuu/myuhuu',
#            'objects': http.request.env['myuhuu.myuhuu'].search([]),
#        })

#    @http.route('/myuhuu/myuhuu/objects/<model("myuhuu.myuhuu"):obj>', auth='public')
#    def object(self, obj, **kw):
#        return http.request.render('myuhuu.object', {
#            'object': obj
#        })
