/** @odoo-module **/

import publicWidget from "web.public.widget";
import Dialog from "web.Dialog";
import { qweb, _t } from "web.core";
import session from "web.session";
import rpc from "web.rpc";
import ajax from "web.ajax";

publicWidget.registry.shortURLWidget = publicWidget.Widget.extend({
    selector: ".vendor_product_widget",
    events: {
        "click .edit_product_vp": "_onEditProduct",
        "click .create_product_vp": "_onCreateProduct",
        "click .toggle_active_product_vp": "_onToggleActiveProduct",
        "click .import_prices_vp": "_onImportProductPrices",
        "click .import_stocks_vp": "_onImportStocks",
        "click .edit_price": "_onEditPrice",
        "click .add_price": "_onAddPrice",
        "click .remove_price": "_onRemovePrice",
        "click .edit_quant": "_onEditQuant",
        "click .add_quant": "_onAddQuant",
        "click .remove_quant": "_onRemoveQuant",
        "click .edit_location_vp": "_onEditLocation",
        "click .create_location_vp": "_onCreateLocation",
        "click .toggle_active_location_vp": "_onToggleActiveLocation",
    },
    /*
    * Load xml templates for dialogs when widget is started
    */
    start: function () {
        ajax.loadXML('/vendor_portal_management/static/src/xml/vendor_portal.xml', qweb);
    },    
    /*
     * The method to edit existing vendor product
    */ 
    _onEditProduct: function (ev) {
        var productID = parseInt(ev.currentTarget.id);
        rpc.query({
            model: "vendor.product",
            method: "get_this_product_values",
            args: [[productID]],
            context: session.user_context,
        }).then(function(values) {
            var select = new VendorProductDialogUpdate(this, {}, values);
            var def = $.Deferred();
            select.on("save", this, function (root) {
                def.resolve(root);
            });
            select.open();
            return def.then(function (res) {
                location.reload();
            })
        });
    },
    /* 
     * The method to add new vendor product
    */ 
    _onCreateProduct: function (ev) {
        var select = new VendorProductDialogCreate(this, {}, {});
        var def = $.Deferred();
        select.on("save", this, function (root) {
            def.resolve(root);
        });
        select.open();
        return def.then(function (res) {
            location.reload();
        })
    },
    /*
     * The method to archive/restore vendor product
    */ 
    _onToggleActiveProduct: function (ev) {
        var productID = parseInt(ev.currentTarget.id);
        var select = new ConfirmToggleDialog(this, {}, {"id": productID});
        var def = $.Deferred();
        select.on("save", this, function (root) {
            def.resolve(root);
        });
        select.open();
        return def.then(function (res) {
            location.reload();
        })
    },
    /*
     * The method to import vendor products
    */
    _onImportProductPrices: function (ev) {
        rpc.query({
            model: "vendor.product",
            method: "return_import_configs",
            context: session.user_context,
        }).then(function(values) {
            var select = new VendorProductImportPrices(this, {}, values);
            var def = $.Deferred();
            select.on("save", this, function (root) {
                def.resolve(root);
            });
            select.open();
        });
    },
    /*
     * The method to import vendor stocks
    */
    _onImportStocks: function (ev) {
        rpc.query({
            model: "vendor.product",
            method: "return_import_configs",
            context: session.user_context,
        }).then(function(values) {
            var select = new VendorProductImportStocks(this, {}, values);
            var def = $.Deferred();
            select.on("save", this, function (root) {
                def.resolve(root);
            });
            select.open();
        });
    },
    /*
     * The methdo to edit product price
    */
    _onEditPrice: function (ev) {
        var priceID = parseInt(ev.currentTarget.id);
        rpc.query({
            model: "product.supplierinfo",
            method: "get_this_price_values",
            args: [[priceID]],
            context: session.user_context,
        }).then(function(values) {
            var select = new VendorPriceDialogUpdate(this, {}, values);
            var def = $.Deferred();
            select.on("save", this, function (root) {
                def.resolve(root);
            });
            select.open();
            return def.then(function (res) {
                location.reload();
            })
        });
    },
    /*
     * The method to add new price
    */
    _onAddPrice: function (ev) {
        var productID = parseInt(ev.currentTarget.id);
        rpc.query({
            model: "product.supplierinfo",
            method: "return_currencies",
            context: session.user_context,
        }).then(function(values) {
            values.id = productID;
            var select = new VendorPriceDialogCreate(this, {}, values);
            var def = $.Deferred();
            select.on("save", this, function (root) {
                def.resolve(root);
            });
            select.open();
            return def.then(function (res) {
                location.reload();
            })
        });
    },
    /*
     * The method to delete price
    */
    _onRemovePrice: function (ev) {
        var priceID = parseInt(ev.currentTarget.id);
        rpc.query({
            model: "product.supplierinfo",
            method: "get_this_price_values",
            args: [[priceID]],
            context: session.user_context,
        }).then(function(values) {
            var select = new ArchivePriceDialog(this, {}, values);
            var def = $.Deferred();
            select.on("save", this, function (root) {
                def.resolve(root);
            });
            select.open();
            return def.then(function (res) {
                location.reload();
            })
        });
    },
    /*
     * The method to edit quant
    */
    _onEditQuant: function (ev) {
        var priceID = parseInt(ev.currentTarget.id);
        rpc.query({
            model: "vendor.quant",
            method: "get_this_stock_values",
            args: [[priceID]],
            context: session.user_context,
        }).then(function(values) {
            var select = new VendorQuantDialogUpdate(this, {}, values);
            var def = $.Deferred();
            select.on("save", this, function (root) {
                def.resolve(root);
            });
            select.open();
            return def.then(function (res) {
                location.reload();
            })
        });
    },
    /*
     * The method add new vendor quant
    */
    _onAddQuant: function (ev) {
        var productID = parseInt(ev.currentTarget.id);
        rpc.query({
            model: "vendor.quant",
            method: "return_options",
            context: session.user_context,
        }).then(function(values) {
            values.id = productID;
            var select = new VendorStockDialogCreate(this, {}, values);
            var def = $.Deferred();
            select.on("save", this, function (root) {
                def.resolve(root);
            });
            select.open();
            return def.then(function (res) {
                location.reload();
            })
        });
    },
    /*
     * The method to remove quant
    */
    _onRemoveQuant: function (ev) {
        var stockID = parseInt(ev.currentTarget.id);
        rpc.query({
            model: "vendor.quant",
            method: "get_this_stock_values",
            args: [[stockID]],
            context: session.user_context,
        }).then(function(values) {
            var select = new ArchiveStockDialog(this, {}, values);
            var def = $.Deferred();
            select.on("save", this, function (root) {
                def.resolve(root);
            });
            select.open();
            return def.then(function (res) {
                location.reload();
            })
        });
    },
    /*
     * The method to edit vendor location
    */
    _onEditLocation: function (ev) {
        var locationID = parseInt(ev.currentTarget.id);
        rpc.query({
            model: "vendor.location",
            method: "get_this_location_values",
            args: [[locationID]],
            context: session.user_context,
        }).then(function(values) {
            var select = new VendorLocationDialogUpdate(this, {}, values);
            var def = $.Deferred();
            select.on("save", this, function (root) {
                def.resolve(root);
            });
            select.open();
            return def.then(function (res) {
                location.reload();
            })
        });
    },
    /*
     * The method to create new location
    */
    _onCreateLocation: function (ev) {
        var select = new VendorLocationDialogCreate(this, {}, {});
        var def = $.Deferred();
        select.on("save", this, function (root) {
            def.resolve(root);
        });
        select.open();
        return def.then(function (res) {
            location.reload();
        })
    },
    /*
     * The method to archive / restore location
    */
    _onToggleActiveLocation: function (ev) {
        var locationID = parseInt(ev.currentTarget.id);
        var select = new ConfirmLocationToggleDialog(this, {}, {"id": locationID});
        var def = $.Deferred();
        select.on("save", this, function (root) {
            def.resolve(root);
        });
        select.open();
        return def.then(function (res) {
            location.reload();
        })
    },
});

