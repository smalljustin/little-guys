import { getBaseUISize, getCanvasHeight, getCanvasWidth } from "../canvas.js";
import { OrganismComponent } from "./components/OrganismComponent.js";
import { BlockPalette } from "./components/BlockPalette.js";
import { BlockSubtreeComponent as BlockSubtree } from "./components/BlockSubtreeComponent.js";
import { TopBarComponent } from "./topbar/TopBarComponent.js";
import { ViewSubtreeComponent } from "./components/ViewSubtreeComponent.js";
import { loadGD, UI_SM_GODMODE, UI_SM_LIGHTING, UI_SM_ORGANISM, UI_TOPBAR_BLOCK, UI_PALETTE_ACTIVE, UI_TOPBAR_MAINMENU, UI_TOPBAR_VIEWMODE, saveGD, UI_PALETTE_MIXER, addUIFunctionMap, UI_TOPBAR_LIGHTING, UI_TOPBAR_TIME, UI_PALETTE_ROCKMODE, UI_PALETTE_EYEDROPPER, UI_TOPBAR_WEATHER, UI_MAIN_NEWWORLD, saveUI, UI_UI_SIZE, UI_PALETTE_SOILIDX, UI_PALETTE_ROCKIDX } from "./UIData.js";
import { getSquares } from "../squares/_sqOperations.js";
import { GodModeComponent } from "./components/GodModeComponent.js";
import { getCurMixIdx, getMixArr, getMixArrLen, getTargetMixIdx, setCurMixIdx, setTargetMixIdx } from "../globals.js";
import { MainMenuComponent } from "./components/MainMenuComponent.js";
import { LightingSubtree } from "./components/LightingSubtree.js";
import { LightingComponent } from "./components/LightingComponent.js";
import { WeatherSelectionComponent } from "./components/WeatherSelectionComponent.js";
import { TimeSkipComponent } from "./components/TimeSkipComponent.js";
import { WorldSetupComponent } from "./components/WorldSetupComponent.js";

let topBarComponent;
let mainMenuComponent;
let blockPalette;
let all_components;

all_components = [];
topBarComponent = new TopBarComponent("UI_TOPBAR");

export function initUI() {
    
    if (getBaseUISize() * 70 > getCanvasHeight() && getCanvasHeight() > 500) {
        saveUI(UI_UI_SIZE, 8);
    }

    all_components = [];
    topBarComponent = new TopBarComponent("UI_TOPBAR");
    mainMenuComponent = new MainMenuComponent(() => 0, () => topBarComponent.ySize(), 0, 0, UI_TOPBAR_MAINMENU);
    all_components.push(mainMenuComponent);
    all_components.push(new BlockSubtree(() => topBarComponent.getElementXPositionFunc(0, 1), () => topBarComponent.ySize(), 0, 0, UI_TOPBAR_BLOCK));
    // all_components.push(new CloudControlComponent(() => topBarComponent.getElementXPositionFunc(0, 3) + climateSubtreeComponent.window.sizeX + getBaseUISize() * 0.5, () => topBarComponent.ySize(), 0, 0, UI_CLIMATE_SELECT_CLOUDS));
    all_components.push(new ViewSubtreeComponent(() => topBarComponent.getElementXPositionFunc(0, 3), () => topBarComponent.ySize(), 0, 0, UI_TOPBAR_VIEWMODE));
    blockPalette = new BlockPalette(getBaseUISize() * 24, getBaseUISize() * 3, 0, 0, UI_PALETTE_ACTIVE)
    all_components.push(blockPalette);

    all_components.push(new LightingComponent(getBaseUISize() * 10, getBaseUISize() * 10, 0, 0, UI_SM_LIGHTING));
    all_components.push(new LightingSubtree(() => topBarComponent.getElementXPositionFunc(0, 5), () => topBarComponent.ySize(), 0, 0, UI_TOPBAR_LIGHTING));
    all_components.push(new OrganismComponent(getBaseUISize() * 1, getBaseUISize() * 10, 0, 0, UI_SM_ORGANISM));
    all_components.push(new GodModeComponent(getBaseUISize() * 34, getBaseUISize() * 6, 10, 0, UI_SM_GODMODE));
    all_components.push(new TimeSkipComponent(() => topBarComponent.getElementXPositionFunc(0, 18), () => topBarComponent.ySize(), 0, 0, UI_TOPBAR_TIME));
    all_components.push(new WeatherSelectionComponent(() => topBarComponent.getElementXPositionFunc(0,20), () => topBarComponent.ySize(), 0, 0, UI_TOPBAR_WEATHER));
    all_components.push(new WorldSetupComponent(() => getCanvasWidth() / 2, () => getBaseUISize() * 30, 0, 0, UI_MAIN_NEWWORLD));
}

