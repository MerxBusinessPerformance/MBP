/** @odoo-module alias=dashboard_studio.GraphRenderer **/

import {GraphRenderer} from "@web/views/graph/graph_renderer";
import {BORDER_WHITE, DEFAULT_BG, getColor, hexToRGBA} from "@web/views/graph/colors";


export default class DashboardGraphRenderer extends GraphRenderer {
    formatValue(value, allIntegers = true) {
        if (value) {
            return super.formatValue(value, allIntegers);
        }
    }
    getChartConfig() {
        let data = null, metaData = this.model.metaData, {mode} = metaData,
            replaceType = {column: "horizontalBar", polar_area: "polarArea"};
        if (["doughnut", "polar_area", "column"].includes(mode)) {
            data = this.getPieChartData();
            const options = this.prepareOptions();
            mode = replaceType[mode] || mode;
            return {data, options, type: mode};
        } else {
            return super.getChartConfig();
        }
    }

    getScaleOptions() {
        const {mode} = this.model.metaData;
        if (["doughnut", "polar_area"].includes(mode)) {
            return {};
        }
        if (mode === "column") {
            return {
                xAxes: [{
                    ticks: {
                        min: 0
                    }
                }],
                yAxes: [{
                    stacked: true
                }]
            }
        }
        return super.getScaleOptions();
    }

    getLineChartData() {
        const data = super.getLineChartData();
        const {area, smooth} = this.model.metaData;
        for (let index = 0; index < data.datasets.length; ++index) {
            const dataSet = data.datasets[index];
            if (area) {
                const color = getColor(index);
                dataSet.backgroundColor = hexToRGBA(getColor(0), 0.2);
                dataSet.fill = 'origin';
                dataSet.borderColor = color;
            } else {
                delete dataSet.backgroundColor;
                delete dataSet.fill;
            }
            if (smooth) {
                dataSet.lineTension = 0.4;
            }
        }
        return data;
    }
}
