odoo.define('dashboard_studio.DashboardRenderer', function (require) {
"use strict";

var AbstractRenderer = require('web.AbstractRenderer');
// var GraphView = require('web.GraphView');
var core = require('web.core');
var field_utils = require('web.field_utils');
var base = require("dashboard_studio.base");
var DashboardCard = require("dashboard_studio.DashboardCard").DashboardCard;

var QWeb = core.qweb;


var DashboardRenderer = AbstractRenderer.extend({
    tagName: 'div',
    className: 'o_dashboard_container',
    events: _.extend({}, AbstractRenderer.prototype.events, {
        'hover td': '_onTdHover',
    }),
    init: function (parent, state, params) {
        this._super.apply(this, arguments);
        this.props = params;
        this.willRender = false;
        this.cardStore = {};
    },
    updateState: function (state, params) {
        if ((params || {}).hasOwnProperty("editMode")) {
            this.willRender = true;
        }
        return this._super.apply(this, arguments);
    },
    _hasContent: function () {},
    _render: function () {
        const res = this._super.apply(this, arguments);
        if (this.willRender) {
            this.renderGridStack();
        }
        return res;
    },
    on_attach_callback: function () {
        this.isInDOM = true;
        this.renderGridStack();
        $("body").addClass("dashboardView");
        this._super();
    },
    on_detach_callback: function () {
        this.isInDOM = false;
        $("body").removeClass("dashboardView");
        this._super();
    },
    renderGridStack: function () {
        if (this.isInDOM) {
            this.willRender = false;
            if (this.grid) {
                this.grid.destroy();
            }
            this.$el.append(QWeb.render("Dashboard.Grid", {}));
            let grid = GridStack.init({
                alwaysShowResizeHandle: /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(
                    navigator.userAgent
                ),
                resizable: {
                    handles: 'e, se, s, sw, w'
                },
                column: 36,
                acceptWidgets: true,
                dragIn: '.newWidget',  // class that can be dragged from outside
                dragInOptions: {revert: 'invalid', scroll: false, appendTo: 'body', helper: 'clone'},
                removable: '#trash', // drag-out delete class
                removeTimeout: 100,
            });
            this.grid = grid;
            const items = [], self = this, {data, editMode} = this.state, noMove = !editMode, noResize = !editMode;
            data.map((record) => {
                const {id, gs_x, gs_y, gs_h, gs_w} = record;
                items.push({
                    x: gs_x,
                    y: gs_y,
                    w: gs_w || 4,
                    h: gs_h || 2,
                    noMove: noMove,
                    noResize: noResize,
                    content: `<div class="wWidget" data-id="${id}"></div>`,
                });
            });
            grid.load(items);
            data.map((record) => {
                const elWrapWidget = self.$el.find(`.wWidget[data-id='${record.id}']`),
                    elStackItem = elWrapWidget.parents(".grid-stack-item");
                elWrapWidget.parent().addClass("_divSBB");
                const dashboardCard = new DashboardCard(self, {record: record, editMode: editMode, elStackItem: elStackItem});
                if (elStackItem.length) {
                    elStackItem.attr({'widget_type': record.view_type});
                }
                dashboardCard.appendTo(elWrapWidget);
                self.cardStore[record.id] = dashboardCard;
            });
        }
    },
});

return DashboardRenderer;
});