export function getMainMenuComponent() {
    return mainMenuComponent;
}

export function getTopBarComponent() {
    return topBarComponent;
}

export function renderWindows() {
    all_components.forEach((window) => window.render());
    topBarComponent.render();

}
export function updateWindows() {
    topBarComponent.update();
    all_components.forEach((window) => window.update());
}

export function resetWindowHovered() {
    all_components.forEach((component) => {
        component.window.hovered = false;
        component.window.locked = false;
    });
    topBarComponent.hovered = false;
}
export function isWindowHovered() {
    return all_components.some((component) => component.window.hovered) || topBarComponent.hovered;
}

export function eyedropperBlockHover(posX, posY) {
    let targetProto = loadGD(UI_PALETTE_ROCKMODE) ? "RockSquare" : "SoilSquare";
    getSquares(Math.floor(posX), Math.floor(posY)).filter((sq) => sq.proto == targetProto).forEach((sq) => {
        blockPalette.setHover(sq.sand, sq.silt, sq.clay);
    });
}

export function eyedropperBlockClick(posX, posY) {
    let targetProto = loadGD(UI_PALETTE_ROCKMODE) ? "RockSquare" : "SoilSquare";
    let targetIdx = loadGD(UI_PALETTE_ROCKMODE) ? UI_PALETTE_ROCKIDX : UI_PALETTE_SOILIDX;

    getSquares(posX, posY).filter((sq) => sq.proto == targetProto).forEach((sq) => {
        blockPalette.setClick(sq.sand, sq.silt, sq.clay);
        saveGD(targetIdx, sq.colorVariant);
    });

    saveGD(UI_PALETTE_EYEDROPPER, false);


    setTargetMixIdx(getCurMixIdx() + 4);
}

export function mixerBlockClick(posX, posY) {
    let targetProto = loadGD(UI_PALETTE_ROCKMODE) ? "RockSquare" : "SoilSquare";
    let targetIdx = loadGD(UI_PALETTE_ROCKMODE) ? UI_PALETTE_ROCKIDX : UI_PALETTE_SOILIDX;

    let sq = getSquares(Math.floor(posX), Math.floor(posY)).filter((sq) => sq.proto == targetProto).at(0);
    if (sq == null) {
        return;
    }
    saveGD(targetIdx, sq.colorVariant);
    let sqComp = [sq.sand, sq.silt, sq.clay];
    if (!getMixArr().some((arr) => arr[0] == sqComp[0] && arr[1] == sqComp[1] && arr[2] == sqComp[2])) {
        getMixArr()[getCurMixIdx() % getMixArrLen()] = sqComp; 
        sq.mixIdx = getCurMixIdx();
        setCurMixIdx(getCurMixIdx() + 1);
    }
    if (getCurMixIdx() == getTargetMixIdx()) {
        let comp = getMixArr().reduce(
            (a, b) => [(a[0] + b[0]), (a[1] + b[1]), (a[2] + b[2])],
            [0, 0, 0],
        );

        let sum = comp[0] + comp[1] + comp[2];
        blockPalette.setClick(comp[0] / sum, comp[1] / sum, comp[2] / sum);
        saveGD(UI_PALETTE_MIXER, false);
        return;
    }
}

addUIFunctionMap(UI_PALETTE_MIXER, () => {setCurMixIdx(getCurMixIdx() - (getCurMixIdx() % 3) + 1); setTargetMixIdx(getCurMixIdx() + getMixArrLen()); });