import { BaseSquare } from "./squares/BaseSqaure.js";
import { getNeighbors, getDirectNeighbors, addSquare, addSquareOverride, getSquares, getCollidableSquareAtLocation, iterateOnSquares } from "./squares/_sqOperations.js";
import { purge, reset, renderWater, renderSquares, physics, physicsBefore, processOrganisms, renderOrganisms, doWaterFlow, removeSquare } from "./globalOperations.js"
import { RockSquare } from "./squares/RockSquare.js"
import { DirtSquare } from "./squares/DirtSquare.js";
import { WaterSquare } from "./squares/WaterSquare.js";
import { RainSquare } from "./squares/RainSquare.js";
import { HeavyRainSquare } from "./squares/RainSquare.js";
import { AquiferSquare } from "./squares/RainSquare.js";
import { WaterDistributionSquare } from "./squares/WaterDistributionSquare.js";
import { DrainSquare } from "./squares/DrainSquare.js";
import { SeedSquare } from "./squares/SeedSquare.js";
import { PopGrassSeedOrganism } from "./organisms/PopGrassSeedOrganism.js";
import { addNewOrganism, addOrganism, iterateOnOrganisms } from "./organisms/_orgOperations.js";

import { updateTime, ALL_ORGANISMS, ALL_ORGANISM_SQUARES, ALL_SQUARES, getNextEntitySpawnId } from "./globals.js";

import { doErase } from "./manipulation.js";
import { ProtoMap } from "./types.js";
import { GravelSquare } from "./squares/GravelSquare.js";
import { SandSquare } from "./squares/SandSquare.js";
import { getOrganismSquaresAtSquare } from "./lifeSquares/_lsOperations.js";
import { CactusSeedOrganism } from "./organisms/CactusSeedOrganism.js";
import { LilyPadSeedOrganism } from "./organisms/LilyPadSeedOrganism.js";
import { MossSeedOrganism } from "./organisms/MossSeedOrganism.js";
import { PlantSquare } from "./squares/PlantSquare.js";
import { randNumber } from "./common.js";
import { pond_demo_square_data } from "./saves.js";
import { HydrangeaSeedOrganism } from "./organisms/HydrangeaSeedOrganism.js";
import { MossCoolSeedOrganism } from "./organisms/MossCoolSeedOrganism.js";

var lastMode = "normal"; // options: "normal", "special", "organism";

var specialSelect = document.getElementById("specialSelect");
var specialSelect_val = "water";
var material1 = document.getElementById("material1");
var material1_val = "dirt";
var material2 = document.getElementById("material2");
var material2_val = "sand";
var mixMaterials = document.getElementById("mixMaterials");
var mixMaterials_val = true;
var materialSlider = document.getElementById("materialSlider");
var materialSlider_val = 0;
var brushStrengthSlider = document.getElementById("brushStrengthSlider");
var brushStrengthSlider_val = 100;

var organismWetland = document.getElementById("organismWetland");
var organismWetland_val;
var organismOther = document.getElementById("organismOther");
var organismOther_val;

var mainControlTable = document.getElementById("mainControlTable");
var secondaryControlTable = document.getElementById("secondaryControlTable");
var specialHeader = document.getElementById("specialHeader");
var specialHeader_ref = "special"
var normalHeader = document.getElementById("normalHeader");
var normalHeader_ref = "normal"
var orgWetlandHeader = document.getElementById("orgWetlandHeader");
var orgWetlandHeader_ref = "organismWetland"
var orgOtherHeader = document.getElementById("orgOtherHeader");
var orgOtherHeader_ref = "organismOther"

var canvasWidth = document.getElementById("canvasWidth");
var canvasHeight = document.getElementById("canvasHeight");

var timeScale = document.getElementById("timeScale");
var viewmodeSelect = document.getElementById("viewmodeSelect");