var VendorProductDialogUpdate = Dialog.extend({
    template: 'vendor_portal_management.vendor_product_dialog',
    init: function (parent, options, values) {
        // Re-write to initiate dialog form with default values
        if (values.product_name) {this.product_name = values.product_name}
        else {this.product_name = ""};
        if (values.product_code) {this.product_code = values.product_code}
        else {this.product_code = ""};
        if (values.description) {this.description = values.description}
        else {this.description = ""};
        this.vendor_product_id = values.id;
        this._super(parent, _.extend({}, {
            title: _t("Product Update"),
            buttons: [
                {text: options.save_text || _t("Update"), classes: "btn-primary o_save_button", click: this.save},
                {text: _t("Cancel"), close: true}
            ]
        }, options || {}));
    },
    get_field_values: function() {
        // The method to parse values from form
        var vals = {};
        vals.product_name = this.$el.find('#product_name')[0].value;
        vals.product_code = this.$el.find('#product_code')[0].value;
        vals.description = this.$el.find('#description')[0].value;
        vals.success = _t("The product has been successfully updated");
        return vals
    },
    save: function (ev) {
        // The method to save values to vendor product
        var self = this;
        var values = this.get_field_values();
        rpc.query({
            model: 'vendor.product',
            method: 'write',
            args: [[this.vendor_product_id], values],
            context: session.user_context,
        }).then(function(result) {
            self.destroyAction = "save";
            self.close();
            return
        });
    },
    close: function() {
        this.$modal.modal('hide');
        location.reload();
    }
});

