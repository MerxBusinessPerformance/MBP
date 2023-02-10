odoo.define('dashboard_studio.PlanningController', function (require) {
"use strict";

var AbstractController = require('web.AbstractController');
var core = require('web.core');


var _t = core._t;
var QWeb = core.qweb;

var PlanningController = AbstractController.extend({
    contentTemplate: 'Planning',
    events: {
        // 'mousedown .resizer': 'onResize',
        // 'mousedown .i_drag': 'onDrag',
        // 'click .r_item.for_day': 'onCreateItem',
        // 'click .i_add': 'onCreateItem',
        'click .resizable': 'onShowItem',
        // 'mouseover .r_item': 'showIconCreate',
        'click .w_header_group': 'toggleGroup',
        'click .btNfG': 'showGroup'
    },
    init: function (parent, model, renderer, params) {
        this._super.apply(this, arguments);
        this.mouseDown = false;
        this.stopMove = false;
        this.mapping = params.mapping;
        // this.context = params.context;
        this.renderer = renderer;
        this.day = 0;
        this.week = 0;
        this.month = 0;
        this.isClick = true;
        this.attrInfor = {aRs: '.resizable', aBody: '.o_planning_body', aWCon: '.w_container', aWItem: ".w_item", aItem: ".r_item", aDataId: "data-data", aDataDate: "data-date"};
        this.toolTipInfo = [{label: 'Start Date', name: 'start_date'}, {label: 'End Date', name: 'end_date'},
                            {label: 'Allocated Hours', name: 'allocated_hours'}, {label: 'Note', name: 'note'}];
    },
    _startRenderer: function () {
        return this.renderer.appendTo(this.$('.o_planning'));
    },
    _onSearchBarCleared: function () {
        let controller = this._controlPanel;
        controller.model.query.forEach((groupId) => {
            controller.model.deactivateGroup(groupId);
        });
        controller._reportNewQueryAndRender();
    },
    showGroup: function (e) {
        let $el = $(e.currentTarget);
        this.model.willReload = false;
        this._onSearchBarCleared();
        if (!$el.hasClass("_expand")) {
            $el.parent().find("btn-for").not("._expand").removeClass("active");
            $el.addClass("active");
            let groupBy = $el.attr("btn-for").split(",");
            this._reload({groupBy: groupBy})
        }else {
            $el.addClass("active");
            let $i = $el.find('i'), classAdd="fa-compress", classRemove="fa-expand", display="none";
            if ($i.hasClass("fa-compress")) {
                classAdd = "fa-expand";
                classRemove = "fa-compress";
                display = "block";
            }
            $i.addClass(classAdd);
            $i.removeClass(classRemove);
            this._toggleGroup($(document).find(".w_group"), display);
        }
    },
    toggleGroup: function (event) {
        let $el = $(event.currentTarget);
        this._toggleGroup($el.parent('.w_group'));
    },
    _toggleGroup: function ($groups) {
        let dataToggle = {show: "hide", hide: "show"};
        let toggle = ($el, _state) => {
            $el.addClass(_state);
            $el.removeClass(dataToggle[_state]);
        }
        $groups.each((d) => {
            let $item = $($groups[d]);
            toggle($item, $item.hasClass('show') ? "hide" : "show");
        });
    },
    onShowItem: function (event) {
        let self = this;
        if (self.isClick) {
            let $rs = $(event.currentTarget);
            this.model.showDialog(parseInt($rs.attr("data-data")), (params) => self._reload.bind(this)({}),
                (res_id) => self.model.deleteRecord(res_id).then(() => {
                    self._reload();
                }));
        }
    },
    showIconCreate: function (event) {
        let $container = $(event.target).parents(".w_container"), items = $container.find(".r_item");
        $container.find('.i_add').css({display: 'none'});
        $container.find('.circleAdd').css({display: 'none'});
        items.each((index) => {
            let $el = $(items[index]), osLeft = $el.offset().left,
                wItem = $el[0].getBoundingClientRect().width;
            if (event.pageX >= osLeft && event.pageX <= (osLeft + wItem)) {
                $el.find('.i_add').css({display: 'inline-block'});
                $el.find('.circleAdd').css({display: 'inline-block'});
                $(event.target).mouseout((e) => {
                    $el.find('.i_add').css({display: 'none'});
                    $el.find('.circleAdd').css({display: 'none'});
                });
                return false;
            }
        });
        event.stopPropagation();
    },
    dateFormat: function () {
        const {viewType} = this.model;
        let viewInfo = this.renderer.data[viewType];
        return viewInfo.dFormat;
    },
    onCreateItem: function (event) {
        // let self = this;
        // const {aItem, aDataDate} = this.attrInfor;
        // let $target = $(event.target), $item = $target.parents(aItem),
        //     $wContainer = $(event.target).parents('.w_container');
        // let dateFormat = this.dateFormat(), data = this._getLineData($wContainer),
        //     currentDate = $item.attr(aDataDate);
        // data.start_date = this.convertTimeZone(currentDate, false).format(dateFormat);
        // data.end_date = this.convertTimeZone(currentDate, false).clone().add(1, 'hours').format(dateFormat);
        // this.model.createPlanning(data).then((d) => {
        //     self._reload();
        // });
        // event.stopPropagation();
    },
    getWidth: function ($el) {
        return $el[0].getBoundingClientRect().width;
    },
    _setPosition: function ($el, left=0, hour=0, time=0) {
        $el.css({left: left + "px"});
        $el.attr({hours: hour, time: time});
        self.stopMove = true;
    },
    _getLineData: function ($el) {
        let data = $el.getAttributes();
        delete data.class;
        delete data.undefined;
        Object['keys'](data).map((d, i) => {
            if (data[d] === "0") {
                data[d] = false;
            }else {
                data[d] = parseInt(data[d]);
            }
        });
        return data;
    },
    getLineData: function (top) {
        let $w_container = $(document).find('.w_container');
        let result = {};
        for (let i = 0; i < $w_container.length; i++) {
             let $con = $($w_container[i])
             let osTop = $con.offset().top;
             if ((top >= (osTop - 15) && ((top + 30) <= osTop + $con.height() + 15))) {
                  result = this._getLineData($con);
                  break;
             }
        }
        return result;
    },
    _getBCR: function ($el, name="width") {
        return $el[0].getBoundingClientRect()[name];
    },
    _onDragMoveUp: function ($el, cursorX, e, OsTop) {
        const {aWCon, aBody} = this.attrInfor;
        let $body = $el.parents(aBody);
        let osBodyTop = $body.offset().top, hBody = this._getBCR($body, "height"),
            osBodyBottom = hBody + osBodyTop, osElTop = $el.offset().top, osElBottom = osElTop+30;
        let wLeft = this._getBCR($el.parents(aWCon).find('.r_l'));

        this.isClick = false;
        $el.css({zIndex: 1000});
        if ($el.offset().left >= wLeft) {
            this._setPosition($el, e.pageX - cursorX);
        }
        if (osElTop >= osBodyTop && osElBottom <= osBodyBottom && (e.pageY - OsTop + 30) <= osBodyBottom
            && (e.pageY - OsTop) >= osBodyTop) {
            $el.offset({top: e.pageY - OsTop});
        }else {
            $el.offset({top: osElBottom < (osBodyBottom - 10) ? osBodyTop : osBodyBottom-30});
        }
    },
    _getPosition: function ($target, e, cursorX, wRs) {
        const {aWCon, aRs, aWItem, aItem} = this.attrInfor;
        let $con = $target.parents(aWCon), $resizable = $target.parents(aRs),
            pLeft = (e.pageX - cursorX) - (this.getWidth($resizable) - wRs), absPLeft = Math.abs(pLeft);
        let wHour = this.getWidth($resizable.parent()), wCon = this.getWidth($con),
            wLeft = this.getWidth($con.find('.r_l')), wResize = this.getWidth($resizable),
            osLeft = $resizable.offset().left, rsLeft = parseFloat($resizable.css("left").replace("px", ""));;
        let hours = 0, time = Math.floor(wResize / wHour);
        let $item = $resizable.parents(aWItem).find(aItem);
        if (osLeft>=wLeft && (osLeft+wResize) <= wCon) {
            if (wResize % wHour >= wHour/ 1.5) {
                time += 1;
            }
            if (absPLeft % wHour > wHour / 1.5) {
                absPLeft = (Math.floor(absPLeft / wHour) + 1) * wHour * (pLeft / absPLeft);
                hours = Math.floor(0.01+($resizable.offset().left - wLeft) / wHour) + (pLeft >= 0 ? 1 : 0);
            } else if (absPLeft % wHour > (wHour / 2) / 2) {
                absPLeft = ((Math.floor(absPLeft / wHour) * wHour) + wHour / 2) * (pLeft / absPLeft);
                hours = Math.floor(0.01+($resizable.offset().left - wLeft) / wHour) + 0.5;
            } else {
                absPLeft = Math.floor(absPLeft / wHour) * wHour * (pLeft / absPLeft) || 0;
                hours = Math.floor(0.01+($resizable.offset().left - wLeft) / wHour) + (pLeft < 0 ? 1 : 0);
            }
        }else {
            if (osLeft <= wLeft) {
                absPLeft  = (wLeft-osLeft)+rsLeft;
                hours = 0;
            }else if (osLeft + wResize >= wCon) {
                absPLeft =  rsLeft - (osLeft + wResize - wCon);
                hours = $item.length - (Math.floor(wResize/wHour) + (wResize % wHour > wHour/1.5 ? 1: 0));
            }
        }
        return {time: time, left: absPLeft, hours: hours}
    },
    _onDragMoveDown: function ($target, e, cursorX, wRs, OsTop) {
        const {aRs} = this.attrInfor;
        let $resizable = $target.parents(aRs);
        const {left, hours, time} = this._getPosition($target, e, cursorX, wRs);
        $resizable.css({zIndex: 100})
        this._setPosition($resizable, left, hours, time);
        let dataUpdate = this.getData($resizable, hours, time);
        if (!this.isClick) {
            let lineData = this.getLineData(e.pageY - OsTop);
            if (Object['keys'](lineData).length) {
                dataUpdate.values = Object['assign'](dataUpdate.values, lineData);
            }
        }
        this.updateData(dataUpdate);
    },
    onDrag: function (event) {
        event.preventDefault();
        let self = this;
        this.stopMove = true;
        this.mouseDown = true;
        var $target = $(event.target) ,$resizable = $target.parents('.resizable');
        let OsTop = event.pageY - $resizable.offset().top;
        if (!$resizable.hasClass("no-resize")) {
            let wRs = $resizable[0].getBoundingClientRect().width;
            let cursorX = event.pageX - parseFloat($resizable.css("left").replace("px", ""));

            let dragMove = (e) => {
                self._onDragMoveUp($resizable, cursorX, e, OsTop);
                e.stopPropagation();
            };
            window.addEventListener('mousemove', dragMove, true);
            let dropDone = (e) => {
                self._onDragMoveDown($target, e, cursorX, wRs, OsTop)
                window.removeEventListener('mouseup', dropDone, true);
                window.removeEventListener('mousemove', dragMove, true);
                e.stopPropagation();
            }
            window.addEventListener('mouseup', dropDone, true);
        }
        event.stopPropagation();
    },
    onResize: function (event) {
        let self = this;
        event.preventDefault();
        console.log("Resize")
        this.mouseDown = true;
        this.stopMove = true;
        var $target = $(event.target);
        let $resizable = $target.parents('.resizable');
        if (!$resizable.hasClass("no-resize")) {
            let resizeOver = (right = true) => {
                let wHour = $resizable.parent()[0].getBoundingClientRect().width;
                let wResize = $resizable[0].getBoundingClientRect().width;
                let leftRs = parseFloat($resizable.css("left").replace("px", ""));
                let wDu = right ? wResize - wHour + leftRs : Math.abs(leftRs);
                let _htmlResize = (data_for, top) => `<div class="resizable rs_for" data-id="rs_${Math.random()}" data-for="${data_for}" style="top: ${top}"></div>`;
                let getTop = ($e) => parseFloat($e.css("top").replace("px", ""));
                let getLeft = ($e) => parseFloat($e.css("left").replace("px", ""));
                let getWidth = ($el) => $el[0].getBoundingClientRect().width;
                let resizeTop = getTop($resizable);
                let findRSFor = ($el) => $el.find(`.resizable[data-for='${$resizable.attr("data-id")}']`);
                let checkRs = (top, rs, bl = 1) => {
                    let result = top;
                    for (let i = 0; i < rs.length; i++) {
                        let currentRSTop = getTop($(rs[i]));
                        if (top === currentRSTop) {
                            if ($(rs[i]).attr("data-for")) {
                                result = checkRs(top + 30 * bl, rs);
                            }
                            break;
                        }
                    }
                    return result;
                }
                let reOrder = ($el, add = true, ap = null) => {
                    let rs = $el.find(".resizable").not(ap);
                    let first = true;
                    rs.map((d, i) => {
                        let currentRSTop = getTop($(rs[d]));
                        if (add) {
                            if (currentRSTop >= resizeTop) {
                                $(rs[d]).css({top: checkRs(currentRSTop + 30, rs) + "px"});
                            }
                        } else {
                            if (currentRSTop > resizeTop) {
                                $(rs[d]).css({top: first ? resizeTop : (checkRs(currentRSTop, rs) - 30) + "px"});
                                first = false;
                            }
                        }
                    });
                }
                if (!right && leftRs > 0) {
                    let current = $target.parents(".r_item");
                    let nItems = Math.floor(leftRs / wHour);
                    for (let i = 0; i < nItems; i++) {
                        if (i > 0) {
                            current = current.next();
                        }
                        findRSFor(current).remove();
                        reOrder(current, false);
                    }
                    if (leftRs % wHour >= wHour / 1.5) {
                        if (nItems > 0) {
                            current = current.next();
                            let rsFor = findRSFor(current);
                            if (rsFor.length === 0) {
                                reOrder(current);
                                current.append(_htmlResize($resizable.attr("data-id"), $resizable.css("top")));
                            }
                        } else {
                            let rs = current.find(".resizable").not($resizable);
                            if (rs.filter((d, i) => getTop($(rs[d])) === resizeTop).length > 0) {
                                reOrder(current, true, $resizable);
                            }
                        }
                    }
                } else if (wDu > 0) {
                    let itemOver = Math.floor(wDu / wHour);
                    if (wDu % wHour > wHour / 4) {
                        itemOver += 1;
                    }
                    let current = $target.parents(".r_item");
                    let items = $resizable.parents('.w_item').find('.r_item');
                    let indexItem = items.index(current);
                    for (let i = 0; i < itemOver; i++) {
                        current = right ? current.next() : current.prev();
                        let rs = current.find(".resizable");
                        let r = right ? rs.filter((d) => getTop($(rs[d])) === resizeTop && (getLeft($(rs[d])) > wHour / 3 && getLeft($(rs[d])) < wHour / 1.5)).length > 0
                            : rs.filter((d) => {
                            let _osL = getLeft($(rs[d]));
                            let _wRs = getWidth($(rs[d]));
                            _wRs += _osL > 0 ? _osL : 0;
                            return getTop($(rs[d])) === resizeTop && _wRs < wHour / 1.5 && _wRs > wHour / 3;
                        }).length > 0;
                        if (!(i === itemOver - 1 && wDu % wHour < (wHour / 2 + 5) && r)) {
                            if (rs.filter((d) => $(rs[d]).attr("data-for") === $resizable.attr("data-id")).length === 0) {
                                reOrder(current);
                                current.css({minHeight: (rs.length + 1) * 30 + "px"});
                                current.append(_htmlResize($resizable.attr("data-id"), $resizable.css("top")))
                            }
                        }
                    }
                    let fReOrder = (i) => {
                        current = $(items[i]);
                        let rsFor = findRSFor(current);
                        if (rsFor.length > 0) {
                            let rs = $(rsFor[0]).parents('.r_item').find(".resizable");
                            reOrder($(rsFor[0]).parents('.r_item'), false);
                            current.css({minHeight: (rs.length - 1) * 30 + "px"});
                            rsFor.remove();
                        }
                    }
                    let halfOrder = (i, rl = false) => {
                        if (wDu % wHour < (wHour / 2 + 5) && wDu % wHour > wHour / 4) {
                            current = $(items[i]);
                            let rs = current.find('.resizable');
                            let rsFor = findRSFor(current);
                            if (rsFor.length > 0 && rs.filter((d) => {
                                let _wRs = rl ? getLeft($(rs[d])) + getWidth($(rs[d])) : getLeft($(rs[d]));
                                return getTop($(rs[d])) === resizeTop + 30 && _wRs > wHour / 4 && _wRs < wHour / 1.5
                            }).length > 0) {
                                let rs = current.find(".resizable");
                                reOrder(current, false);
                                current.css({minHeight: (rs.length - 1) * 30 + "px"});
                                rsFor.remove();
                            }
                        }
                    }
                    if (right) {
                        for (let i = indexItem + itemOver + 1; i < items.length; i++) {
                            fReOrder(i);
                        }
                        halfOrder(indexItem + itemOver);
                    } else {
                        for (let i = indexItem - itemOver - 1; i >= 0; i--) {
                            fReOrder(i);
                        }
                        halfOrder(indexItem - itemOver, true);
                    }
                }
            }
            let resizeMove = (e) => {
                let wLeft = $target.parents('.w_container').find('.r_l')[0].getBoundingClientRect().width;
                if (e.pageX - wLeft > 0) {
                    if ($target.hasClass("right")) {
                        let wResizeable = e.pageX - $resizable.offset().left;
                        $resizable.css({width: wResizeable + 'px', zIndex: 100});
                        resizeOver();
                    } else {
                        let rWidth = $resizable[0].getBoundingClientRect().width;
                        $resizable.css({width: rWidth + ($resizable.offset().left - e.pageX) + 'px', zIndex: 100});
                        $resizable.offset({left: e.pageX});
                        resizeOver(false);
                    }
                }
                e.stopPropagation();
            }
            window.addEventListener('mousemove', resizeMove, true);
            let resizeDone = (e) => {
                let $rs = $target.parents('.w_item').find('.r_item');
                let wLeft = $target.parents('.w_container').find('.r_l')[0].getBoundingClientRect().width;
                let wHour = $resizable.parent()[0].getBoundingClientRect().width;
                let time = 0;
                let hours = $resizable.attr('hours');
                if ($target.hasClass("right")) {
                    let wResizeable = e.pageX - $resizable.offset().left;
                    let hour = Math.floor(wResizeable / wHour);
                    if (wResizeable % wHour >= wHour / 2) {
                        wResizeable = (hour + 1) * wHour;
                        time = hour + 1;
                    } else if (wResizeable % wHour >= (wHour / 2) / 2) {
                        wResizeable = hour * wHour + wHour / 2;
                        time = hour + 0.5;
                    } else {
                        wResizeable = hour * wHour;
                        time = hour;
                    }
                    hours = $rs.index($resizable.parents('.r_item'));
                    $resizable.css({width: wResizeable + 'px'});
                } else if (e.pageX - wLeft > 0) {
                    let rWidth = $resizable[0].getBoundingClientRect().width;
                    let wP = $resizable.offset().left - e.pageX;
                    let wResizeable = rWidth + wP;
                    let lOffset = e.pageX;
                    lOffset -= wLeft;
                    if (lOffset % wHour < wHour / 2) {
                        lOffset = Math.floor(lOffset / wHour) * wHour;
                        wResizeable += e.pageX - wLeft - lOffset;
                        time = Math.floor(wResizeable / wHour);
                        hours = Math.floor(lOffset / wHour);
                    } else if (lOffset % wHour > wHour / 2) {
                        lOffset = Math.floor(lOffset / wHour) * wHour + wHour / 2;
                        wResizeable += e.pageX - wLeft - lOffset;
                        time = Math.floor(wResizeable / wHour) + 0.5;
                        hours = Math.floor(lOffset / wHour) + 0.5;
                    } else {
                        lOffset = (Math.floor(wResizeable / wHour) + 1) * wHour;
                        wResizeable += e.pageX - wLeft - lOffset;
                        time = Math.floor(wResizeable / wHour) + 1;
                        hours = Math.floor(lOffset / wHour) + 1;
                    }
                    $resizable.css({width: wResizeable + 'px'});
                    $resizable.offset({left: lOffset + wLeft});
                } else {
                    let rWidth = $resizable[0].getBoundingClientRect().width;
                    let wP = $resizable.offset().left - wLeft;
                    let wResizeable = rWidth + wP;
                    $resizable.css({width: wResizeable + 'px'});
                    $resizable.offset({left: wLeft});
                    time = Math.floor(wResizeable / wHour);
                    if (wResizeable % wHour >= wHour / 2) {
                        time = time + 1;
                    } else if (wResizeable % wHour >= (wHour / 2) / 2) {
                        time = time + 0.5;
                    }
                    hours = 0;
                }
                let dataUpdate = self.getData($resizable, hours, time);
                if ($resizable.width() > wHour / 4) {
                    self.updateData(dataUpdate);
                    $resizable.css({zIndex: 100});
                    $resizable.attr({time: time, hours: hours});
                } else {
                    self.model.deleteRecord(dataUpdate.id).then((d) => {
                        self._reload();
                    });
                }
                window.removeEventListener('mouseup', resizeDone, true);
                window.removeEventListener('mousemove', resizeMove, true);
                this.stopMove = false;
                e.stopPropagation();
            }
            window.addEventListener('mouseup', resizeDone, true);
        }
    },
    checkData: function ($el, start, end) {
        let viewType = this.model.viewType;
        let wRs = this.getWidth($el);
        let wHour = this.getWidth($el.parent());
        let startHour = start.hour();
        let diffHours = end.diff(start, viewType === 'day' ? "hours" : "days")
        if (viewType !== 'day' && diffHours === 0 && end.date() !== start.date()) {
            diffHours = 1;
        }
        let iRs = Math.floor(wRs/wHour);
        if (wRs%wHour >= wHour/1.5) {
            iRs += 1
        }
        if (iRs < diffHours) {
            return startHour + Math.floor(diffHours - wRs/wHour);
        }
        return 0
    },
    getData: function ($el, hours, time) {
        let self = this;
        const {viewType, data} = this.model, {date_start, date_end} = this.mapping,
            viewInfo = this.renderer.data[viewType], dateFormat = viewInfo.dFormat;
        const {aWItem, aItem, aDataId, aDataDate} = this.attrInfor;
        let $item = $el.parents(aWItem).find(aItem),
            dataId = parseInt($el.attr(aDataId)), iStart = Math.floor(hours/1),
            iEnd = viewType === 'day' ?  Math.floor((time+hours)/1):  Math.floor((time+hours-1)/1),
            item = data.data.filter((d) => d.id === dataId)[0];
        const start_date = item[date_start], end_date = item[date_end];
        let start = $($item[iStart]).attr(aDataDate), end = $($item[iEnd]).attr(aDataDate),
            hourBl = this.checkData($el, start_date, end_date);
        if (hourBl) {
            start = this.strToDate(start_date);
            start.set('hour', hourBl);
        }

        if (item) {
            if (viewType !== "day") {
                start = moment(start, dateFormat).set('hour', start_date.hour());
                end = moment(end, dateFormat).set('hour', end_date.hour())
            }
            start = moment(start, dateFormat).set('minute', start_date.minute());
            end = moment(end, dateFormat).set('minute', end_date.minute());

            start = self.convertTimeZone(start, false);
            end = self.convertTimeZone(end, false);
        }
        return {id: dataId, values: {[date_start]: start.format(dateFormat), [date_end]: end.format(dateFormat)}};
    },
    strToDate: function (date) {
        return moment(date, this.dateFormat())
    },
    convertTimeZone: function (date, add=true) {
        if (typeof date == 'string') {
            date = this.strToDate(date);
        }
        var offset = this.getSession().getTZOffset(date);
        if (add) {
            return date.clone().add(offset, 'minutes');
        }else {
            return date.clone().subtract(offset, 'minutes');
        }
    },
    updateData: function (data) {
        let self = this;
        self.model.updatePlanning(data.id, data.values).then((d) => {
            self._reload();
            self.isClick = true;
        });
    },
    start: function () {
        return this._super();
    },
    destroy: function () {
        if (this.$buttons) {
            this.$buttons.find('button').off();
        }
        return this._super.apply(this, arguments);
    },
    _update: function () {
        return this._super.apply(this, arguments);
    },
    setState: function (data) {
        Object['keys'](data).map((d, i) => this.model[d] = data[d]);
        this.update({}, {reload: false});
    },
    // _getDomain: function (start_date, end_date) {
    //     const {date_start, date_stop} = this.mapping;
    //     return ['|', '&', [date_start, '<=', start_date], [date_stop, '>=', start_date],
    //             '&', '&', [date_start, '>=', start_date], [date_start, '<=', end_date],
    //                  '|', [date_stop, '<', end_date], [date_stop, '>', end_date]];
    // },
    getDomain: function (viewType=this.model.viewType) {
        let data = this.prepareData(viewType);
        data.start_date = this.convertTimeZone(data.start_date, false);
        data.end_date = this.convertTimeZone(data.end_date, false);
        let start_date = this.dateToStr(data.start_date),
            end_date = this.dateToStr(data.end_date);
        return this.model._getRangeDomain(start_date, end_date);
    },
    dateToStr: function (date) {
        const {viewType} = this.model;
        const renderData = this.renderer.data[viewType];
        return date.format(renderData.dFormat)
    },
    onChangeDay: function () {
        let self = this;
        const {viewType} = this.model;
        let data = this.renderer.getStartEnd(viewType, {day: this.day, week: this.week, month: this.month});
        data.startDate = this.convertTimeZone(data.startDate, false);
        data.endDate = this.convertTimeZone(data.endDate, false);
        let domain = this.model._getRangeDomain(this.dateToStr(data.startDate), this.dateToStr(data.endDate));
        this.model._loadPlanning(domain).then(function () {
            self.setState({viewData: self.day, data: self.model.data, day: self.day, week: self.week, month: self.month});
        });
    },
    prepareData: function (viewType=this.model.viewType) {
        const renderData = this.renderer.data[viewType];
        let data = {start_date: renderData.date.format(renderData.dFormat),
                    end_date: renderData.endDate.format(renderData.dFormat)};
        return data;
    },
    // getPreviousData: function () {
    //     const {viewType} = this.model;
    //     const renderData = this.renderer.data[viewType];
    //     let format = renderData.dFormat;
    //     let _getPreDate = (date) => date.clone().add(-1, viewType).format(format);
    //     let startDate = _getPreDate(renderData.date), endDate = _getPreDate(renderData.endDate);
    //     startDate = this.dateToStr(this.convertTimeZone(startDate, false));
    //     endDate = this.dateToStr(this.convertTimeZone(endDate, false));
    //     let _domain = this.model._getRangeDomain(startDate, endDate);
    //     return this.model.getData(_domain);
    // },
    switchViewType: function (viewType) {
        let self = this;
        this.renderer.setStartEnd(viewType);
        let domain = this.getDomain(viewType);
        this.model._loadPlanning(domain).then((d) => {
            self.setState({viewType: viewType});
        });
    },
    onAddPlanning: function () {
        let self = this;
        this.model.showDialog(false, (params) => self._reload.bind(this)({}));
    },
    _reload: function (params={}) {
        let self = this;
        this.model._loadPlanning(this.getDomain()).then((d) => {
            self.setState(params);
        });
    },
    // onCopyPrevious: function () {
    //     let self = this;
    //     const {viewType} = this.model;
    //     const renderData = this.renderer.data[viewType];
    //     let format = renderData.dFormat,
    //         addD = (date) => moment(date, format).add(1, viewType).format(format);
    //     this.getPreviousData().then((result) => {
    //         let {planningData} = result;
    //         planningData.map((record) => {
    //             record.start_date = addD(record.start_date);
    //             record.end_date = addD(record.end_date);
    //             Object['keys'](record).map((f) => {
    //                 if (Array['isArray'](record[f]) && record[f].length == 2) {
    //                     record[f] = record[f][0];
    //                 }
    //             });
    //             return record;
    //         });
    //         let domain = this.getDomain();
    //         self.model.copyPrevious(planningData).then((d) => {
    //             self.model._loadPlanning(domain).then((d) => {
    //                 self.setState({data: self.model.data});
    //             });
    //         });
    //     });
    // },
    renderButtons: function ($node) {
        if ($node) {
            const {manager} = this.model.data.data;
            this.$buttons = $(QWeb.render('Planning.buttons', {manager: manager}));
            this.$buttons.find(".btn-t.o_planning_week").addClass("active");
            this.$buttons.find(".btn-s.o_planning_employee").addClass("active");
            this.$buttons.click(this._onButtonClick.bind(this));
            this.$buttons.find('button').tooltip();
            this.$buttons.appendTo($node);
        }
    },
    _onButtonClick: function (event) {
        var $target = $(event.target);
        let viewType = this.model.viewType;
        if ($target.hasClass('create_plan')) {
            this.onAddPlanning();
        }
        if ($target.hasClass('btn_day')) {
            if ($target.hasClass('prev')) {
                this[viewType] -= 1;
            }else if ($target.hasClass('today')) {
                this.day = 0;
                this.week = 0;
                this.month = 0;
            }else if ($target.hasClass('next')) {
                this[viewType] += 1;
            }
            this.onChangeDay();
        }
        if ($target.hasClass('btn-t')) {
            this.$buttons.find(".btn-t").removeClass("active");
            $target.addClass("active");
            this.switchViewType($target.attr("view-type"));
        }
        // if ($target.hasClass("copy_previous")) {
        //     this.onCopyPrevious();
        // }
    },
});

return PlanningController;

});