var loadSlotA = document.getElementById("loadSlotA");
var saveSlotA = document.getElementById("saveSlotA");
var loadSlotB = document.getElementById("loadSlotB");
var saveSlotB = document.getElementById("saveSlotB");
var loadSlotC = document.getElementById("loadSlotC");
var saveSlotC = document.getElementById("saveSlotC");

var loadSlotPond = document.getElementById("loadSlotPond");

var selectedMaterial = "dirt";
var selectedViewMode = "normal";
const BASE_SIZE = 4;


function styleHeader() {
    var nonbold_headers = [
        specialHeader,
        normalHeader,
        orgWetlandHeader,
        orgOtherHeader
    ]
    var bold_headers = [];
    if (lastMode == specialHeader_ref) {
        nonbold_headers = Array.from(nonbold_headers.filter((v) => v != specialHeader));
        bold_headers.push(specialHeader);
    }
    if (lastMode == normalHeader_ref) {
        nonbold_headers = Array.from(nonbold_headers.filter((v) => v != normalHeader));
        bold_headers.push(normalHeader);
    }
    if (lastMode == orgWetlandHeader_ref) {
        nonbold_headers = Array.from(nonbold_headers.filter((v) => v != orgWetlandHeader));
        bold_headers.push(orgWetlandHeader);
    }
    if (lastMode == orgOtherHeader_ref) {
        nonbold_headers = Array.from(nonbold_headers.filter((v) => v != orgOtherHeader));
        bold_headers.push(orgOtherHeader);
    }

    nonbold_headers.forEach((header) => header.classList = "nonselected");
    bold_headers.forEach((header) => header.classList = "selected");
}

styleHeader();

specialSelect.addEventListener('change', (e) => {
    lastMode = "special";
    styleHeader();
    specialSelect_val = e.target.value;
});
material1.addEventListener('change', (e) => {
    lastMode = "normal";
    styleHeader();
    material1_val = e.target.value;
});
material2.addEventListener('change', (e) => {
    lastMode = "normal";
    styleHeader();
    material2_val = e.target.value;
});
mixMaterials.addEventListener('change', (e) => {
    lastMode = "normal";
    styleHeader();
    mixMaterials_val = e.target.checked;
});
materialSlider.addEventListener('change', (e) => {
    lastMode = "normal";
    styleHeader();
    materialSlider_val = parseInt(e.target.value);
});
organismWetland.addEventListener('change', (e) => {
    lastMode = "organismWetland";
    styleHeader();
    organismWetland_val = e.target.value;
});
organismOther.addEventListener('change', (e) => {
    lastMode = "organismOther";
    styleHeader();
    organismOther_val = e.target.value;
});
brushStrengthSlider.addEventListener('change', (e) => {
    lastMode = "normal";
    styleHeader();
    brushStrengthSlider_val = e.target.value;
});

viewmodeSelect.addEventListener('change', (e) => selectedViewMode = e.target.value);
timeScale.addEventListener("change", (e) => TIME_SCALE = e.target.value)

canvasWidth.addEventListener('change', (e) => setCanvasSquaresX(e.target.value));
canvasHeight.addEventListener('change', (e) => setCanvasSquaresY(e.target.value));

var mouseDown = 0;
var organismAddedThisClick = false;
var lastMoveEvent = null;
var lastMoveOffset = null;
var lastLastMoveOffset = null;

var lastTick = Date.now();

var CANVAS_SQUARES_X = 240; // * 8; //6;
var CANVAS_SQUARES_Y = 100; // * 8; // 8;

function setCanvasSquaresX(val) {
    CANVAS_SQUARES_X = Math.floor(val);
    MAIN_CANVAS.width = CANVAS_SQUARES_X * BASE_SIZE;
    MAIN_CANVAS.height = CANVAS_SQUARES_Y * BASE_SIZE;
    mainControlTable.setAttribute("width", CANVAS_SQUARES_X * BASE_SIZE);
    secondaryControlTable.setAttribute("width", CANVAS_SQUARES_X * BASE_SIZE);
    for (let i = 0; i < CANVAS_SQUARES_X; i++) {
        addSquare(new RockSquare(i, CANVAS_SQUARES_Y - 1));
    }
}

