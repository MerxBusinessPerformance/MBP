odoo.define('dynamic_odoo.FormRenderer', function (require) {

    var core = require('web.core');
    var FormRenderer = require('web.FormRenderer');
    var base = require('dynamic_odoo.base');
    var QWeb = core.qweb;
    // const {registerInstancePatchModel} = require('mail/static/src/model/model_core.js');
    const env = require('web.env');
    var {registerInstancePatchModel} = require('@mail/model/model_core');
    //
    //
    registerInstancePatchModel('mail.messaging_notification_handler', 'dynamic_odoo.FormRenderer', {
        _handleNotificationPartner(data) {
            if (data.type == 'approval_data') {
                this._handleApprovalNotification(data);
                return true;
            }
            return this._super(data);
        },
        _handleApprovalNotification: function (data) {
            this.env.services.bus_service.trigger('update_approval', data.approval);
        },
    });

    var ApprovalWidget = base.WidgetBase.extend({
        template: "Studio.Approval",
        init: function (parent, params) {
            this._super(parent, params);
            const {approval} = this.props;
            this.setApproval(approval);
        },
        _onUpdateApproval: function (approval) {
            this.setApproval(approval);
            if (this.ref.$details) {
                this.renderDetails();
            }
        },
        setApproval: function (approval) {
            const {user_groups} = this.getSession();
            if (user_groups) {
                approval.map((ap) => {
                    if (!user_groups.includes(ap.group_id)) {
                        ap.disable = true;
                    }
                });
            }
            this.approval = approval;
        },
        onShowApproval: function (e) {
            e.stopPropagation();
            e.stopImmediatePropagation();
            this.renderDetails();
        },
        onClose: function () {
            this.ref.$details.remove();
        },
        onAction: function (e, stateUpdate) {
            e.stopPropagation();
            e.stopImmediatePropagation();
            const recordId = $(e.currentTarget).parents(".apItem").attr("data") || "0", session = this.getSession();
            this['_rpc']({
                model: "studio.approval.details",
                method: 'approval_update',
                args: [[parseInt(recordId)], {
                    state: stateUpdate,
                    user_accepted: session.uid,
                    date_accepted: this.dateToServer(new moment())
                }],
                kwargs: {},
            });
        },
        renderDetails: function () {
            if (!this.approval.length) {
                return;
            }
            if (this.ref.$details) {
                this.ref.$details.remove();
            }
            const {left, top} = this.$el.offset();
            this.ref.$details = $(QWeb.render("Studio.Approval.details", {approval: this.approval, widget: this}));
            $('body').append(this.ref.$details);
            this.ref.$details.css({
                top: 7 + top + this.$el.outerHeight() + "px",
                left: (left + 16 - this.ref.$details.outerWidth() / 5) + "px"
            });
            this.bindAction();
        },
        bindAction: function () {
            this.$el.find(".iAP").click(this.onShowApproval.bind(this));
            if (this.ref.$details) {
                this.ref.$details.find(".apItem:not([disable]) .aAccept").click((e) => this.onAction(e, "accept"));
                this.ref.$details.find(".apItem:not([disable]) .aDecline").click((e) => this.onAction(e, "decline"));
                this.ref.$details.find(".apItem:not([disable]) .aReset").click((e) => this.onAction(e, "wait"));
                $(window).click(this.onClose.bind(this));
                this.ref.$details.click((e) => e.stopPropagation());
            }
        }
    });

    FormRenderer.include({
        init: function () {
            this._super.apply(this, arguments);
            env.services.bus_service.on('update_approval', this, this._onUpdateApproval);
            this.ref = {approval: {}};
        },
        _onUpdateApproval: function (approval) {
            this.state.approval = approval;
            Object.keys(this.ref.approval).map((buttonId) => {
                if (buttonId in approval) {
                    this.ref.approval[buttonId]._onUpdateApproval(approval[buttonId]);
                }
            });
        },
        _renderApproval: function (node, $button) {
            if (node.attrs.button_approval) {
                const approvalId = node.attrs.button_id, approvalData = (this.state.approval || {})[approvalId] || [];
                const approval = new ApprovalWidget(this, {approval: approvalData, $button: $button});
                approval.appendTo($button);
                this.ref.approval[approvalId] = approval;
            }
        },
        _renderHeaderButton: function (node) {
            const $button = this._super(node);
            this._renderApproval(node, $button);
            return $button;
        },
        _renderTagButton: function (node) {
            const $button = this._super(node);
            this._renderApproval(node, $button);
            return $button;
        },
    });
});
