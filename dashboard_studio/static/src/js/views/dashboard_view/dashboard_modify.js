odoo.define('dashboard_studio.DashboardModify', function (require) {
    "use strict";

    var AbstractRenderer = require('web.AbstractRenderer');
    // var GraphView = require('web.GraphView');
    var core = require('web.core');
    var field_utils = require('web.field_utils');
    var framework = require('web.framework');
    var base = require("dashboard_studio.base");
    var DashboardController = require("dashboard_studio.DashboardController");
    var DashboardsCenter = require("dashboard_studio.DashboardsCenter");
    var DashboardCard = require("dashboard_studio.DashboardCard").DashboardCard;

    var QWeb = core.qweb;

    var MenuDialog = base.WidgetBase.extend({
        template: "ViewCenter.MenuDialog",
        init: function (parent, params) {
            this._super(parent, params);
            const {menus, views} = this.props;
            this.menus = menus || {};
            this.views = views || [];
        },
        onClickItem: function (e) {
            e.stopPropagation();
            const menuName = $(e.currentTarget).attr("name");
            this.menus[menuName].action();
            this.onClose(e);
        },
        onClickSubItem: function (e) {
            e.stopPropagation();
            const el =  $(e.currentTarget), menuName = el.attr("name"), parentName = el.attr("parent");
            this.menus[parentName].children.filter((child) => child.name == menuName)[0].action();
        },
        onClose: function (e) {
            e.stopPropagation();
            const {onClose} = this.props;
            this.$el.remove();
            if (onClose) {
                onClose();
            }
        },
        appendTo: function (container) {
            const self = this, {left, top} = container.offset(), width = container.outerWidth(),
                height = container.outerHeight(), windowWidth = window.outerWidth;
            return this._super(container).then(() => {
                self.$el.css({position: "fixed", right: (windowWidth-width-left)+"px", top: (top+height)+"px"});
            });
        },
        bindAction: function () {
            this.$el.find(".menuItem").click(this.onClickItem.bind(this));
            this.$el.find(".subItem").click(this.onClickSubItem.bind(this));
            this.$el.find(".bgCk").click(this.onClose.bind(this));
        },
    });

    var DashboardCardAction = base.WidgetBase.extend({
        template: "Dashboard.WidgetItem.Actions",
        init: function (parent, params) {
            this._super(parent, params);
            const {moreView, actionView} = this.props;
            this.exports = {
                csv: {label: "CSV", name: "csv", action: this.exportToCSV.bind(this)},
                excel: {label: "EXCEL", name: "excel", action: this.exportToExcel.bind(this)},
                pdf: {label: "PDF", name: "pdf", action: this.exportToPdf.bind(this)},
                png: {label: "PNG", name: "png", action: () => this.exportToImage.bind(this)("png")},
                jpg: {label: "JPG", name: "jpg", action: () => this.exportToImage.bind(this)("jpg")},
            };
            const {csv, excel, pdf, png, jpg} = this.exports;
            this.action = {
                rename: {label: "Rename", icon: "fa-edit", action: this.onEdit.bind(this)},
                duplicate: {label: "Duplicate", icon: "fa-copy", action: this.onCopy.bind(this)},
                full: {label: "Full Screen", icon: "fa-arrows-alt", action: this.onFullScreen.bind(this)},
                export_: {label: "Export", icon: "fa-download", children: [csv, excel, pdf, png, jpg]},
                settings: {label: "Settings", icon: "fa-cogs", action: this.onSettings.bind(this)},
                delete_: {label: "Delete", icon: "fa-trash", action: this.onDelete.bind(this)},
                more: {label: "More", icon: "fa-ellipsis-h", action: this.onMoreAction.bind(this)},
            };
            this.state = {...this.state, active: false};
            this.actionView = actionView || ["settings", "more", "full"];
            this.moreView = moreView || [["rename", "duplicate", "full", "export_", "settings"], ["delete_"]];
        },
        start: function () {
            this._super();
            const {record, card} = this.props;
            const dashboardsCenter = new DashboardsCenter(this, {step: "setup", card: card, viewInfo: record.viewInfo,
                viewType: record.view_type || "graph", record: record});
            this.dashboardsCenter = dashboardsCenter;
        },
        onEdit: function () {
            const {onEdit} = this.props;
            if (onEdit) {
                onEdit();
            }
        },
        onCopy: function () {
            this.dashboardsCenter.onCopy();
        },
        onFullScreen: function () {
            const {elStackItem, card} = this.props;
            elStackItem.addClass("noTransition").toggleClass("full");
            if (card.ref.view.bindStyle) {
                card.ref.view.bindStyle();
            }
            elStackItem.removeClass("noTransition");
        },
        exportToExcel: function () {
            var {record} = this.props, view = this.parent.getViewContent(), dataSets = view.data.datasets,
                data = {data: {labels: ["Measure", ...view.data.labels.map((labels) => labels[0])],
                        rows: dataSets.map((dataSet) => [dataSet.label || "Total", ...dataSet.data])},
                    file_name: `${record.title}.xlsx`};
            data = JSON.stringify(data);
            this.getSession().get_file({
                complete: framework.unblockUI,
                data: {data: data},
                error: (error) => this.call('crash_manager', 'rpc_error', error),
                url: '/web/dashboard/xlsx',
            });
        },
        exportToCSV: function () {
            var {record} = this.props, view = this.parent.getViewContent(), dataSets = view.data.datasets,
                dataCSV = ["Measure", ...view.data.labels].join(";").concat("\n");
            dataSets.map((dataSet) => {
                dataCSV += [dataSet.label, ...dataSet.data].join(";").concat("\n");
            });
            if (!dataCSV) {
                return false;
            }
            dataCSV = encodeURI('data:text/csv;charset=utf-8,' + dataCSV);
            const link = document.createElement('a');
            link.setAttribute('href', dataCSV);
            link.setAttribute('download', `${record.title || 'file'}.csv`);
            document.body.appendChild(link);
            link.click();
            document.body.removeChild(link);
        },
        exportToImage: function (fileType) {
            const {record} = this.props, chartId = this.parent.$el.find("canvas").attr("id"),
                elCanvas = $(`#${chartId}`), url_base64jp = elCanvas[0].toDataURL(`image/${fileType}`);
            const elDownload = document.createElement("a");
            elDownload.setAttribute('href', url_base64jp);
            elDownload.setAttribute('download', `${record.title}.${fileType}`);
            elDownload.click();
        },
        exportToPdf: function () {
            // get size of report page
            const {record} = this.props, chartId = this.parent.$el.find("canvas").attr("id"), elCanvas = $(`#${chartId}`),
                reportPageHeight = elCanvas.innerHeight(), reportPageWidth = elCanvas.innerWidth();
            // create a new canvas object that we will populate with all other canvas objects
            var pdfCanvas = $('<canvas />').attr({
                id: "canvasPdf",
                width: reportPageWidth,
                height: reportPageHeight
            });

            // keep track canvas position
            const canvasOptions = {ctx2D: $(pdfCanvas)[0].getContext('2d'), x: 0, y: 0, buffer: 100};
            // for each chart.js chart
            elCanvas.each(function(index) {
                // get the chart height/width
                const el = $(this), canvasHeight = el.innerHeight(), canvasWidth = el.innerWidth();
                // draw the chart into the new canvas
                const {ctx2D, x, y, buffer} = canvasOptions;
                ctx2D.drawImage($(this)[0], x, y, canvasWidth, canvasHeight);
                canvasOptions.x += canvasWidth + buffer;
                // our report page is in a grid pattern so replicate that in the new canvas
                if (index % 2 === 1) {
                    canvasOptions.x = 0;
                    canvasOptions.y += canvasHeight + buffer;
                }
            });
            var pdf = new jsPDF('p', 'px', 'a4');
            const pageSize = pdf.internal.pageSize, pageWidth = pageSize.width-100,
                pageHeight = ((reportPageHeight-0) * pageWidth) / (reportPageWidth-0);
            pdf.addImage($(pdfCanvas)[0], 'PNG', 50, 50, pageWidth, pageHeight);
            pdf.save(`${record.title}.pdf`);
        },
        // onExport: function () {
        //     this.exportToExcel();
        // },
        onSettings: function () {
            // const {record} = this.props;
            this.dashboardsCenter.appendTo($('body'));
        },
        onDelete: function () {
            this.dashboardsCenter.onUnlink();
        },
        onAction: function (e) {
            const actionName = $(e.currentTarget).attr("name");
            this.action[actionName].action(e);
        },
        onSave: function (data) {
            return this.dashboardsCenter.controlModel.action("write", data);
        },
        bindAction: function () {
            this.$el.find(".acTn").click(this.onAction.bind(this));
        },
        bindStyle: function () {
            const {active} = this.state;
            this.$el.removeClass("active").addClass(active ? "active" : null);
        },
        onMoreAction: function (e) {
            e.stopPropagation();
            const onClick = (action) => {
                this.action[action].action(action);
            }, onClose = () => {
                this.setState({active: false});
                this.bindStyle();
            };
            const menuDialog = new MenuDialog(this, {menus: this.action, views: this.moreView,
                onClick: onClick, onClose});
            menuDialog.appendTo($(e.currentTarget));
            this.setState({active: true});
            this.bindStyle();
        }
    });

    DashboardCard.include({
        setEditMode: function () {
            this.setState({edit: true});
            this.renderTitle();
        },
        onSaveTitle: function () {
            this._super();
            const self = this, {record} = this.props, {title} = this.state;
            this.cardActions.onSave( {args: [record.id, {title: title}]}).then(() => {
                self.reload();
            });
        },
        reload: async function () {
            const self = this, {record} = this.props;
            const result = await this['_rpc']({
                model: "view.dashboard",
                method: "load_dashboard",
                args: [record.id, record.view_id[0]]
            });
            if (result.length) {
                self.props.record = result[0];
            }
            this.renderElement();
        },
        getViewContent: function () {
            return this.ref.view.renderer.chart;
        },
        renderView: function () {
            this._super();
            const {record, editMode, elStackItem} = this.props, {view_type} = record;
            var actionView = [], moreView = [];
            if (editMode) {
                moreView =  [["rename", "duplicate", "full", "settings"], ["delete_"]];
                if (["chart", "graph"].includes(view_type)) {
                    moreView[0].splice(3, 0, "export_");
                }
                actionView = ["settings", "more", "full"];
            }else {
                actionView = ["full"];
                moreView =  [["full", "settings"]];
            }
            const cardActions = new DashboardCardAction(this, {...this.props, moreView: moreView, actionView: actionView,
                onEdit: this.setEditMode.bind(this), card: this, elStackItem: elStackItem});
            cardActions.renderElement();
            this.cardActions = cardActions;
            this.$el.find(".wiHead").append(cardActions.$el);
        }
    });

    DashboardController.include({
        onShowWidget: function (e) {
            e.stopPropagation();
            const el = $(e.currentTarget), chooseWidget = new ChooseDashboardWidget(this, {view_id: this.viewInfo.view_id});
            chooseWidget.renderElement();
            el.after(chooseWidget.$el);
        },
        renderButtons: function ($node) {
            this._super($node);
            this.$buttons.find(".create_dashboard").click(this.onShowWidget.bind(this));
        },
    })

    var ChooseDashboardWidget = base.WidgetBase.extend({
        template: "Dashboard.ChooseWidget",
        init: function (parent, params) {
            this._super(parent, params);
            this.components = {
                chart: {label: "Chart", description: "Create chart views to visually show data in your board", img: "/dashboard_studio/static/src/img/chart_icon.png"},
                title: {label: "Title", description: "Get a quick view to show Title", img: "/dashboard_studio/static/src/img/number_icon.png"},
                battery: {label: "Battery", description: "Your progress in a glance", img: "/dashboard_studio/static/src/img/battery_icon.png"},
                widgets_center: {label: "Widgets Center", description: "All the widgets you need in once place.", img: "/dashboard_studio/static/src/img/widget_center.png"},
            }
        },
        start: function () {
            const dashboardsCenter = new DashboardsCenter(this, {...this.props});
            this.ref.dashboardsCenter = dashboardsCenter;
        },
        onClickComponent: function (e) {
            const self = this, el = $(e.currentTarget), name = el.attr("name");
            this.ref.dashboardsCenter.setState({viewType: name, step: "setup"});
            this.ref.dashboardsCenter.createView().then(() => {
                self.onShowDashboardCenter();
                self.onClose();
            });
        },
        onClose: function () {
            this.$el.remove();
        },
        onShowDashboardCenter: function () {
            this.ref.dashboardsCenter.appendTo($('body'));
            this.onClose();
        },
        bindAction: function () {
            this._super();
            this.$el.find(".sectionItem:not([name='widgets_center'])").click(this.onClickComponent.bind(this));
            this.$el.find(".sectionItem[name='widgets_center']").click(this.onShowDashboardCenter.bind(this));
            this.$el.find(".bgCheck").click(this.onClose.bind(this));
        },
        renderView: function () {
        }
    });

});