function getCanvasSquaresX() {
    return CANVAS_SQUARES_X;
}

function setCanvasSquaresY(val) {
    CANVAS_SQUARES_Y = Math.floor(val);
    MAIN_CANVAS.width = CANVAS_SQUARES_X * BASE_SIZE;
    MAIN_CANVAS.height = CANVAS_SQUARES_Y * BASE_SIZE;
    mainControlTable.setAttribute("width", CANVAS_SQUARES_X * BASE_SIZE);
    secondaryControlTable.setAttribute("width", CANVAS_SQUARES_X * BASE_SIZE);
    for (let i = 0; i < CANVAS_SQUARES_X; i++) {
        addSquare(new RockSquare(i, CANVAS_SQUARES_Y - 1));
    }
}
function getCanvasSquaresY() {
    return CANVAS_SQUARES_Y;
}


mainControlTable.setAttribute("width", CANVAS_SQUARES_X * BASE_SIZE);
secondaryControlTable.setAttribute("width", CANVAS_SQUARES_X * BASE_SIZE);
// var CANVAS_SQUARES_X = 40;
// var CANVAS_SQUARES_Y = 40;

var MAIN_CANVAS = document.getElementById("main");
var MAIN_CONTEXT = MAIN_CANVAS.getContext('2d');
MAIN_CANVAS.width = CANVAS_SQUARES_X * BASE_SIZE;
MAIN_CANVAS.height = CANVAS_SQUARES_Y * BASE_SIZE;

MAIN_CANVAS.addEventListener('mousemove', handleClick, false);

document.body.onmousedown = function () {
    mouseDown = 1;
}
document.body.onmouseup = function () {
    mouseDown = 0;
    organismAddedThisClick = false;
}

var shiftPressed = false;

var TIME_SCALE = 1;
var MILLIS_PER_TICK = 1;

var rightMouseClicked = false;

loadSlotA.onclick = (e) => loadSlot("A");
saveSlotA.onclick = (e) => saveSlot("A");
loadSlotB.onclick = (e) => loadSlot("B");
saveSlotB.onclick = (e) => saveSlot("B");
loadSlotC.onclick = (e) => loadSlot("C");
saveSlotC.onclick = (e) => saveSlot("C");

loadSlotPond.onclick = (e) => loadSlotFromSave(pond_demo_square_data);

function loadObjArr(sourceObjMap, addFunc) {
    iterateOnSquares((sq) => sq.destroy());
    var sqMaxPosY = 0;
    var rootKeys = Object.keys(sourceObjMap);
    for (let i = 0; i < rootKeys.length; i++) {
        var subObj = sourceObjMap[rootKeys[i]];
        if (subObj != null) {
            var subKeys = Object.keys(subObj);
            for (let j = 0; j < subKeys.length; j++) {
                sourceObjMap[rootKeys[i]][subKeys[j]].forEach((obj) => {
                    addFunc(Object.setPrototypeOf(obj, ProtoMap[obj.proto]));
                    sqMaxPosY = Math.max(sqMaxPosY, obj.posY);
                });
            }
        }
    }
    if (sqMaxPosY != CANVAS_SQUARES_Y) {
        iterateOnSquares((sq) => {
            removeSquare(sq);
            sq.posY += (CANVAS_SQUARES_Y - 1) - sqMaxPosY;
            addSquare(sq)
        }, 1);
    }

}

async function loadSlotFromSave(slotData) {
    const loaded_ALL_SQUARES = JSON.parse(await base64ToGzip(slotData));
    loadObjArr(loaded_ALL_SQUARES, addSquareOverride)
}

