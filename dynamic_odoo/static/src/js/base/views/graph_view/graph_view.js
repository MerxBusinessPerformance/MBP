/** @odoo-module alias=dynamic_odoo.GraphView **/

import {GraphView} from "@web/views/graph/graph_view";
import {GraphModel} from "@web/views/graph/graph_model";
import {registry} from "@web/core/registry";
import utils from 'web.utils';


utils.patch(GraphModel.prototype, 'dynamic_odoo.GraphView.model', {
    setup(params) {
        const modelParams = this.env.modelParams || {};
        delete this.env.modelParams;
        Object.assign(params, modelParams);
        this._super(params);
    }
});

utils.patch(GraphView.prototype, 'dynamic_odoo.GraphView.view', {
    setup() {
        const {arch} = this.props;
        const archJson = utils.xml_to_json((new DOMParser()).parseFromString(arch, "text/xml"), false);
        this.env.modelParams = {stacked: ["1", 1, true, "true", "True"].includes(archJson.attrs.stacked)};
        this._super();
    }
});

