/** @odoo-module **/

const { registry } = require("@web/core/registry");
const viewService = registry.category("services").get("view");
const data_manager = require("web.data_manager");

const superStart = viewService.start.bind(viewService);
const superLoadViews = data_manager.load_views.bind(data_manager);
viewService.start = (env, { orm }) => {
    const viewS = superStart(env, {orm}), superLoadViews = viewS.loadViews;
    viewS.loadViews = async (params, options) => {
        if (!params.context) {
            params.context = {};
        }
        if (!(params.context.action || params.context.action_id) && options.actionId) {
            params.context.action = options.actionId;
        }
        if ((odoo['studio'] || {}).instance) {
            params.context.STUDIO = true;
        }
        return superLoadViews(params, options)
    }
    return viewS;
}

data_manager.load_views = async function ({ model, context, views_descr } , options = {}) {
    const state = $.bbq.getState(true);
    context.action = state.action;
    return superLoadViews({ model, context, views_descr } , options);
}
