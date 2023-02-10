odoo.define('dashboard_studio.activity', function (require) {
"use strict";

    var base = require('dashboard_studio.base');
    // var ActivityView = require('mail.ActivityView');
    var baseEdit = require('dashboard_studio.views_edit_base');

    var ActivityProps = baseEdit.ViewProps.extend({
        init: function(parent, props) {
            this._super(parent, props);
            const {fields} = props.viewInfo;
            this.hideTab = true;
            this.viewPropsView = [];
        },
    });

    var ActivityEditView = baseEdit.ViewContent.extend({
        template: 'DashboardStudio.View.activity',
        init: function(parent, params) {
            this._super(parent, params);
            this.viewConfig.prop = ActivityProps;
            // this.viewConfig.view = ActivityView;
        },
    });

    return ActivityEditView;

});
