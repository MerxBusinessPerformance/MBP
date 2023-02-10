/** @odoo-module alias=dynamic_odoo.ViewContainer**/

const {ViewAdapter} = require("@web/legacy/action_adapters");
const {Component, tags} = owl;

export default class ViewContainer extends Component {
    setup() {
        const {info, isLegacy} = this.props;
        this.info = info || {};
        this.isLegacy = isLegacy;
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
ViewContainer.props = {
    info: Object,
    isLegacy: Boolean
};
ViewContainer.template = tags.xml`
   <t t-name="web.ActionContainer">
      <div class="o_view_studio">
        <ViewAdapter t-if="isLegacy" Component="info.Component" View="info.View" t-ref="component" viewInfo="info.viewInfo" viewParams="info.componentProps" />
        <t t-if="!isLegacy" t-component="info.Component" t-props="info.componentProps" t-ref="component" />
      </div>
   </t>`;
