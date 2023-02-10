odoo.define('dashboard_studio.DashboardController', function (require) {
"use strict";

var core = require('web.core');
var AbstractController = require('web.AbstractController');


var _t = core._t;
var QWeb = core.qweb;


var DashboardController = AbstractController.extend({
    custom_events: _.extend({}, AbstractController.prototype.custom_events, {
        onReload: 'triggerReload',
    }),
    contentTemplate: 'Dashboard',
    events: {
    },
    init: function (parent, model, renderer, params) {
        this._super.apply(this, arguments);
        this.viewInfo = params.viewInfo;
    },
    getTitle: function () {
        const {name} = this.viewInfo;
        return name || this._super();
    },
    triggerReload: function () {
        this.onReload({editMode: true});
    },
    onReload: function (state={}, props={}) {
        const self = this;
        this.update(state, props).then(() => {
            self.bindAction();
        });
    },
    bindStyle: function () {
        this.$buttons.find("button").removeClass("active");
        this.$buttons.find(this.edit ? ".modeEdit" : ".modeView").addClass("active");
        this.$buttons.find(".create_dashboard").css({display: this.edit ? "block" : "none"});
    },
    onClickMode: function (edit) {
        this.edit = edit;
        this.renderer.isInDOM = true;
        this.bindStyle();
        this.onReload({editMode: edit}, {editMode: true});
    },
    renderButtons: function ($node) {
        const editMode = this.model.editMode;
        this.edit = editMode;
        this.$buttons = $(QWeb.render('Dashboard.buttons', {}));
        this.$buttons.appendTo($node);
        this.$buttons.find(".modeView").click(() => this.onClickMode(false));
        this.$buttons.find(".modeEdit").click(() => this.onClickMode(true));
        this.bindStyle();
        if ($node) {
           this.$buttons.appendTo($node);
        }
    },
    bindAction: function () {
        if (this.renderer.grid) {
            const self = this;
            this.renderer.grid.on("change", (e, items) => {
                if (items) {
                    const data = items.map((item) => {
                        const cardId = $(item.content).attr("data-id");
                        self.renderer.cardStore[cardId].reload();
                        return {x: item.x, y: item.y, w: item.w, h: item.h, id: cardId};
                    });
                    this.model.onUpdateView(data);
                }
            });
        }
    },
    on_attach_callback: function () {
        this._super();
        this.bindAction();
    },
    // on_attach_callback: function () {
    //     this.renderer.isInDOM = true;
    //     this.renderer.on_attach_callback();
    //     this.bindAction();
    // },
    // /**
    //  * Called each time the record is detached from the DOM.
    //  */
    // on_detach_callback: function () {
    //     this.renderer.isInDOM = false;
    //     this.renderer.on_detach_callback();
    //     // _.invoke(this.subWidgets, 'on_detach_callback');
    // },
});

return DashboardController;

});
