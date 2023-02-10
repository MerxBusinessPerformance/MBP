/** @odoo-module alias=ye_dynamic_odoo.Start**/

import {makeEnv, startServices} from "@web/env";
import StudioEditor from "./studioEditor";
import {session} from "@web/session";

const {mount, utils} = owl;

export default async function startStudio(env) {
    env = odoo.__WOWL_DEBUG__.root.env;
    const root = await mount(StudioEditor, {
        env,
        target: document.getElementsByClassName("o_action_manager")[0],
        position: "first-child"
    });
    root.render();
}

