import { doZoom, resetZoom } from "./canvas.js";
import { getGlobalThetaBase, setGlobalThetaBase } from "./globals.js";
import { loadUI, saveUI, UI_BB_EYEDROPPER, UI_BB_MIXER, UI_BB_MODE, UI_MODE_ROCK, UI_MODE_SOIL, UI_SM_BB, UI_TOPBAR_SM } from "./ui/UIData.js";

export function keydown(e) {
    e.preventDefault();
    if (e.key == "s") {
        doZoom(-0.1);
    }
    if (e.key == "x") {
        doZoom(0.1);
    }
    if (e.key == "z") {
        setGlobalThetaBase(getGlobalThetaBase() + 0.1);
    }
    if (e.key == "c") {
        setGlobalThetaBase(getGlobalThetaBase() - 0.1);
    }

    if (e.key == '1') {
        saveUI(UI_TOPBAR_SM, true);
        saveUI(UI_SM_BB, true);
        saveUI(UI_BB_MODE, UI_MODE_SOIL);
    }

    if (e.key == '2') {
        saveUI(UI_TOPBAR_SM, true);
        saveUI(UI_SM_BB, true);
        saveUI(UI_BB_MODE, UI_MODE_ROCK);
    }

    if (e.key == 'q') {
        saveUI(UI_BB_EYEDROPPER, !loadUI(UI_BB_EYEDROPPER));
    }
    if (e.key == 'w') {
        saveUI(UI_BB_MIXER, !loadUI(UI_BB_MIXER));
    }
    if (e.key == "Escape") {
        resetZoom();
    }
}

export function keyup(e) {
}