odoo.define('dashboard_studio.graph', function (require) {
"use strict";

    // var GraphView = require('web.GraphView');
    var Domain = require('web.Domain');
    // var GraphController = require('web.GraphController');
    var basic_fields = require('dashboard_studio.basic_fields');
    var baseEdit = require('dashboard_studio.views_edit_base');


    // GraphController.include({
    //     init: function (parent, model, renderer, params) {
    //         this._super(parent, model, renderer, params);
    //         this.props = params;
    //     },
    //     _pushState: function () {
    //         const {fromEdit} = this.props;
    //         if (!fromEdit) {
    //             this._super();
    //         }
    //     }
    // });

    var GraphProps = baseEdit.ViewProps.extend({
        init: function(parent, props) {
            this._super(parent, props);
            this.hideTab = true;
            this.nodeProps.orientation = {name: 'orientation', valType: "string", label: 'Orientation', widget: basic_fields.Selection};
            this.nodeProps.type = {name: 'type', valType: "string", label: 'Mode', widget: basic_fields.Selection};
            this.nodeProps.stacked = {name: 'stacked', valType: "boolean", label: 'Stacked', widget: basic_fields.Radio};
            this.viewPropsView = ["orientation", "type", "stacked"];
        },
        prepareParamsProp: function (node, viewPropsView) {
            const propsProp = this._super(node, viewPropsView);
            propsProp.orientation.options = [{label: 'Horizontal', value: 'horizontal'}, {label: 'Vertical', value: 'vertical'}];
            propsProp.type.options = [{label: 'Bar', value: 'bar'}, {label: 'Pie', value: 'pie'}, {label: 'Line', value: 'line'}];
            return propsProp;
        },
    });

    var GraphViewContent = baseEdit.ViewContent.extend({
        template: 'DashboardStudio.View.Graph',
        init: function(parent, params) {
            this._super(parent, params);
            this.viewConfig.prop = GraphProps;
            this.viewConfig.view = false;
        },
    });

    return GraphViewContent;

});