var VendorProductDialogCreate = Dialog.extend({
    template: 'vendor_portal_management.vendor_product_dialog',
    init: function (parent, options, values) {
        // Re-write to create clean popup
        this._super(parent, _.extend({}, {
            title: _t("Product Create"),
            buttons: [
                {text: options.save_text || _t("Create"), classes: "btn-primary o_save_button", click: this.save},
                {text: _t("Cancel"), close: true}
            ]
        }, options || {}));
    },
    get_field_values: function() {
        // The method to parse values from form
        var vals = {};
        vals.product_name = this.$el.find('#product_name')[0].value;
        vals.product_code = this.$el.find('#product_code')[0].value;
        vals.description = this.$el.find('#description')[0].value;
        vals.success = _t("The product has been successfully created");
        return vals
    },
    save: function (ev) {
        // The method to save values to vendor product
        var self = this;
        var values = this.get_field_values();
        rpc.query({
            model: 'vendor.product',
            method: 'create_product_from_portal',
            args: [values],
            context: session.user_context,
        }).then(function(url) {
            self.destroyAction = "save";
            self.url_to_open = url;
            self.close();
            return
        });
    },
    close: function() {
        this.$modal.modal('hide');
        window.location = this.url_to_open;
    }
});

var ConfirmToggleDialog = Dialog.extend({
    template: 'vendor_portal_management.confirm_toggle_dialog',
    init: function (parent, options, values) {
        // Re-write to initiate confirm dialog
        this.vendor_product_id = values.id;
        this._super(parent, _.extend({}, {
            title: _t("Are you sure?"),
            buttons: [
                {text: options.save_text || _t("Yes"), classes: "btn-primary o_save_button", click: this.save},
                {text: _t("No, cancel"), close: true}
            ]
        }, options || {}));
    },
    save: function (ev) {
        // The method to toggle active fueld of vendor product
        var self = this;
        rpc.query({
            model: 'vendor.product',
            method: 'toggle_vendor_product_active',
            args: [[this.vendor_product_id]],
            context: session.user_context,
        }).then(function(result) {
            self.destroyAction = "save";
            self.close();
            return
        });
    },
    close: function() {
        this.$modal.modal('hide');
        location.reload();
    }
});