async function loadSlot(slotName) {
    var sqLoad = localStorage.getItem("ALL_SQUARES_" + slotName);
    if (sqLoad == null) {
        alert("no data to load!!! beep boop :(")
        return null;
    }
    // These are not our 'real' objects - they are JSON objects.
    // So they don't have functions and such. 
    const loaded_ALL_SQUARES = JSON.parse(await base64ToGzip(sqLoad));
    var loaded_ALL_ORGANISMS = JSON.parse(localStorage.getItem("ALL_ORGANISMS_" + slotName));
    var loaded_ALL_ORGANISM_SQUARES = JSON.parse(localStorage.getItem("ALL_ORGANISM_SQUARES_" + slotName));

    // bippity boppity do something like this 
    // Object.setPrototypeOf(sq, DirtSquare.prototype)

    loadObjArr(loaded_ALL_SQUARES, addSquareOverride)
}

async function saveSlot(slotName) {
    const compressedSquares = await gzipToBase64(JSON.stringify(ALL_SQUARES));
    localStorage.setItem("ALL_SQUARES_" + slotName, compressedSquares);
    // localStorage.setItem("ALL_ORGANISMS_" + slotName, JSON.stringify(ALL_ORGANISMS));
    // localStorage.setItem("ALL_ORGANISM_SQUARES_" + slotName, JSON.stringify(ALL_ORGANISM_SQUARES));
}

async function gzipToBase64(inputString) {
    const encoder = new TextEncoder();
    const data = encoder.encode(inputString);

    const compressionStream = new CompressionStream("gzip");
    const writer = compressionStream.writable.getWriter();
    writer.write(data);
    writer.close();

    const compressedStream = compressionStream.readable;
    const compressedArrayBuffer = await new Response(compressedStream).arrayBuffer();
    const compressedUint8Array = new Uint8Array(compressedArrayBuffer);

    // Encode to Base64 in chunks
    let binaryString = '';
    for (let i = 0; i < compressedUint8Array.length; i++) {
        binaryString += String.fromCharCode(compressedUint8Array[i]);
    }

    return btoa(binaryString);
}

// Decode Base64 and gunzip
async function base64ToGzip(base64String) {
    const binaryString = atob(base64String);
    const compressedData = Uint8Array.from(binaryString, (char) => char.charCodeAt(0));

    const decompressionStream = new DecompressionStream("gzip");
    const writer = decompressionStream.writable.getWriter();
    writer.write(compressedData);
    writer.close();

    const decompressedStream = decompressionStream.readable;
    const decompressedArrayBuffer = await new Response(decompressedStream).arrayBuffer();

    const decoder = new TextDecoder();
    return decoder.decode(decompressedArrayBuffer);
}


function handleMouseDown(e) {
    //e.button describes the mouse button that was clicked
    // 0 is left, 1 is middle, 2 is right
    if (e.button === 2) {
        rightMouseClicked = true;
    } else if (e.button === 0) {
        //Do something if left button was clicked and right button is still pressed
        if (rightMouseClicked) {
            console.log('hello');
            //code
        }
    }
}

function handleMouseUp(e) {
    if (e.button === 2) {
        rightMouseClicked = false;
    }
}

document.addEventListener('mousedown', handleMouseDown);
document.addEventListener('mouseup', handleMouseUp);
document.addEventListener('contextmenu', function (e) {
    e.preventDefault();
});

function main() {
    if (Date.now() - lastTick > MILLIS_PER_TICK) {
        MAIN_CONTEXT.clearRect(0, 0, CANVAS_SQUARES_X * BASE_SIZE, CANVAS_SQUARES_Y * BASE_SIZE);
        doClickAdd();
        for (let i = 0; i < TIME_SCALE; i++) {
            reset();
            physicsBefore();
            physics();
            doWaterFlow();
            purge();
            processOrganisms();
        }
        renderSquares();
        renderOrganisms();
        renderWater();
        lastTick = Date.now();
    }
    updateTime();
    setTimeout(main, 5);
    doMouseHover();
}



