odoo.define('dynamic_odoo.basic_model', function (require) {
    "use strict";

    var BasicModel = require('web.BasicModel');


    BasicModel.include({
        get: function (id, options) {
            const res = this._super(id, options), element = this.localData[id];
            if (res && element) {
                if (element.approval) {
                    res.approval = element.approval;
                }
            }
            return res;
        },
        loadApproval: function (record) {
            return this['_rpc']({
                model: "studio.view.center",
                method: 'get_button_data',
                args: [record.res_id, record.model],
                context: {},
            }).then((result) => {
                const {approval} = result;
                record.approval = approval;
            });
        },
        _fetchRecord: function (record, options) {
            var def = [], isApproval = false;
            if (record.viewType == "form") {
                isApproval = true;
                def.push(this.loadApproval(record));
            }
            def.push(this._super(record, options));
            return Promise.all(def).then((result) => {
                return isApproval ? result[1] : result[0];
            });
        }
    });
});