var VendorProductImportPrices = Dialog.extend({
    template: 'vendor_portal_management.vendor_product_import_prices',
    events: _.extend({}, Dialog.prototype.events, {
        "change #import_chosen_lines": "_changeVisibility",
        "change #archive_products": "_changeVisibility",
    }),
    init: function (parent, options, values) {
        // Re-write to initiate dialog form with default values
        this.vendor_product_help = values.vendor_product_help;
        this.template_table = values.prices_table;
        this.cur_help = values.cur_help;
        this._super(parent, _.extend({}, {
            title: _t("Import products and prices"),
            buttons: [
                {text: options.save_text || _t("Import"), classes: "btn-primary o_save_button", click: this.save},
                {text: _t("Cancel"), close: true}
            ]
        }, options || {}));
    },
    readBinary: function(file) {
        // The method to get binary content of the table
        var def = $.Deferred();
        var reader = new FileReader();
        reader.onload = function (file) {def.resolve(file.target.result)};
        reader.readAsDataURL(file);
        return def.then(function (res) {
            var base64res = res.split(',').pop();
            return base64res
        })
    },
    get_field_values: function() {
        // The method to parse values from form
        var def = $.Deferred();
        var fileTable = this.$el.find('#table_bin')[0].files;
        if (fileTable.length == 0) {def.resolve({})} else {
            var importLines = this.$el.find('#import_chosen_lines')[0].checked;
            var lineStart = this.$el.find('#lines_start')[0].value;
            var lineEnd = this.$el.find('#lines_end')[0].value;
            var archiveProducts = this.$el.find('#archive_products')[0].checked;
            var archivePrices = this.$el.find('#archive_prices')[0].checked;
            this.readBinary(fileTable[0]).then(function (file) {
                def.resolve({
                    'basis': file,
                    'import_chosen_lines': importLines,
                    'lines_start': lineStart,
                    'lines_end': lineEnd,
                    'archive_products': archiveProducts,
                    'archive_prices': archivePrices,
                });
            })
        };
        return def.then(function (res) {
            return res
        })
    },
    save: function (ev) {
        // The method to save values to vendor product
        var self = this;
        this.get_field_values().then(function (values) {
            rpc.query({
                model: 'vendor.product',
                method: 'import_product_prices_portal',
                args: [values],
                context: session.user_context,
            }).then(function(res_values) {
                self.destroyAction = "save";
                self.close();
                var select = new ImportResultsDialog(this, {}, res_values);
                var def = $.Deferred();
                select.on('save', this, function (root) {
                    def.resolve(root);
                });
                select.open();
                return def.then(function (res) {
                    location.reload();
                })
            });
        });
    },
    close: function() {
        this.$modal.modal('hide');
    },
    _changeVisibility: function(event) {
        // Method to hide / unhide settings based on other settings
        var importLines = this.$el.find('#import_chosen_lines')[0].checked;
        if (importLines) {
            this.$el.find("#lines_range").removeClass("hidden_input");
            this.$el.find("#archive_products_div").addClass("hidden_input");
            this.$el.find("#archive_prices_div").addClass("hidden_input");
        }
        else {
            this.$el.find("#lines_range").addClass("hidden_input");
            this.$el.find("#archive_products_div").removeClass("hidden_input");
            var archiveProducts = this.$el.find('#archive_products')[0].checked;
            if (archiveProducts) {
                this.$el.find("#archive_prices_div").addClass("hidden_input");
            }
            else {
                this.$el.find("#archive_prices_div").removeClass("hidden_input");
            }
        }
    },
});

