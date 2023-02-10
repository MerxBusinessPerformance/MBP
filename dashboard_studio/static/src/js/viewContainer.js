/** @odoo-module alias=dashboard_studio.ViewContainer**/

import {View} from "@web/views/view";
import Widget from "web.Widget";
const {Component, tags} = owl;
import { ViewAdapter } from "@web/legacy/action_adapters";

class ViewContainer extends Component {
    setup() {
        const {info, isLegacy} = this.props;
        this.info = info || {};
        this.isLegacy = isLegacy;
        if (this.isLegacy) {
            this.Widget = Widget;
        }
        this.env.bus.on("VIEW_STUDIO:UPDATE", this, (info) => {
            this.info = info;
            this.render();
        });
    }

    destroy() {
        this.env.bus.off("VIEW_STUDIO:UPDATE", this);
        super.destroy();
    }
}

ViewContainer.components = {ViewAdapter};
ViewContainer.template = tags.xml`
    <t t-name="web.ActionContainer">
      <div class="o_view_studio">
        <ViewAdapter t-if="isLegacy and info.View" Component="Widget" View="info.View" t-ref="component" viewInfo="info.viewInfo" viewParams="info.viewParams" widget="widget" />
        <t t-if="!isLegacy and info.Component" t-component="info.Component" t-props="info.componentProps" t-ref="component" />
      </div>
    </t>`;

export default {ViewContainer}
