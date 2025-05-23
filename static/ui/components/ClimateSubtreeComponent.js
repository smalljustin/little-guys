import { getBaseUISize } from "../../canvas.js";
import { getActiveClimate } from "../../climate/climateManager.js";
import { Container } from "../Container.js";
import { Toggle } from "../elements/Toggle.js";
import { UI_TOPBAR_WEATHER, UI_CLIMATE_SELECT_CLOUDS, UI_CLIMATE_SELECT_MENU, UI_SM_CLIMATE } from "../UIData.js";
import { SubTreeComponent } from "./SubTreeComponent.js";


export class ClimateSubtreeComponent extends SubTreeComponent {
    constructor(posXFunc, posYFunc, padding, dir, key) {
        super(posXFunc, posYFunc, padding, dir, key);
        let subMenuContainer = new Container(this.window, 0, 1);
        this.window.container = subMenuContainer;

        let textAlignOffsetX = getBaseUISize() * 1.91;

        subMenuContainer.addElement(new Toggle(this.window, getBaseUISize() * 25 + textAlignOffsetX, getBaseUISize() * 3, textAlignOffsetX, UI_CLIMATE_SELECT_MENU, "cilmate selection",() => getActiveClimate().getUIColorInactiveCustom(0.55), () => getActiveClimate().getUIColorInactiveCustom(0.55 * 0.8)));
        subMenuContainer.addElement(new Toggle(this.window, getBaseUISize() * 25 + textAlignOffsetX, getBaseUISize() * 3, textAlignOffsetX, UI_TOPBAR_WEATHER, "weather control",() => getActiveClimate().getUIColorInactiveCustom(0.65), () => getActiveClimate().getUIColorInactiveCustom(0.65 * 0.7)));
        subMenuContainer.addElement(new Toggle(this.window, getBaseUISize() * 25 + textAlignOffsetX, getBaseUISize() * 3, textAlignOffsetX, UI_CLIMATE_SELECT_CLOUDS, "cloud control",() => getActiveClimate().getUIColorInactiveCustom(0.55), () => getActiveClimate().getUIColorInactiveCustom(0.55 * 0.8)));

    }

}