var VendorProductImportStocks = Dialog.extend({
    template: 'vendor_portal_management.vendor_product_import_stocks',
    events: _.extend({}, Dialog.prototype.events, {
        "change #import_chosen_lines": "_changeVisibility",
        "change #archive_products": "_changeVisibility",
    }),
    init: function (parent, options, values) {
        // Re-write to initiate dialog form with default values
        this.vendor_stocks_help = values.vendor_stocks_help;
        this.template_table = values.stocks_table;
        this.uoms_help = values.uoms_help;
        this._super(parent, _.extend({}, {
            title: _t("Import products and stocks"),
            buttons: [
                {text: options.save_text || _t("Import"), classes: "btn-primary o_save_button", click: this.save},
                {text: _t("Cancel"), close: true}
            ]
        }, options || {}));
    },
    readBinary: function(file) {
        // The method to get binary content of the table
        var def = $.Deferred();
        var reader = new FileReader();
        reader.onload = function (file) {def.resolve(file.target.result)};
        reader.readAsDataURL(file);
        return def.then(function (res) {
            var base64res = res.split(',').pop();
            return base64res
        })
    },
    get_field_values: function() {
        // The method to parse values from form
        var def = $.Deferred();
        var fileTable = this.$el.find('#table_bin')[0].files;
        if (fileTable.length == 0) {def.resolve({})} else {
            var importLines = this.$el.find('#import_chosen_lines')[0].checked;
            var lineStart = this.$el.find('#lines_start')[0].value;
            var lineEnd = this.$el.find('#lines_end')[0].value;
            var archiveProducts = this.$el.find('#archive_products')[0].checked;
            var archiveStocks = this.$el.find('#archive_stocks')[0].checked;
            this.readBinary(fileTable[0]).then(function (file) {
                def.resolve({
                    'basis': file,
                    'import_chosen_lines': importLines,
                    'lines_start': lineStart,
                    'lines_end': lineEnd,
                    'archive_products': archiveProducts,
                    'archive_stocks': archiveStocks,
                });
            })
        };
        return def.then(function (res) {
            return res
        })
    },
    save: function (ev) {
        // The method to save values to vendor product
        var self = this;
        this.get_field_values().then(function (values) {
            rpc.query({
                model: 'vendor.product',
                method: 'import_product_stocks_portal',
                args: [values],
                context: session.user_context,
            }).then(function(res_values) {
                self.destroyAction = "save";
                self.close();
                var select = new ImportResultsDialog(this, {}, res_values);
                var def = $.Deferred();
                select.on('save', this, function (root) {
                    def.resolve(root);
                });
                select.open();
                return def.then(function (res) {
                    location.reload();
                })
            });
        });
    },
    close: function() {
        this.$modal.modal('hide');
    },
    _changeVisibility: function(event) {
        // Method to hide / unhide settings based on other settings
        var importLines = this.$el.find('#import_chosen_lines')[0].checked;
        if (importLines) {
            this.$el.find("#lines_range").removeClass("hidden_input");
            this.$el.find("#archive_products_div").addClass("hidden_input");
            this.$el.find("#archive_prices_div").addClass("hidden_input");
        }
        else {
            this.$el.find("#lines_range").addClass("hidden_input");
            this.$el.find("#archive_products_div").removeClass("hidden_input");
            var archiveProducts = this.$el.find('#archive_products')[0].checked;
            if (archiveProducts) {
                this.$el.find("#archive_prices_div").addClass("hidden_input");
            }
            else {
                this.$el.find("#archive_prices_div").removeClass("hidden_input");
            }
        }
    },
});

var ImportResultsDialog = Dialog.extend({
    template: 'vendor_portal_management.import_results',
    init: function (parent, options, values) {
        // Re-write to initiate confirm dialog
        this.results = values.results;
        this.num_updated = values.num_updated;
        this.errors = values.errors;
        this._super(parent, _.extend({}, {
            title: _t("Results of Import"),
            buttons: [
                {text: options.save_text || _t("Okay"), classes: "btn-primary o_save_button", click: this.save},
            ]
        }, options || {}));
    },
    save: function (ev) {
        // The method to toggle active fueld of vendor product
        var self = this;
        self.destroyAction = "save";
        self.close();
        return
    },
    close: function() {
        this.$modal.modal('hide');
        location.reload();
    }
});

var VendorPriceDialogUpdate = Dialog.extend({
    template: 'vendor_portal_management.vendor_price_dialog',
    init: function (parent, options, values) {
        // Re-write to initiate dialog form with default values
        if (values.price) {this.price = values.price}
        else {this.price = 0};
        if (values.min_qty) {this.min_qty = values.min_qty}
        else {this.min_qty = 0};
        if (values.date_start) {this.date_start = values.date_start}
        else {this.date_start = ""};
        if (values.date_end) {this.date_end = values.date_end}
        else {this.date_end = ""};
        if (values.currency_id) {this.currency_id = values.currency_id}
        else {this.currency_id = 0};
        if (values.currency_ids) {this.currency_ids = values.currency_ids}
        else {this.currency_ids = []};
        this.price_id = values.id;
        this.vendor_product_id = values.vendor_product_id;
        this._super(parent, _.extend({}, {
            title: _t("Price Update"),
            buttons: [
                {text: options.save_text || _t("Update"), classes: "btn-primary o_save_button", click: this.save},
                {text: _t("Cancel"), close: true}
            ]
        }, options || {}));
    },
    get_field_values: function() {
        // The method to parse values from form
        var vals = {};
        vals.price = this.$el.find('#price')[0].value;
        vals.min_qty = this.$el.find('#min_qty')[0].value;
        vals.date_start = this.$el.find('#date_start')[0].value;
        vals.date_end = this.$el.find('#date_end')[0].value;
        vals.currency_id = parseInt(this.$el.find('#currency_id')[0].value);
        return vals
    },
    save: function (ev) {
        // The method to save values to vendor product
        var self = this;
        var values = this.get_field_values();
        rpc.query({
            model: 'product.supplierinfo',
            method: 'write_price_from_portal',
            args: [[this.price_id], values],
            context: session.user_context,
        }).then(function(success) {
            rpc.query({
                model: 'vendor.product',
                method: 'write',
                args: [[self.vendor_product_id], {"success": success}],
                context: session.user_context,
            }).then(function(res) {
                self.destroyAction = "save";
                self.close();
                return
            });
        });
    },
    close: function() {
        this.$modal.modal('hide');
        location.reload();
    }
});

