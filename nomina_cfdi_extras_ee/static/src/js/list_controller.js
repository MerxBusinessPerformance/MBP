odoo.define('nomina_cfdi_extras_ee.ListController', function (require) {
"use strict";

var ListController = require('web.ListController');

ListController.include({
	renderButtons: function ($node) {
		this._super($node)
		if (this.modelName==='retardo.nomina' && !this.noLeaf && this.$buttons.find(".o_list_button_discard").length){
			var $import_button = $("<button type='button' class='btn btn-default btn-sm o_list_button_calcular_faltas' accesskey='cf'>Calcular faltas</button>");
			this.$buttons.find(".o_list_button_discard").after($import_button);
			this.$buttons.on('click', '.o_list_button_calcular_faltas', this._onClickCalculasFaltas.bind(this));
			
		}
	},
	_onClickCalculasFaltas : function (event) {
        event.stopPropagation();
        var self = this;
        return this.do_action({
            name: "Crear Faltas",
            type: 'ir.actions.act_window',
            view_mode: 'form',
            views: [[false, 'form']],
            target: 'new',
            res_model: 'crear.faltas.from.retardos'
        });
        
    },
});

});