function getOffset(evt) {
    if (evt.offsetX != undefined)
        return { x: evt.offsetX, y: evt.offsetY };

    var el = evt.target;
    var offset = { x: 0, y: 0 };

    while (el.offsetParent) {
        offset.x += el.offsetLeft;
        offset.y += el.offsetTop;
        el = el.offsetParent;
    }

    offset.x = evt.pageX - offset.x;
    offset.y = evt.pageY - offset.y;

    return offset;
}

function handleClick(event) {
    lastMoveEvent = event;
    lastMoveOffset = getOffset(event);

    if (!rightMouseClicked && mouseDown <= 0) {
        lastLastMoveOffset = lastMoveOffset;
    }
}

function doMouseHover() {
    if (lastMoveEvent == null) {
        return;
    }
    var px = lastMoveEvent.x / BASE_SIZE;
    var py = lastMoveEvent.y / BASE_SIZE;
    iterateOnOrganisms((org) => org.hovered = false);
    getOrganismSquaresAtSquare(Math.floor(px), Math.floor(py)).forEach((orgSq) => orgSq.linkedOrganism.hovered = true);
}

function addSquareByNameConfig(posX, posY) {
    if (Math.random() * 100 < (100 - brushStrengthSlider_val)) {
        return;
    }
    if (!mixMaterials_val) {
        return addSquareByName(posX, posY, material1_val);
    }
    if (Math.random() * 100 > materialSlider_val) {
        return addSquareByName(posX, posY, material1_val);
    } else {
        return addSquareByName(posX, posY, material2_val);
    }
}

function addSquareByName(posX, posY, name) {
    switch (name) {
        case "rock":
            return addSquareOverride(new RockSquare(posX, posY));
        case "dirt":
            return addSquareOverride(new DirtSquare(posX, posY));
        case "water":
            return addSquare(new WaterSquare(posX, posY));
        case "rain":
            return addSquareOverride(new RainSquare(posX, posY));
        case "heavy rain":
            return addSquareOverride(new HeavyRainSquare(posX, posY));
        case "water distribution":
            return addSquareOverride(new WaterDistributionSquare(posX, posY));
        case "drain":
            return addSquareOverride(new DrainSquare(posX, posY));
        case "aquifer":
            return addSquare(new AquiferSquare(posX, posY));
        case "gravel":
            return addSquareOverride(new GravelSquare(posX, posY));
        case "sand":
            return addSquareOverride(new SandSquare(posX, posY));
    };
}