var VendorPriceDialogCreate = Dialog.extend({
    template: 'vendor_portal_management.vendor_price_dialog',
    init: function (parent, options, values) {
        // Re-write to create clean popup
        this.vendor_product_id = values.id;
        if (values.currency_ids) {this.currency_ids = values.currency_ids}
        else {this.currency_ids = []};
        this.price = 0;
        this.min_qty = 0;
        this._super(parent, _.extend({}, {
            title: _t("New Price"),
            buttons: [
                {text: options.save_text || _t("Create"), classes: "btn-primary o_save_button", click: this.save},
                {text: _t("Cancel"), close: true}
            ]
        }, options || {}));
    },
    get_field_values: function() {
        // The method to parse values from form
        var vals = {};
        vals.price = this.$el.find('#price')[0].value;
        vals.min_qty = this.$el.find('#min_qty')[0].value;
        vals.date_start = this.$el.find('#date_start')[0].value;
        vals.date_end = this.$el.find('#date_end')[0].value;
        vals.currency_id = parseInt(this.$el.find('#currency_id')[0].value);
        vals.vendor_product_id = this.vendor_product_id;
        return vals
    },
    save: function (ev) {
        // The method to save values to vendor product
        var self = this;
        var values = this.get_field_values();
        rpc.query({
            model: 'product.supplierinfo',
            method: 'create_price_from_portal',
            args: [values],
            context: session.user_context,
        }).then(function(success) {
            rpc.query({
                model: 'vendor.product',
                method: 'write',
                args: [[self.vendor_product_id], {"success": success}],
                context: session.user_context,
            }).then(function(res) {
                self.destroyAction = "save";
                self.close();
                return
            });
        });
    },
    close: function() {
        this.$modal.modal('hide');
        location.reload();
    }
});

var ArchivePriceDialog = Dialog.extend({
    template: 'vendor_portal_management.confirm_toggle_dialog',
    init: function (parent, options, values) {
        // Re-write to initiate confirm dialog
        this.price_id = values.id;
        this.vendor_product_id = values.vendor_product_id;
        this._super(parent, _.extend({}, {
            title: _t("Are you sure?"),
            buttons: [
                {text: options.save_text || _t("Yes"), classes: "btn-primary o_save_button", click: this.save},
                {text: _t("No, cancel"), close: true}
            ]
        }, options || {}));
    },
    save: function (ev) {
        // The method to toggle active fueld of vendor product
        var self = this;
        rpc.query({
            model: 'product.supplierinfo',
            method: 'write',
            args: [[this.price_id], {"active": false}],
            context: session.user_context,
        }).then(function(result) {
            rpc.query({
                model: 'vendor.product',
                method: 'write',
                args: [[self.vendor_product_id], {"success": _t("The price has been successfully archived")}],
                context: session.user_context,
            }).then(function(res) {
                self.destroyAction = "save";
                self.close();
                return
            });
        });
    },
    close: function() {
        this.$modal.modal('hide');
        location.reload();
    }
});

