/** @odoo-module **/

const DataExport = require('web.DataExport');

DataExport.include({
    _exportData(exportedFields, exportFormat, idsToExport) {
        if (!_.isEmpty(exportedFields)) {
            let fieldsInfo = this.record.fieldsInfo['list'];
            exportedFields.map((field) => {
                const {name} = field, fieldInfo = fieldsInfo[name];
                if (fieldInfo && fieldInfo.string) {
                    field.label = fieldInfo.string;
                }
            })
        }
        this._super(exportedFields, exportFormat, idsToExport);
    },
});
