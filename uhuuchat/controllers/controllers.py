# -*- coding: utf-8 -*-
from odoo import http
import logging
_logger = logging.getLogger(__name__)

class Myuhuu(http.Controller):
        
    @http.route('/uhuuchat', auth='user', methods=['POST'], type='json')
    def index(self, **kw):    
        return {'status':'Ok','msg':'Hello, world - Uhuu', 'data':http.request.session.sid}
    
    
    # -------------------------------------
    # CONTACTS - Custom API - C,R,U
    # -------------------------------------
    #
    @http.route('/uhuuchat/contacts', auth='user', methods=['GET'], type='json')
    def getContacts(self, **kw):
        ## Validar con try/catch para evitar problemas, o gestionar las respuestas del api
        json_data = http.request.jsonrequest
        query, statusCode, message, contacts, fields, limit = [], 200, "Ok", [], ['id','name'], 5
        if 'fields' in json_data:
            fields = json_data["fields"]
            
        if 'limit' in json_data:
            limit = json_data["limit"]
            
        if 'query' in json_data :
            query = json_data["query"]
            try:
                contacts_db = http.request.env['res.partner'].search(query, limit=limit)
                contacts = contacts_db.read(fields) #[{'id': record.id} for record in contacts_db]
            
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
    
    @http.route('/uhuuchat/contacts', auth='user', methods=['POST'], type='json')
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
    
    @http.route('/uhuuchat/contacts/<int:contactId>', auth='user', methods=['PUT'], type='json')
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
    @http.route('/uhuuchat/leads', auth='user', methods=['GET'], type='json')
    def getLeads(self, **kw):
        json_data = http.request.jsonrequest
        query, statusCode, message, leads, fields, limit = [], 200, "Ok", [], ['id','name'], 5
        if 'fields' in json_data:
            fields = json_data["fields"]
        
        if 'limit' in json_data:
            limit = json_data["limit"]

        if 'query' in json_data :
            query = json_data["query"]
            try:
                leads_db = http.request.env['crm.lead'].search(query, limit=limit)
                leads = leads_db.read(fields)
            
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
    
    @http.route('/uhuuchat/leads', auth='user', methods=['POST'], type='json')
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
    
    
    @http.route('/uhuuchat/leads/<int:leadId>', auth='user', methods=['PUT'], type='json')
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
    @http.route('/uhuuchat/notes', auth='user', methods=['GET'], type='json')
    def getNotes(self, **kw):
        json_data = http.request.jsonrequest
        query, notes, statusCode, message, fields, limit  = [], [], 200, "Ok", ['id','name'], 5
        if 'fields' in json_data:
            fields = json_data["fields"]
        
        if 'limit' in json_data:
            limit = json_data["limit"]

        if 'query' in json_data :
            query = json_data["query"]
            try:
                notes_db = http.request.env['mail.message'].search(query, limit=limit)
                notes = notes_db.read(fields)
                    
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
    
    @http.route('/uhuuchat/notes', auth='user', methods=['POST'], type='json')
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