var VendorQuantDialogUpdate = Dialog.extend({
    template: 'vendor_portal_management.vendor_quant_dialog',
    init: function (parent, options, values) {
        // Re-write to initiate dialog form with default values
        if (values.supplier_quantity) {this.supplier_quantity = values.supplier_quantity}
        else {this.supplier_quantity = 0};
        if (values.location_id) {this.location_id = values.location_id}
        else {this.location_id = 0};
        if (values.location_ids) {this.location_ids = values.location_ids}
        else {this.location_ids = []};
        if (values.uom_id) {this.uom_id = values.uom_id}
        else {this.uom_id = 0};
        if (values.uom_ids) {this.uom_ids = values.uom_ids}
        else {this.uom_ids = []};
        this.stock_id = values.id;
        this.vendor_product_id = values.vendor_product_id;
        this._super(parent, _.extend({}, {
            title: _t("Stocks Update"),
            buttons: [
                {text: options.save_text || _t("Update"), classes: "btn-primary o_save_button", click: this.save},
                {text: _t("Cancel"), close: true}
            ]
        }, options || {}));
    },
    get_field_values: function() {
        // The method to parse values from form
        var vals = {};
        vals.supplier_quantity = this.$el.find('#supplier_quantity')[0].value;
        vals.vendor_location_id = parseInt(this.$el.find('#location_id')[0].value);
        vals.supplier_product_uom_id = parseInt(this.$el.find('#uom_id')[0].value);
        return vals
    },
    save: function (ev) {
        // The method to save values to vendor product
        var self = this;
        var values = this.get_field_values();
        rpc.query({
            model: 'vendor.quant',
            method: 'write_stock_from_portal',
            args: [[this.stock_id], values],
            context: session.user_context,
        }).then(function(success) {
            rpc.query({
                model: 'vendor.product',
                method: 'write',
                args: [[self.vendor_product_id], {"success": success}],
                context: session.user_context,
            }).then(function(res) {
                self.destroyAction = "save";
                self.close();
                return
            });
        });
    },
    close: function() {
        this.$modal.modal('hide');
        location.reload();
    }
});

var VendorStockDialogCreate = Dialog.extend({
    template: 'vendor_portal_management.vendor_quant_dialog',
    init: function (parent, options, values) {
        // Re-write to create clean popup
        this.vendor_product_id = values.id;
        this.location_id = 0;
        this.supplier_quantity = 0;
        if (values.location_ids) {this.location_ids = values.location_ids}
        else {this.location_ids = []};
        if (values.uom_ids) {this.uom_ids = values.uom_ids}
        else {this.uom_ids = []};
        this._super(parent, _.extend({}, {
            title: _t("New Stocks"),
            buttons: [
                {text: options.save_text || _t("Register"), classes: "btn-primary o_save_button", click: this.save},
                {text: _t("Cancel"), close: true}
            ]
        }, options || {}));
    },
    get_field_values: function() {
        // The method to parse values from form
        var vals = {};
        vals.supplier_quantity = this.$el.find('#supplier_quantity')[0].value;
        vals.vendor_location_id = parseInt(this.$el.find('#location_id')[0].value);
        vals.vendor_product_id = this.vendor_product_id;
        vals.supplier_product_uom_id = parseInt(this.$el.find('#uom_id')[0].value);
        return vals
    },
    save: function (ev) {
        // The method to save values to vendor product
        var self = this;
        var values = this.get_field_values();
        rpc.query({
            model: 'vendor.quant',
            method: 'create_stock_from_portal',
            args: [values],
            context: session.user_context,
        }).then(function(success) {
            rpc.query({
                model: 'vendor.product',
                method: 'write',
                args: [[self.vendor_product_id], {"success": success}],
                context: session.user_context,
            }).then(function(res) {
                self.destroyAction = "save";
                self.close();
                return
            });
        });
    },
    close: function() {
        this.$modal.modal('hide');
        location.reload();
    }
});

var ArchiveStockDialog = Dialog.extend({
    template: 'vendor_portal_management.confirm_toggle_dialog',
    init: function (parent, options, values) {
        // Re-write to initiate confirm dialog
        this.stock_id = values.id;
        this.vendor_product_id = values.vendor_product_id;
        this._super(parent, _.extend({}, {
            title: _t("Are you sure?"),
            buttons: [
                {text: options.save_text || _t("Yes"), classes: "btn-primary o_save_button", click: this.save},
                {text: _t("No, cancel"), close: true}
            ]
        }, options || {}));
    },
    save: function (ev) {
        // The method to toggle active fueld of vendor product
        var self = this;
        rpc.query({
            model: 'vendor.quant',
            method: 'write',
            args: [[this.stock_id], {"active": false}],
            context: session.user_context,
        }).then(function(result) {
            rpc.query({
                model: 'vendor.product',
                method: 'write',
                args: [[self.vendor_product_id], {"success": _t("The stock level has been successfully archived")}],
                context: session.user_context,
            }).then(function(res) {
                self.destroyAction = "save";
                self.close();
                return
            });
        });
    },
    close: function() {
        this.$modal.modal('hide');
        location.reload();
    }
});

