import { BlockBuildingComponent } from "./components/BlockBuildingComponent.js";
import { LightingComponent } from "./components/LightingComponent.js";
import { SpecialBlockComponent } from "./components/SpecialBlockComponent.js";
import { SubMenuComponent } from "./components/SubMenuComponent.js";
import { ViewModeComponent } from "./components/ViewModeComponent.js";
import { UI_SM_BB, UI_SM_LIGHTING, UI_SM_SM, UI_SM_SPECIAL, UI_SM_VIEWMODE } from "./UIData.js";

var all_components = [];

all_components.push(new BlockBuildingComponent(100, 20, 10, 0, UI_SM_BB));
all_components.push(new LightingComponent(300, 20, 10, 0, UI_SM_LIGHTING));
all_components.push(new SpecialBlockComponent(200, 20, 10, 0, UI_SM_SPECIAL));
all_components.push(new ViewModeComponent(300, 20, 10, 0, UI_SM_VIEWMODE));
all_components.push(new SubMenuComponent(30, 30, 10, 0, UI_SM_SM));

export function renderWindows() {
    all_components.forEach((window) => window.render());
}
export function updateWindows() {
    all_components.forEach((window) => window.update());
}

export function resetWindowHovered() {
    all_components.forEach((component) => {
        component.window.hovered = false;
        component.window.locked = false;
    
    });
}
export function isWindowHovered() {
    return all_components.some((component) => component.window.hovered);
}