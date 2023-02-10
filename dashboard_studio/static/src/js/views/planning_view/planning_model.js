odoo.define('dashboard_studio.PlanningModel', function (require) {
"use strict";

/**
 * Pivot Model
 *
 * The pivot model keeps an in-memory representation of the pivot table that is
 * displayed on the screen.  The exact layout of this representation is not so
 * simple, because a pivot table is at its core a 2-dimensional object, but
 * with a 'tree' component: some rows/cols can be expanded so we zoom into the
 * structure.
 *
 * However, we need to be able to manipulate the data in a somewhat efficient
 * way, and to transform it into a list of lines to be displayed by the renderer
 *
 * @todo add a full description/specification of the data layout
 */

var AbstractModel = require('web.AbstractModel');
var core = require('web.core');
var session = require('web.session');
var pyUtils = require('web.py_utils');
var view_dialogs = require('web.view_dialogs');
var FormViewDialog = view_dialogs.FormViewDialog;


function dateToServer (date) {
    return date.clone().utc().locale('en').format('YYYY-MM-DD HH:mm:ss');
}


var PlaningModel = AbstractModel.extend({
    init: function () {
        this._super.apply(this, arguments);
        this.willReload = true;
        this.data = null;
        this.viewType = 'week';
        this.viewData = 0;
        this.groupBy = [];
        this.initDomain = true;
    },
    onShowCreate: function (res_id=false, on_saved=()=> {}, on_remove=(res_id)=> {}, ctx={}) {
        let options = {
            res_model: this.modelName, res_id: res_id,
            context: ctx, title: "View Dialog", deletable: true,
            on_saved: (record) => {
                on_saved(record);
            },
            on_remove: () => {
               on_remove(res_id);
            }
        };
        let dialog = new FormViewDialog(this, options);
        dialog.open()
    },
    showDialog: function (res_id=false, on_saved, on_remove, ctx) {
        this.onShowCreate(res_id, on_saved, on_remove, ctx)
    },
    updatePlanning: function (res_id, data) {
        return this._onWrite(res_id, data)
    },
    _onWrite: function (res_id, data) {
        let params = {
            model: this.modelName,
            method: "write",
            args: [res_id, data]
        }
        return this['_rpc'](params);
    },
    _getRangeDomain: function (start_date, end_date) {
        const {date_start, date_end} = this.mapping;
        if (!start_date && !end_date) {
            start_date = dateToServer(moment().startOf("week"));
            end_date = dateToServer(moment().endOf("week"));
        }
        return ['|', '&', [date_start, '<=', start_date], [date_end, '>=', start_date],
                '&', '&', [date_start, '>=', start_date], [date_start, '<=', end_date],
                     '|', [date_end, '<', end_date], [date_end, '>', end_date]];
    },
    _loadPlanning: function (domain=[]) {
        const self = this, {date_start, date_end} = this.mapping;
        if (!domain.length) {
            domain = this._getRangeDomain();
        }
        domain = domain.concat(this.data.domain);
        // if (this.initDomain) {
        //     domain = this._getRangeDomain().concat(domain);
        //     this.initDomain = false;
        // }

        return this['_rpc']({
            model: this.modelName,
            method: 'search_read',
            kwargs: {
                domain: domain,
                fields: [],
                order: [{name: date_start, asc: true}],
                context: this.data.context,
            },
        }).then(function (result) {
            self.data.data = result;
        });
    },
    get: function (options) {
        return {
            data: this.data.data,
            day: this.day,
            week: this.week,
            month: this.month,
            viewType: this.viewType,
            viewData: this.viewData,
            groupBy: this.groupBy
        };
    },
    reload: function (handle, params) {
        if (params.domain) {
            this.data.domain = params.domain;
        }
        if (params.context) {
            this.data.context = params.context;
        }
        if (params.groupBy) {
            this.groupBy = params.groupBy;
            if (!this.groupBy.length) {
                this.groupBy = [this.mapping.default_group || this.fieldNames[0]];
            }
        }
        return this._loadPlanning();
    },
    load: function (params) {
        this.data = {
            domain: params.domain,
            context: params.context,
        };
        this.displayFields = params.displayFields;
        this.fieldNames = params.fieldNames;
        this.modelName = params.modelName;
        this.fields = params.fields;
        this.mapping = params.mapping;
        if (params.scale) {
            this.viewType = params.scale;
        }
        if (!this.groupBy.length) {
            this.groupBy = [this.mapping.default_group || this.fieldNames[0]];
        }

        return this._loadPlanning();
    },
});

return PlaningModel;

});