function doClickAdd() {
    if (lastMoveEvent == null) {
        return;
    }
    if (mouseDown > 0) {
        var offsetX = lastMoveOffset.x / BASE_SIZE;
        var offsetY = lastMoveOffset.y / BASE_SIZE;
        var prevOffsetX = (lastLastMoveOffset == null ? lastLastMoveOffset : lastLastMoveOffset).x / BASE_SIZE;
        var prevOffsetY = (lastLastMoveOffset == null ? lastLastMoveOffset : lastLastMoveOffset).y / BASE_SIZE;

        // point slope motherfuckers 

        var x1 = prevOffsetX;
        var x2 = offsetX;
        var y1 = prevOffsetY;
        var y2 = offsetY;

        var dx = x2 - x1;
        var dy = y2 - y1;
        var dz = Math.pow(dx ** 2 + dy ** 2, 0.5);

        var totalCount = Math.max(1, Math.round(dz));
        var ddx = dx / totalCount;
        var ddy = dy / totalCount;
        for (let i = 0; i < totalCount; i += 0.5) {
            var px = x1 + ddx * i;
            var py = y1 + ddy * i;
            for (let i = 0; i < (CANVAS_SQUARES_Y - offsetY); i++) {
                var curY = py + i;
                if (rightMouseClicked) {
                    doErase(px, curY);
                    break;
                } else {
                    if (lastMode == "normal") {
                        addSquareByNameConfig(px, curY);
                    }
                    else if (lastMode == "special") {
                        addSquareByName(px, curY, specialSelect_val);
                    } else if (lastMode.startsWith("organism")) {
                        var selectedOrganism;
                        if (lastMode == "organismWetland") {
                            selectedOrganism = organismWetland_val;
                        } else if (lastMode == "organismOther") {
                            selectedOrganism = organismOther_val;
                        }

                        switch (selectedOrganism) {
                            // organism sections
                            // in this case we only want to add one per click
                            case "popgrass":
                                if (Math.random() > 0.95) {
                                    var sq = addSquare(new SeedSquare(px, curY));
                                    if (sq) {
                                        // organismAddedThisClick = true;
                                        addNewOrganism(new PopGrassSeedOrganism(sq));
                                    }
                                }
                                break;

                            case "cactus":
                                if (Math.random() > 0.95) {
                                    var sq = addSquare(new SeedSquare(px, curY));
                                    if (sq) {
                                        addNewOrganism(new CactusSeedOrganism(sq));
                                    }
                                }
                                break;

                            case "waterlily":
                                if (Math.random() > 0.95) {
                                    var sq = addSquare(new SeedSquare(px, curY));
                                    if (sq) {
                                        addNewOrganism(new LilyPadSeedOrganism(sq));
                                    }
                                }
                                break;

                            case "moss":
                                if (Math.random() > 0.95) {
                                    var sq = addSquare(new SeedSquare(px, curY));
                                    if (sq) {
                                        addNewOrganism(new MossSeedOrganism(sq));
                                    }
                                }
                                break;
                            
                            case "mosscool":
                                if (Math.random() > 0.95) {
                                    var sq = addSquare(new SeedSquare(px, curY));
                                    if (sq) {
                                        addNewOrganism(new MossCoolSeedOrganism(sq));
                                    }
                                }
                                break;
                            
                            case "hydrangea":
                                if (organismAddedThisClick) {
                                    return;
                                }
                                var sq = addSquare(new SeedSquare(px, curY));
                                if (sq) {
                                    addNewOrganism(new HydrangeaSeedOrganism(sq));
                                    organismAddedThisClick = true;
                                }
                                break;
                        }
                    }

                }
                if (!shiftPressed || selectedMaterial.indexOf("rain") >= 0 || selectedMaterial.indexOf("aquifer") >= 0) {
                    break;
                }
            }
        }
        lastLastMoveOffset = lastMoveOffset;
    }
}

// thanks https://stackoverflow.com/questions/5623838/rgb-to-hex-and-hex-to-rgb

for (let i = 0; i < CANVAS_SQUARES_X; i++) {
    addSquare(new RockSquare(i, CANVAS_SQUARES_Y - 1));
}

// for (let i = 0; i < CANVAS_SQUARES_Y; i++) {
//     addSquare(new RockSquare(CANVAS_SQUARES_X - 1, i));
//     addSquare(new RockSquare(0, i));
// }
window.oncontextmenu = function () {
    return false;     // cancel default menu
}
main()


window.onload = function () {
    document.addEventListener('keydown', function (e) {
        if (e.code === "ShiftLeft") {
            shiftPressed = true;
        }
    }, false);

    document.addEventListener('keyup', function (e) {
        if (e.code === "ShiftLeft") {
            shiftPressed = false;
        }
    }, false);


    // document.addEventListener('keyup', (e) => {
    //     if (e.code === "Shift") {
    //         shiftPressed = false;
    //     }
    // });
}

export {
    MAIN_CANVAS, MAIN_CONTEXT, CANVAS_SQUARES_X, CANVAS_SQUARES_Y, BASE_SIZE, selectedViewMode, addSquareByName,
    setCanvasSquaresX, setCanvasSquaresY,
    getCanvasSquaresX, getCanvasSquaresY
}