odoo.define('dynamic_odoo.basic', function (require) {
"use strict";

    var core = require('web.core');
    var BasicModel = require('web.BasicModel');
    var BasicView = require('web.BasicView');

    BasicView.include({
        init: function (viewInfo, params) {
            this._super(viewInfo, params);
            if (params.fromEdit) {
                const {loadParams} = params;
                Object.assign(this.loadParams, loadParams);
            }
        },
        _processNode: function (node, fv) {
            const res = this._super(node, fv);
            if (node.tag === 'field') {
                const viewType= fv.type, fieldsInfo = fv.fieldsInfo[viewType], fields = fv.viewFields;
                const field = fields[node.attrs.name], fieldInfo = fieldsInfo[node.attrs.name];
                if (["many2many", "one2many"].includes(field.type) && Object.keys(fieldInfo.views).length) {
                    const getViewType = (viewType) => viewType == "list" ? "tree" : viewType;
                    Object.values(fieldInfo.views).map((view) => {
                        const viewType = getViewType(view.type);
                        if (!fv['view_studio_id'] && viewType in field.views) {
                            view.arch_base = field.views[viewType].arch;
                        }
                        view.arch_original = field.views[viewType].arch;
                        node.children.push(view.arch);
                    });
                }
            }
            return res;
        }
    });

    BasicModel.include({
        _getFieldNames: function (element, options) {
            const fieldsInfo = element.fieldsInfo, viewType = options && options.viewType || element.viewType,
                fields = fieldsInfo && fieldsInfo[viewType] || {}, newFields = Object.values(fields).filter((field) => field._new).map((field) => field.name);
            if (newFields.length) {
                return Object.keys(fields).filter((fieldName) => !newFields.includes(fieldName));
            }
            return this._super(element, options);
        },
        load: function (params) {
            if (params.localData) {
                Object.assign(this.localData, params.localData)
            }
            return this._super(params);
        }
    });
});
