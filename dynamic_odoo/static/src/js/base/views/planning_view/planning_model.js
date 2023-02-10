odoo.define('dynamic_odoo.PlanningModel', function (require) {
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
    // var core = require('web.core');
    // var session = require('web.session');
    // var pyUtils = require('web.py_utils');
    var view_dialogs = require('web.view_dialogs');
    var FormViewDialog = view_dialogs.FormViewDialog;


    function dateToServer(date) {
        return date.clone().utc().locale('en').format('YYYY-MM-DD HH:mm:ss');
    }


    var PlaningModel = AbstractModel.extend({
        init: function () {
            this._super.apply(this, arguments);
            this.data = null;
            this.viewType = 'week';
            this.viewData = 0;
            this.groupBy = [];
        },
        onShowCreate: function (res_id = false, on_saved = () => {
                                },
                                on_remove = (res_id) => {
                                }, ctx = {}) {
            const options = {
                res_model: this.modelName, res_id: res_id,
                context: ctx, title: "View Dialog", deletable: true,
                on_saved: (record) => {
                    on_saved(record);
                },
                on_remove: () => {
                    on_remove(res_id);
                }
            };
            const dialog = new FormViewDialog(this, options);
            dialog.open()
        },
        showDialog: function (res_id = false, on_saved, on_remove, ctx) {
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
        getStartEnd: function () {
            const data = {startDate: moment(), endDate: null};
            data.startDate.add(this.day, "days");
            data.startDate.add(this.week, "weeks");
            data.startDate.add(this.month, "months");
            data.startDate = data.startDate.startOf(this.viewType);
            data.endDate = data.startDate.clone().endOf(this.viewType);
            return data;
        },
        getRangeDomain: function (start_date, end_date) {
            const {date_start, date_end} = this.mapping;
            if (!start_date && !end_date) {
                const {startDate, endDate} = this.getStartEnd();
                start_date = dateToServer(startDate);
                end_date = dateToServer(endDate);
            }
            return ['|', '&', [date_start, '<=', start_date], [date_end, '>=', start_date],
                '&', '&', [date_start, '>=', start_date], [date_start, '<=', end_date],
                '|', [date_end, '<=', end_date], [date_end, '>=', end_date]];
        },
        loadPlanning: function (domain = []) {
            const self = this, {date_start} = this.mapping;
            if (!domain.length) {
                domain = this.getRangeDomain();
            }
            domain = domain.concat(this.data.domain);
            console.log(domain);
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
        checkGroupBy: function () {
            if (this.groupBy.length) {
                const rejectIndex = this.groupBy.findIndex((gb) => {
                    return ["datetime", "date"].includes(this.fields[gb.split(":")[0]].type);
                });
                if (rejectIndex >= 0) {
                    alert("We don't support group by Datetime/Date !!!");
                    this.groupBy.splice(rejectIndex, 1);
                }
            }
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
                this.checkGroupBy();
                if (!this.groupBy.length && this.fieldNames.length) {
                    this.groupBy = ['create_uid'];
                }
            }
            return this.loadPlanning();
        },
        load: function (params) {
            this.initParams = params;
            this.data = {
                domain: params.domain,
                context: params.context,
            };
            this.groupBy = params.groupBy || [];
            this.fieldNames = params.fieldNames;
            this.modelName = params.modelName;
            this.fields = params.fields;
            this.mapping = params.mapping;
            if (params.scale) {
                this.viewType = params.scale;
            }
            if (!this.groupBy.length) {
                this.groupBy = ['create_uid'];
            }
            this.checkGroupBy();
            return this.loadPlanning();
        },
    });

    return PlaningModel;

});