var VendorLocationDialogUpdate = Dialog.extend({
    template: 'vendor_portal_management.vendor_location_dialog',
    init: function (parent, options, values) {
        // Re-write to initiate dialog form with default values
        if (values.name) {this.loc_name = values.name}
        else {this.loc_name = ""};
        if (values.address) {this.address = values.address}
        else {this.address = ""};
        if (values.description) {this.description = values.description}
        else {this.description = ""};
        if (values.delivery_time) {this.delivery_time = values.delivery_time}
        else {this.delivery_time = 0};
        this.vendor_location_id = values.id;
        this._super(parent, _.extend({}, {
            title: _t("Location Update"),
            buttons: [
                {text: options.save_text || _t("Update"), classes: "btn-primary o_save_button", click: this.save},
                {text: _t("Cancel"), close: true}
            ]
        }, options || {}));
    },
    get_field_values: function() {
        // The method to parse values from form
        var vals = {};
        vals.name = this.$el.find('#loc_name')[0].value;
        vals.address = this.$el.find('#address')[0].value;
        vals.delivery_time = this.$el.find('#delivery_time')[0].value;
        vals.description = this.$el.find('#description')[0].value;
        vals.success = _t("The location has been successfully updated");
        return vals
    },
    save: function (ev) {
        // The method to save values to vendor product
        var self = this;
        var values = this.get_field_values();
        rpc.query({
            model: 'vendor.location',
            method: 'write',
            args: [[this.vendor_location_id], values],
            context: session.user_context,
        }).then(function(result) {
            self.destroyAction = "save";
            self.close();
            return
        });
    },
    close: function() {
        this.$modal.modal('hide');
        location.reload();
    }
});

var VendorLocationDialogCreate = Dialog.extend({
    template: 'vendor_portal_management.vendor_location_dialog',
    init: function (parent, options, values) {
        // Re-write to create clean popup
        this._super(parent, _.extend({}, {
            title: _t("Location Create"),
            buttons: [
                {text: options.save_text || _t("Create"), classes: "btn-primary o_save_button", click: this.save},
                {text: _t("Cancel"), close: true}
            ]
        }, options || {}));
    },
    get_field_values: function() {
        // The method to parse values from form
        var vals = {};
        vals.name = this.$el.find('#loc_name')[0].value;
        vals.address = this.$el.find('#address')[0].value;
        vals.delivery_time = this.$el.find('#delivery_time')[0].value;
        vals.description = this.$el.find('#description')[0].value;
        vals.success = _t("The location has been successfully created");
        return vals
    },
    save: function (ev) {
        // The method to save values to vendor product
        var self = this;
        var values = this.get_field_values();
        rpc.query({
            model: 'vendor.location',
            method: 'create_location_from_portal',
            args: [values],
            context: session.user_context,
        }).then(function(url) {
            self.destroyAction = "save";
            self.url_to_open = url;
            self.close();
            return
        });
    },
    close: function() {
        this.$modal.modal('hide');
        window.location = this.url_to_open;
    }
});

var ConfirmLocationToggleDialog = Dialog.extend({
    template: 'vendor_portal_management.confirm_toggle_dialog',
    init: function (parent, options, values) {
        // Re-write to initiate confirm dialog
        this.vendor_location_id = values.id;
        this._super(parent, _.extend({}, {
            title: _t("Are you sure?"),
            buttons: [
                {text: options.save_text || _t("Yes"), classes: "btn-primary o_save_button", click: this.save},
                {text: _t("No, cancel"), close: true}
            ]
        }, options || {}));
    },
    save: function (ev) {
        // The method to toggle active fueld of vendor product
        var self = this;
        rpc.query({
            model: 'vendor.location',
            method: 'toggle_vendor_location_active',
            args: [[this.vendor_location_id]],
            context: session.user_context,
        }).then(function(result) {
            self.destroyAction = "save";
            self.close();
            return
        });
    },
    close: function() {
        this.$modal.modal('hide');
        location.reload();
    }
});
