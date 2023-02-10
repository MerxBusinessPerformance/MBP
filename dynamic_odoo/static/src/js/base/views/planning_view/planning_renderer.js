odoo.define('dynamic_odoo.PlanningRenderer', function (require) {
    "use strict";

    var AbstractRenderer = require('web.AbstractRenderer');
    var core = require('web.core');
    var field_utils = require('web.field_utils');

    var QWeb = core.qweb;


    var RECORD_COLORS = [
        "#F4A460",
        "#b56969",
        "#F06050",
        "#F7CD1F",
        "#6CC1ED",
        "#814968",
        "#EB7E7F",
        "#2C8397",
        "#475577",
        "#D6145F",
        "#30C381",
        "#9365B8",
        "#649173",
        "#bdc3c7",
        "#f8f0f0",
        "#dee2e6",
    ];

    var PlanningRenderer = AbstractRenderer.extend({
        tagName: 'div',
        className: 'o_planning_container',
        events: _.extend({}, AbstractRenderer.prototype.events, {
            'hover td': '_onTdHover',
        }),

        /**
         * @overide
         *
         * @param {Widget} parent
         * @param {Object} state
         * @param {Object} params
         */
        init: function (parent, state, params) {
            this._super.apply(this, arguments);
            this.props = params;
            const {viewData} = this.state;
            this.fieldNames = params.fieldNames;
            this.fields = params.fields;
            this.mapping = params.mapping;
            this.color_map = {};
        },

        //--------------------------------------------------------------------------
        // Public
        //--------------------------------------------------------------------------

        /**
         * @override
         * @param {Object} state
         * @param {Object} params
         */
        updateState: function (state, params) {
            return this._super.apply(this, arguments);
        },

        //--------------------------------------------------------------------------
        // Private
        //--------------------------------------------------------------------------

        /**
         * Used to determine whether or not to display the no content helper.
         *
         * @private
         * @returns {boolean}
         */
        _hasContent: function () {
        },
        /**
         * @override
         * @private
         * @returns {Deferred}
         */
        _render: function () {
            const {groupBy, viewType} = this.state;
            this.data = {
                day: {
                    lFormat: 'HH:mm a',
                    kFormat: "DD_MM_YYYY_H",
                    dFormat: "YYYY-MM-DD HH:mm:ss",
                    hFormat: "DD MMMM YYYY",
                    typeAdd: "hours",
                    date: null,
                    iEnd: 24,
                    endDate: null
                },
                week: {
                    lFormat: "dddd, Do",
                    kFormat: "DD_MM_YYYY",
                    dFormat: "YYYY-MM-DD HH:mm:ss",
                    hFormat: "DD MMMM YYYY",
                    typeAdd: "days",
                    date: null,
                    iEnd: 7,
                    endDate: null
                },
                month: {
                    lFormat: "DD",
                    kFormat: "DD_MM_YYYY",
                    dFormat: "YYYY-MM-DD HH:mm:ss",
                    hFormat: "MMMM YYYY",
                    typeAdd: "days",
                    date: null,
                    iEnd: 0
                }, endDate: null
            };
            this.groupBy = groupBy;
            this.$dataRender = {data: {}, group: {}};

            let $container = $(`<div>`);
            this.renderHeader($container);
            this.renderBody($container);
            this.$el.html($container.contents());
            this.$el.attr("view-type", viewType);
            return this._super.apply(this, arguments);
        },
        stringToDate: function (date) {
            const {viewType} = this.state, viewInfo = this.data[viewType];
            return moment(date, viewInfo.dFormat)
        },
        isValid: function (data, replace = false) {
            const {date_start, date_end} = this.mapping;
            const start_date = this.convertTimeZone(this.stringToDate(data[date_start])),
                end_date = this.convertTimeZone(this.stringToDate(data[date_end]));
            if (replace) {
                data[date_start] = start_date;
                data[date_end] = end_date;
            }
            return end_date > start_date;
        },
        prepareData: function () {
            const self = this, {data} = this.state, groupBy = this.groupBy;
            const openShift = {name: 'Open Shift', color: '#7C7BAD', id: 0},
                dataRender = {'0pen_shift': {obj: openShift, data: []}};
            let __prepareData = (planningRecord, newData, grIdx, idCheck = false, showOpenShift = false) => {
                // let showImg = groupBy[grIdx] === 'employee_id' ? true : false;
                planningRecord.map((d) => {
                    if (this.isValid(d)) {
                        let grName = groupBy[grIdx], parentName = groupBy[grIdx - 1] || false, fieldData = d[grName],
                            fId = fieldData[0] || 0,
                            fName = fieldData[1] || `Undefined ${self.fields[grName]['string']}`;
                        if (fieldData || !showOpenShift) {
                            let force = true;
                            if (parentName) {
                                let parentData = d[parentName], prId = parentData[0] || 0;
                                if (prId !== idCheck) {
                                    force = false;
                                }
                            }
                            if (force) {
                                if (!newData.hasOwnProperty(fId)) {
                                    newData[fId] = {
                                        obj: {
                                            id: fId,
                                            name: fName,
                                            // color: d.colour,
                                            // image_small: null
                                            // image_small: showImg ? employee_image[fId] : null
                                        }, data: [d], name: grName,
                                    }
                                } else {
                                    newData[fId].data.push(d);
                                }
                            }
                        } else if (showOpenShift) {
                            newData['0pen_shift'].data.push(d);
                        }
                    }
                });

            }
            __prepareData(data, dataRender, 0, false, true);
            let _prepareData = (data, idx) => {
                Object['keys'](data).map((d) => {
                    let dataParent = data[d], planningRecord = dataParent.data || [], newData = {};
                    __prepareData(planningRecord, newData, idx, dataParent.obj.id);
                    if (groupBy[idx + 1]) {
                        _prepareData(newData, idx + 1)
                    }
                    dataParent.sub = true;
                    dataParent.name = groupBy[idx - 1];
                    dataParent.data = newData;
                });
            }
            if (groupBy.length > 1) {
                _prepareData(dataRender, 1);
            }
            return dataRender;
        },
        prepareColumns: function (values, keyIdx = "") {
            const {viewType} = this.state, data = this.data[viewType],
                $dataObject = {
                    $el: $(QWeb.render('Planning.Body.Row', {})),
                    date: {},
                    obj: values.obj,
                    name: values.name
                },
                current = moment().format(data.kFormat), date = moment(data.date);
            for (let i = 0; i < data.iEnd; i++) {
                const dateKey = date.format(data.kFormat),
                    cellProps = {current: current === dateKey, date: date.format(data.dFormat)},
                    cell = $(QWeb.render('Planning.Body.Cell', cellProps));
                $dataObject.date[dateKey] = cell;
                $dataObject.$el.append(cell);
                date.add(1, data.typeAdd);
            }
            this.$dataRender.data[`${keyIdx}${values.obj.id}`] = $dataObject;
        },
        getStartEnd: function (view_type, view_data) {
            const {day, week, month} = view_data || this.state,
                data = {startDate: moment(), endDate: null};
            data.startDate.add(day, "days");
            data.startDate.add(week, "weeks");
            data.startDate.add(month, "months");
            data.startDate = data.startDate.startOf(view_type);
            data.endDate = data.startDate.clone().endOf(view_type);
            return data;
        },
        setStartEnd: function (view_type) {
            view_type = view_type || this.state.viewType;
            const data = this.data[view_type], {startDate, endDate} = this.getStartEnd(view_type);
            data.date = startDate, data.endDate = endDate;
            if (view_type === 'month') {
                data.iEnd = data.endDate.date();
            }
        },
        renderHeader: function ($el) {
            const {$wItem, label} = this.renderRowHeader(),
                header = $(QWeb.render("Planning.Header", {label: label}));
            header.find(".bot").append($wItem);
            $el.append(header);
        },
        renderRowHeader: function (show_label = true) {
            const {viewType} = this.state;
            this.setStartEnd();
            let $wItem = $(`<div class="w_item"></div>`), data = this.data[viewType],
                label = data.date.format(data.hFormat);
            if (viewType === 'week') {
                label = `${label} - ${data.endDate.format(data.hFormat)}`;
            }
            let date = data.date.clone();
            for (let i = 0; i < data.iEnd; i++) {
                $wItem.append($(`<div class="h_item">${show_label ? `<label>${date.format(data.lFormat)}</label>` : ""}</div>`));
                date.add(1, data.typeAdd);
            }
            return {$wItem: $wItem, label: label}
        },
        renderBody: function ($container) {
            let $dataRender = this.$dataRender.data, dataRender = this.prepareData();
            let $body = $('<div class="o_planning_body">');
            this.renderRows(dataRender, $dataRender, $body);
            this.renderResize();
            $container.append($body);
            this.calGroup($container);
        },
        renderFooter: function () {
        },
        renderGroup: function (padding, name) {
            const elGroup = $(QWeb.render("Planning.Group", {groupName: name})), {$wItem} = this.renderRowHeader(false);
            elGroup.find(".r_l").css({paddingLeft: padding + "px"});
            elGroup.find(".w_header_group").append($wItem);
            return elGroup;
        },
        renderRows: function (dataRender, $dataRender, $body) {
            let self = this;
            let _prepareColumns = (dRender, idx) => {
                Object['keys'](dRender).map((d, i) => {
                    let keyIdx = idx, data = dRender[d];
                    if (data.sub) {
                        keyIdx = `${keyIdx}${data.obj.id}_`;
                        __prepareColumns(data.data, keyIdx);
                    } else {
                        self.prepareColumns(data, keyIdx);
                    }
                });
            }
            let __prepareColumns = (data, keyIdx) => {
                _prepareColumns(data, keyIdx);
            }
            _prepareColumns(dataRender, "");

            let _renderRow = (dRender, $wrap, idx = "", dGroup = "", paddingLeft = 20) => {
                paddingLeft += 20;
                Object['keys'](dRender).sort().map((d) => {
                    let keyIdx = idx, dataGr = dGroup, _data = dRender[d];
                    const {name, sub, obj, data} = _data;
                    dataGr = `${dataGr}${name}=${obj.id} `;
                    if (sub) {
                        keyIdx = `${keyIdx}${obj.id}_`;
                        const elGroup = this.renderGroup(paddingLeft, obj.name);
                        $wrap.append(elGroup);
                        _renderRow(data, elGroup.find('.w_body_group'), keyIdx, dataGr, paddingLeft);
                    } else {
                        self.renderRow($wrap, $dataRender[`${keyIdx}${obj.id}`], paddingLeft, dataGr);
                    }
                });
            }
            _renderRow(dataRender, $body);
        },
        renderRow: function (el_body, data_row, padding, meta_data) {
            if (data_row) {
                const {id, image_small, name} = data_row.obj, rowProps = {
                        id: id, name: data_row.name,
                        label: name, image_small: image_small, padding: padding
                    },
                    row = $(QWeb.render("Planning.Body.rowGroup", rowProps));
                meta_data.split(" ").map((meta) => {
                    if (meta) {
                        meta = meta.split("=");
                        row['attr'](meta[0], meta[1]);
                    }
                });
                row.append(data_row.$el);
                el_body.append(row);
            }
        },
        renderResize: function () {
            const self = this, {date_start, date_end} = this.mapping;
            const {viewType, data} = this.state, viewInFor = this.data[viewType];
            data.map((record) => {
                if (this.isValid(record, true)) {
                    record = Object['assign']({}, record);
                    // get row render
                    const row_key = self.groupBy.map((d) => record[d] ? record[d][0] : 0).join("_"),
                        row_render = self.$dataRender.data[row_key];
                    let $item = false, dKey = false, resize = true,
                        start = record[date_start].clone(), end = record[date_end].clone(),
                        diff = record[date_end].endOf('day').diff(record[date_start].startOf('day'), "days");
                    if (diff == 0 && start.date() != end.date()) {
                        diff = 1;
                    }
                    if (diff > 0) {
                        if (record[date_start] < viewInFor.date || record[date_end] > viewInFor.endDate) {
                            resize = false;
                        }
                        for (let i = 0; i <= diff; i++) {
                            if (i !== 0) {
                                start = start.set({hour: 0, minute: 0});
                            }
                            dKey = self.stringToDate(start).format(viewInFor.kFormat);
                            $item = row_render ? row_render.date[dKey] : false;
                            if ($item) {
                                break;
                            }
                            start.add(1, "days");
                        }
                        if (end > viewInFor.endDate) {
                            let _end = start.clone();
                            for (let i = 0; i <= diff; i++) {
                                if (_end > viewInFor.endDate) {
                                    _end.subtract(1, "days")
                                    _end.set({hour: 23, minute: 59});
                                    end = _end;
                                    break;
                                }
                                _end.add(1, "days");
                            }
                        }
                    } else {
                        dKey = self.stringToDate(start).format(viewInFor.kFormat);
                        $item = row_render ? row_render.date[dKey] : false;
                    }
                    if ($item) {
                        var diffType = viewType === 'day' ? 'hours' : 'days', iResize = 0;
                        if (diffType == "days") {
                            iResize = self.stringToDate(end.endOf('day')).diff(self.stringToDate(start.startOf('day')), diffType) + 1;
                        } else if (diffType == "hours") {
                            iResize = self.stringToDate(end).diff(self.stringToDate(start), diffType) || 1;
                            if (iResize == 23) {
                                iResize = 24;
                            }
                        }
                        var halfTime = viewType === 'day' ? self.stringToDate(start).minutes() : 0,
                            {top, id} = self._renderResize($item, iResize, halfTime, record, resize);
                        if (iResize > 1) {
                            iResize -= 1;
                            self.renderResizeHolder(row_render, dKey, iResize, top, id);
                        }
                    }
                }
            });
        },
        getWidth: function ($el) {
            return $el[0].getBoundingClientRect().width;
        },
        getColorRandom: function () {
            let letters = '0123456789ABCDEF', color = '#';
            for (var i = 0; i < 6; i++) {
                color += letters[Math.floor(Math.random() * 16)];
            }
            return color;
        },
        isColorLight: function (color) {
            var r, g, b, hsp;
            if (color.match(/^rgb/)) {
                color = color.match(/^rgba?\((\d+),\s*(\d+),\s*(\d+)(?:,\s*(\d+(?:\.\d+)?))?\)$/);
                r = color[1];
                g = color[2];
                b = color[3];
            } else {
                color = +("0x" + color.slice(1).replace(
                    color.length < 5 && /./g, '$&$&'));
                r = color >> 16;
                g = color >> 8 & 255;
                b = color & 255;
            }
            hsp = Math.sqrt(0.299 * (r * r) + 0.587 * (g * g) + 0.114 * (b * b));
            return hsp > 127.5 ? true : false;
        },
        _renderResize: function ($item, iCount = 1, half = 0, data, resize) {
            var self = this, itemWidth = this.getWidth($item), tops = [];
            // get Color
            var colorIndex = data[this.groupBy[0]][0],
                color = RECORD_COLORS[colorIndex - 1] || this.color_map[colorIndex - 1];
            if (!color) {
                color = this.color_map[colorIndex] = this.getColorRandom();
            }
            // get top position for resize
            $item.find(".resizable").map((idx, el) => {
                const $el = $(el), offset = $el.offset(), {left} = offset, itemOffset = $item.offset();
                if (!(left >= (itemOffset.left + (itemWidth || 1)))) {
                    tops.push(self.pxToFloat($el, "top"));
                }
            });
            tops.sort(function (a, b) {
                return a - b
            });
            var top = tops[tops.length - 1];
            top = top >= 0 ? (top + 30) : 0;
            // render El Resize
            const elResize = $(QWeb.render("Planning.Body.Resize", {
                resize: resize,
                light: this.isColorLight(color),
                label: this.getLabel(data)
            })), key = `rs_${Math.random()}`;
            elResize.attr({
                'data-data': data.id,
                'data-id': key,
                style: `background-image: repeating-linear-gradient(-45deg, ${color} 0 10px, ${this.hexToRGB(color, 80)} 10px 20px); left: ${half > 0 ? 50 : 0}%; width: calc(${100 * iCount + (half > 0 ? 50 : 0)}% + ${iCount * 1}px); top: ${top}px`
            });
            $item.append(elResize);
            $item.css({minHeight: top + 30 + 'px'});
            return {id: key, top: top};
        },
        renderResizeHolder: function (row_render, key, iCount, top, resize_key) {
            const objKey = Object['keys'](row_render.date), currIndex = objKey.indexOf(key);
            const _htmlResize = (data_for, top) => QWeb.render("Planning.Body.ResizeFor", {
                rs_id: `rs_${Math.random()}`,
                data_for: data_for,
                top: `top: ${top}px`
            });
            for (let i = 1; i <= iCount; i++) {
                let _k = objKey[currIndex + i];
                if (_k) {
                    row_render.date[_k].append(_htmlResize(resize_key, top));
                }
            }
        },
        checkResizeFor: function (top, rs, bl = 1) {
            let self = this, result = top;
            for (let i = 0; i < rs.length; i++) {
                let currentRSTop = self.pxToFloat($(rs[i]), "top");
                if (top === currentRSTop) {
                    if ($(rs[i]).attr("data-for")) {
                        result = this.checkResizeFor(top + 30 * bl, rs);
                    }
                    break;
                }
            }
            return result;
        },
        resortResizable: function ($rs, top) {
            let self = this, ov = $rs.filter((d) => self.pxToFloat($($rs[d]), "top") === top);
            if (ov.length > 0) {
                $rs.map((d) => {
                    let currentRSTop = self.pxToFloat($($rs[d]), "top");
                    if (currentRSTop >= top) {
                        $($rs[d]).css({top: self.checkResizeFor(currentRSTop + 30, $rs) + "px"});
                    }
                });
            }
        },
        pxToFloat: function ($el, name) {
            console.log(name);
            return parseFloat($el.css(name).replace("px", ""));
        },
        hexToRGB: function (hex, opacity) {
            hex = hex.replace('#', '');
            let r = parseInt(hex.substring(0, 2), 16);
            let g = parseInt(hex.substring(2, 4), 16);
            let b = parseInt(hex.substring(4, 6), 16);
            let result = 'rgba(' + r + ',' + g + ',' + b + ',' + opacity / 100 + ')';
            return result;
        },
        calGroup: function ($container) {
            let $wGroup = $container.find(".w_group");
            $wGroup.map((d, i) => {
                let $el = $($wGroup[d]);
                let $bodyGroup = $el.find('.w_body_group');
                let $headerGroup = $el.find('.w_header_group');
                let $wContainer = $bodyGroup.find('.w_container');
                let gNumber = {}
                $wContainer.map((d, i) => {
                    let items = $($wContainer[d]).find('.r_item');
                    items.map((_d, i) => {
                        if (!gNumber.hasOwnProperty(_d)) {
                            gNumber[_d] = 0;
                        }
                        gNumber[_d] += $(items[_d]).find('.resizable').length;
                    })
                });
                let match = false, sIndex = null, eIndex = null, gNew = {};
                Object.keys(gNumber).map((d, i) => {
                    d = parseInt(d);
                    if (gNumber[d] > 0) {
                        if (gNumber[d] === gNumber[d + 1]) {
                            if (!match) {
                                sIndex = d;
                                gNew[d] = {index: d, label: gNumber[d], count: 1};
                            }
                            gNew[sIndex].count += 1;
                            match = true;
                            eIndex = d + 1;
                        } else if (d != eIndex) {
                            gNew[d] = {index: d, label: gNumber[d], count: 1}
                            match = false;
                        } else {
                            match = false;
                        }
                    }
                });
                let hItems = $headerGroup.find('.h_item');
                Object.keys(gNew).map((d, i) => {
                    const gItem = gNew[d], $item = $(hItems[gItem.index]);
                    // let wItem = $item[0].getBoundingClientRect().width;
                    $item.append(`<div class="wh_label" style="width: calc(${100 * gItem.count}% - 2px)"><div class="h_line"><span class="span_l"></span><span class="span_r"></span></div><div class="w_label"><label>${gItem.label}</label></div></div>`)
                });
            });
        },
        getLabel: function (data) {
            var self = this, {label} = this.props, field = this.fields[label], result = data[label];
            if (result) {
                switch (field.type) {
                    case "many2one":
                        result = result[1];
                        break;
                    case "selection":
                        const options = field.selection.filter((op) => op[0] == result);
                        if (options.length) {
                            result = options[0][1];
                        }
                        break;
                    case "datetime":
                    case "date":
                        if (typeof result == "string") {
                            result = self.convertTimeZone(self.stringToDate(result));
                        }
                        result = result.format("lll");
                        break;
                }
            }
            return result;
        },
        convertTimeZone: function (date, add = true) {
            var offset = this.getSession().getTZOffset(date);
            if (add) {
                return date.clone().add(offset, 'minutes');
            } else {
                return date.clone().subtract(offset, 'minutes');
            }
        },
    });

    return PlanningRenderer;
});
