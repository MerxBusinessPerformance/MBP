odoo.define('dynamic_odoo.FormController', function(require) {

    // var core = require('web.core');
    const FormController = require('web.FormController');
    const Dialog = require('web.Dialog');
    //
    //
    FormController.include({
        _onOpenOne2ManyRecord: async function (ev) {
            if (ev.data) {
                if (!ev.data.context) {
                    ev.data.context = {};
                }
                const {context} = ev.data;
                context.action = $.bbq.getState(true).action;
            };
            this._super(ev);
        },
        _callButtonAction: function (attrs, record) {
            if (attrs.need_action && attrs.button_action) {
                const data = this.model.localData[record.id];
                data.context.BUTTON_ACTION = parseInt(attrs.button_action);
            }
            return this._super(attrs, record);
        },
        _onButtonClicked: function (ev) {
            const data = ev.data;
            ev.stopPropagation();
            if (data) {
                const superFnc = this._super.bind(this), {button_id, confirm} = (data.attrs || {}), {approval} = this.renderer.state;
                if (button_id) {
                    if (approval && (approval[button_id] || []).filter((ap) => ["wait", "decline"].includes(ap.state)).length) {
                        return false;
                    }
                    if (confirm) {
                        Dialog.studioConfirm(this, confirm, {
                            confirm_callback: async () => {
                                data.attrs = {...data.attrs, confirm: false};
                                superFnc(ev);
                            },
                            cancel_callback: async () => {},
                            html: true,
                            size: "medium"
                        });
                        return false
                    }
                }
            }
            this._super(ev);
        }
    });
});
