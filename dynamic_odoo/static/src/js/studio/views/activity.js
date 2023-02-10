odoo.define('dynamic_odoo.activity', function (require) {
    "use strict";

    var ActivityView = require('@mail/js/views/activity/activity_view');
    var baseEdit = require('dynamic_odoo.views_edit_base');

    var ActivityProps = baseEdit.ViewProps.extend({
        init: function (parent, props) {
            this._super(parent, props);
            this.hideTab = true;
            this.viewPropsView = [];
        },
    });

    var ActivityEditView = baseEdit.ViewContent.extend({
        template: 'ViewStudio.View.activity',
        isLegacy: true,
        init: function (parent, params) {
            this._super(parent, params);
            const symbolDefault = Object.getOwnPropertySymbols(ActivityView)[0];
            this.viewConfig.prop = ActivityProps;
            this.viewConfig.view = ActivityView[symbolDefault];
        },
    });

    return ActivityEditView;

});
