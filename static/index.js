

import { loadEmptyScene, loadUserSettings } from "./saveAndLoad.js";
import { clearTimeouts, resetClimateAndLighting, scheduler_main } from "./main.js";
import { keydown, keyup } from "./keyboard.js";
import { handleClick, handleMouseDown, handleMouseUp, handleTouchEnd, handleTouchMove, handleTouchStart } from "./mouse.js";
import { getCanvasHeight, getCanvasWidth, resetZoom, setBaseSize, setCanvasSquaresX, setCanvasSquaresY, zoom } from "./canvas.js";
import { addUIFunctionMap, loadGD, UI_DISPLAY_SIZEY, UI_SIZE } from "./ui/UIData.js";
import { initUI } from "./ui/WindowManager.js";
import { iterateOnSquares } from "./squares/_sqOperations.js";
import { purgeCanvasFrameLimit } from "./globalOperations.js";

export let MAIN_CANVAS = document.getElementById("main");
export let MAIN_CONTEXT = MAIN_CANVAS.getContext('2d');

const body = document.getElementById("body");

MAIN_CANVAS.addEventListener('mousemove', handleClick, false);
MAIN_CANVAS.addEventListener('mousedown', handleMouseDown);
MAIN_CANVAS.addEventListener('mouseup', handleMouseUp);

MAIN_CANVAS.onkeydown = keydown;
MAIN_CANVAS.onkeyup = keyup;
MAIN_CANVAS.onwheel = zoom;

MAIN_CANVAS.width = getCanvasWidth();
MAIN_CANVAS.height = getCanvasHeight();

document.addEventListener('contextmenu', (e) => e.preventDefault());

document.addEventListener('touchstart', handleTouchStart, { passive: false });
document.addEventListener('touchend', handleTouchEnd, { passive: false });
document.addEventListener('touchmove', handleTouchMove, { passive: false });

window.oncontextmenu = () => false;
window.onload = function () {
    document.addEventListener('keydown', keydown);
    document.addEventListener('keyup', keyup);
    loadUserSettings();
    loadEmptyScene();
    indexCanvasSize();
}

setTimeout(scheduler_main, 0);

let width = 0;
let height = 0;

export function getTotalCanvasPixelWidth() { return width; }
export function getTotalCanvasPixelHeight() { return height; }

export function indexCanvasSize() {
    let margin = 0;
    width = Math.floor(window.innerWidth - margin);
    height = Math.floor(window.innerHeight - margin);

    let c_baseSize = Math.floor(height / loadGD(UI_DISPLAY_SIZEY));
    setCanvasSquaresY(loadGD(UI_DISPLAY_SIZEY));
    setCanvasSquaresX(Math.floor(width / c_baseSize));      
    setBaseSize(c_baseSize);
    clearTimeouts();
    resetClimateAndLighting();
    purgeCanvasFrameLimit();
    iterateOnSquares((sq) => sq.lighting = new Array());

    MAIN_CANVAS.width = width;
    MAIN_CANVAS.height = height; 
    initUI();
    resetZoom();
}

addUIFunctionMap(UI_DISPLAY_SIZEY, indexCanvasSize)
addUIFunctionMap(UI_SIZE, initUI)

export function setBackgroundColor(hexColor) {
    body.style = "background-color: " + hexColor
}

window.onresize = indexCanvasSize;
document.documentElement.style.overflow = 'hidden';  // firefox, chrome
