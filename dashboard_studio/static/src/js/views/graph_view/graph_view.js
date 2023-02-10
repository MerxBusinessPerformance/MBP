/** @odoo-module alias=dashboard_studio.GraphView **/

import {useService} from "@web/core/utils/hooks";
import {GraphView} from "@web/views/graph/graph_view";
import {useSetupView} from "@web/views/helpers/view_hook";
import { useModel } from "@web/views/helpers/model";
import { registry } from "@web/core/registry";
import {GraphArchParser} from "@web/views/graph/graph_arch_parser";
import DashboardGraphRenderer from "dashboard_studio.GraphRenderer";
import { archParseBoolean } from "@web/views/helpers/utils";

const viewRegistry = registry.category("views");


class DashboardGraphArchParser extends GraphArchParser {
    parse(arch, fields = {}) {
        const archInfo = super.parse(...arguments);
        this.visitXML(arch, (node) => {
            switch (node.tagName) {
                case "graph": {
                    if (node.hasAttribute("area")) {
                        archInfo.area = archParseBoolean(node.getAttribute("area"));
                    }
                    if (node.hasAttribute("smooth")) {
                        archInfo.smooth = archParseBoolean(node.getAttribute("smooth"));
                    }
                    const mode = node.getAttribute("type");
                    if (mode && ['polar_area', 'doughnut', 'column'].includes(mode)) {
                        archInfo.mode = mode;
                    }
                }
            }
        });
        return archInfo;
    }
}


export default class DashboardGraphView extends GraphView {
    setup() {
        this.actionService = useService("action");

        let modelParams;
        if (this.props.state) {
            modelParams = this.props.state.metaData;
        } else {
            const {arch, fields} = this.props;
            const parser = new this.constructor.ArchParser();
            const archInfo = parser.parse(arch, fields);
            modelParams = {
                additionalMeasures: this.props.additionalMeasures,
                disableLinking: Boolean(archInfo.disableLinking),
                displayScaleLabels: this.props.displayScaleLabels,
                fieldAttrs: archInfo.fieldAttrs,
                fields: this.props.fields,
                groupBy: archInfo.groupBy,
                measure: archInfo.measure || "__count",
                mode: archInfo.mode || "bar",
                order: archInfo.order || null,
                resModel: this.props.resModel,
                title: archInfo.title || this.env._t("Untitled"),

                stacked: "stacked" in archInfo ? archInfo.stacked : false,
                area: Boolean(archInfo.area),
                smooth: Boolean(archInfo.smooth),
            };
        }

        this.model = useModel(this.constructor.Model, modelParams);

        useSetupView({
            getLocalState: () => {
                return {metaData: this.model.metaData};
            },
            getContext: () => this.getContext(),
        });
    }
}

DashboardGraphView.components.Renderer = DashboardGraphRenderer;
DashboardGraphView.ArchParser = DashboardGraphArchParser;

viewRegistry.add("dashboard_graph", DashboardGraphView);
