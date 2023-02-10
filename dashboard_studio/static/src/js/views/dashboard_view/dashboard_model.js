odoo.define('dashboard_studio.DashboardModel', function (require) {
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


var DashboardModel = AbstractModel.extend({
    init: function () {
        this._super.apply(this, arguments);
        this.editMode = false;
    },
    onLoadDashboard: function () {
        const self = this, {view_id} = this.viewInfo;
        return this['_rpc']({
            model: "view.dashboard",
            method: "load_dashboard",
            args: [false, view_id]
        }).then(function (result) {
            self.records = result;
        });
    },
    onUpdateView: function (data) {
        return this['_rpc']({
            model: "view.dashboard",
            method: "update_view",
            args: [data]
        }).then(function (result) {
        });
    },
    get: function (options) {
        return {
            editMode: this.editMode,
            data: this.records,
        };
    },
    reload: function (handle, params) {
        if ('editMode' in params) {
            this.editMode = params.editMode;
        }
        return this.onLoadDashboard();
    },
    load: function (params) {
        this.data = {
            domain: params.domain,
            context: params.context,
        };
        this.viewInfo = params.viewInfo;
        return this.onLoadDashboard();
    },
});

return DashboardModel;

});
