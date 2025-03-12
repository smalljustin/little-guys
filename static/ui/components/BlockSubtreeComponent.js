import { getBaseUISize } from "../../canvas.js";
import { getActiveClimate } from "../../climate/climateManager.js";
import { Component } from "../Component.js";
import { Container } from "../Container.js";
import { Toggle } from "../elements/Toggle.js";
import { UI_SM_BB, UI_SM_CLIMATE, UI_SM_GODMODE, UI_SM_LIGHTING, UI_SM_ORGANISM, UI_SM_SPECIAL } from "../UIData.js";
import { SubTreeComponent } from "./SubTreeComponent.js";


export class BlockSubtreeComponent extends SubTreeComponent {
    constructor(posXFunc, posYFunc, padding, dir, key) {
        super(posXFunc, posYFunc, padding, dir, key);
        let subMenuContainer = new Container(this.window, 0, 1);
        this.window.container = subMenuContainer;

        let textAlignOffsetX = getBaseUISize() * 1.91;

        subMenuContainer.addElement(new Toggle(this.window, getBaseUISize() * 13 + textAlignOffsetX, getBaseUISize() * 3, textAlignOffsetX, UI_SM_BB, "ground",() => getActiveClimate().getUIColorInactiveCustom(0.55), () => getActiveClimate().getUIColorActive()));
        subMenuContainer.addElement(new Toggle(this.window, getBaseUISize() * 13 + textAlignOffsetX, getBaseUISize() * 3, textAlignOffsetX, UI_SM_SPECIAL, "special",() => getActiveClimate().getUIColorInactiveCustom(0.66), () => getActiveClimate().getUIColorActive()));
        subMenuContainer.addElement(new Toggle(this.window, getBaseUISize() * 13 + textAlignOffsetX, getBaseUISize() * 3, textAlignOffsetX, UI_SM_ORGANISM, "plants",() => getActiveClimate().getUIColorInactiveCustom(0.59), () => getActiveClimate().getUIColorActive()));
        subMenuContainer.addElement(new Toggle(this.window, getBaseUISize() * 13 + textAlignOffsetX, getBaseUISize() * 3, textAlignOffsetX, UI_SM_GODMODE, "god mode",() => getActiveClimate().getUIColorInactiveCustom(0.54), () => getActiveClimate().getUIColorActive()));

        
    }

}