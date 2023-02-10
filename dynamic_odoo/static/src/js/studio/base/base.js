odoo.define('dynamic_odoo.base', function (require) {
    "use strict";

    var core = require('web.core');
    var Widget = require('web.Widget');
    var QWeb = core.qweb;
    var mixins = require('web.mixins');
    var Domain = require('web.Domain');
    var BasicModel = require('web.BasicModel');
    // var basic_fields = require('dynamic_odoo.basic_fields');

    var WidgetBase = Widget.extend(mixins.EventDispatcherMixin, {
        init: function (parent, params) {
            this._super(parent, params);
            this.ref = {};
            this.parent = parent;
            this.props = params;
            this.state = {};
            this.initParams();
        },
        initParams: function () {
            this.model = new BasicModel(new Widget());
        },
        setState: function (params) {
            Object.keys(params).map((name) => {
                this.state[name] = params[name];
            });
        },
        hide: function () {
            this.$el.removeClass("viewShow").addClass("viewHide");
        },
        show: function () {
            this.$el.removeClass("viewHide").addClass("viewShow");
        },
        stringToArray: function (args) {
            return Domain.prototype.stringToArray(args);
        },
        arrayToString: function (args) {
            return Domain.prototype.arrayToString(args);
        },
        dateToServer: function (date) {
            return date.clone().utc().locale('en').format('YYYY-MM-DD HH:mm:ss');
        },
        rgbToHex: function(color) {
            const rgba = color.replace(/^rgba?\(|\s+|\)$/g, '').split(',');
            return `#${((1 << 24) + (parseInt(rgba[0]) << 16) + (parseInt(rgba[1]) << 8) + parseInt(rgba[2])).toString(16).slice(1)}`;
        },
        hexToRGB: function(hex, opacity){
            hex = hex.replace('#', '');
            const r = parseInt(hex.substring(0,2), 16), g = parseInt(hex.substring(2,4), 16),
                b = parseInt(hex.substring(4,6), 16), result = 'rgba('+r+','+g+','+b+','+opacity/100+')';
            return result;
        },
        capitalizeFirstLetter: function(str) {
          return str.charAt(0).toUpperCase() + str.slice(1);
        },
        formatNumber: function (num) {
            return Math.abs(num) > 999 ? Math.sign(num)*((Math.abs(num)/1000).toFixed(1)) + 'k' : Math.sign(num)*Math.abs(num);
        },
        round: function (monetary) {
            return Math.round((monetary + Number.EPSILON) * 100) / 100
        },
        capitalize: function (name) {
            return name.split("_").map((str) => str.charAt(0).toUpperCase() + str.slice(1)).join(" ");
        },
        _beforeRender: function () {},
        _afterRender: function () {},
        bindStyle: function () {
            const {classes} = this.props;
            this.$el.addClass(classes || this.classes);
        },
        bindAction: function () {},
        reload: function () {
            this.renderElement();
        },
        renderView: function () {},
        renderElement: function () {
            this._beforeRender();
            this._super();
            this.renderView();
            this.bindStyle();
            this.bindAction();
            this._afterRender();
        }
    });

    return {WidgetBase: WidgetBase};
});
