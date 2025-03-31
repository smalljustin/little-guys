import { addOrganismSquare } from "./lifeSquares/_lsOperations.js";
import { addOrganism, iterateOnOrganisms } from "./organisms/_orgOperations.js";
import { GrowthComponent, GrowthPlan, GrowthPlanStep } from "./organisms/GrowthPlan.js";
import { addSquare, addSquareOverride, iterateOnSquares } from "./squares/_sqOperations.js";
import { getTemperatureMap, getWaterSaturationMap } from "./climate/temperatureHumidity.js";
import { getCurDay, setCurDay } from "./climate/time.js";
import { ProtoMap, TypeMap } from "./types.js";
import { getWindPressureMap, initWindPressure } from "./climate/wind.js";
import { getGAMEDATA, getUICONFIG, saveMapEntry, setGAMEDATA, setUICONFIG, UI_SIZE, UICONFIG } from "./ui/UIData.js";
import { getTotalCanvasPixelWidth, indexCanvasSize } from "./index.js";
import { STAGE_DEAD } from "./organisms/Stages.js";
import { initUI } from "./ui/WindowManager.js";
import { purgeMaps } from "./globals.js";

export async function loadSlot(slotName) {
    const db = await openDatabase();
    const transaction = db.transaction("saves", "readonly");
    const store = transaction.objectStore("saves");

    return new Promise((resolve, reject) => {
        const request = store.get(slotName);
        request.onsuccess = async () => {
            if (request.result) {
                const decompressedSave = await decompress(request.result.data);
                const saveObj = JSON.parse(decompressedSave);
                loadSlotData(saveObj);
                resolve(saveObj);
            } else {
                reject(new Error("Save slot not found"));
            }
        };
        request.onerror = () => reject(request.error);
    });
}

export async function loadUserSettings() {
    try {
        const db = await openDatabase();
        const transaction = db.transaction("settings", "readonly");
        const store = transaction.objectStore("settings");
        return new Promise((resolve, reject) => {
            const request = store.get("UI");
            request.onsuccess = async () => {
                if (request.result) {
                    const decompressedSave = await decompress(request.result.data);
                    const saveObj = JSON.parse(decompressedSave);
                    setUICONFIG(saveObj);
                    initUI();
                    resolve(saveObj);
                } else {
                    console.log("No existing UI save data found.");
                    let w = getTotalCanvasPixelWidth();
                    if (w < 1500) {
                        saveMapEntry(UICONFIG, UI_SIZE, 8);
                    } else if (w < 2000) {
                        saveMapEntry(UICONFIG, UI_SIZE, 12);
                    } else {
                        saveMapEntry(UICONFIG, UI_SIZE, 16);
                    }
                    initUI();
                }
            };
            request.onerror = () => reject(request.error);
        });
    } catch {
        console.log("No existing UI save data found.");
        if (getTotalCanvasPixelWidth() < 1500) {
            saveMapEntry(UICONFIG, UI_SIZE, 8);
        } else {
            saveMapEntry(UICONFIG, UI_SIZE, 12);
        }
        initUI();
    }
}
export async function saveUserSettings() {
    const compressedSave = await compress(JSON.stringify(getUICONFIG()));
    const db = await openDatabase();
    const transaction = db.transaction("settings", "readwrite");
    const store = transaction.objectStore("settings");

    await new Promise((resolve, reject) => {
        const request = store.put({ slot: "UI", data: compressedSave });
        request.onsuccess = resolve;
        request.onerror = () => reject(request.error);
    });

    console.log("Game saved to IndexedDB!");
}

function purgeGameState() {
    iterateOnSquares((sq) => sq.destroy());
    iterateOnOrganisms((org) => org.destroy());
    purgeMaps();
    initWindPressure();
}

function loadSlotData(slotData) {
    purgeGameState();
    loadSlotFromSave(slotData);
}

export function saveSlot(slotName) {
    const saveObj = getFrameSaveData();
    const saveString = JSON.stringify(saveObj);
    purgeMaps();
    doSave(slotName, saveString);
    loadSlotData(saveObj)
}

async function doSave(slotName, saveString) {
    const compressedSave = await compress(saveString);

    const db = await openDatabase();
    const transaction = db.transaction("saves", "readwrite");
    const store = transaction.objectStore("saves");

    await new Promise((resolve, reject) => {
        const request = store.put({ slot: slotName, data: compressedSave });
        request.onsuccess = resolve;
        request.onerror = () => reject(request.error);
    });

    console.log("Game saved to IndexedDB!");
}

async function openDatabase() {
    return new Promise((resolve, reject) => {
        const request = indexedDB.open("lgdb", 1);
        request.onupgradeneeded = (event) => {
            const db = event.target.result;
            if (!db.objectStoreNames.contains("saves")) {
                db.createObjectStore("saves", { keyPath: "slot" });
            }
            if (!db.objectStoreNames.contains("settings")) {
                db.createObjectStore("settings", { keyPath: "slot" });
            }
        };
        request.onsuccess = () => resolve(request.result);
        request.onerror = () => reject(request.error);
    });
}


function getFrameSaveData() {
    let sqArr = new Array();
    let orgArr = new Array();
    let lsqArr = new Array();
    let growthPlanArr = new Array();
    let growthPlanComponentArr = new Array();
    let growthPlanStepArr = new Array();

    iterateOnOrganisms((org) => {
        if (org.stage != STAGE_DEAD) {
            orgArr.push(org);
            lsqArr.push(...org.lifeSquares);
            growthPlanArr.push(...org.growthPlans);
            growthPlanComponentArr.push(...org.growthPlans.map((gp) => gp.component))
            org.growthPlans.forEach((gp) => growthPlanStepArr.push(...gp.steps));
        }
    });

    growthPlanStepArr.forEach((gps) => {
        gps.growthPlan = growthPlanArr.indexOf(gps.growthPlan);
        gps.completedSquare = lsqArr.indexOf(gps.completedSquare);
    });

    growthPlanComponentArr.forEach((gpc) => {
        gpc.growthPlan = growthPlanArr.indexOf(gpc.growthPlan);
        gpc.lifeSquares = Array.from(gpc.lifeSquares.map((lsq) => lsqArr.indexOf(lsq)));
        gpc.parentComponent = growthPlanComponentArr.indexOf(gpc.parentComponent);
        gpc.children = Array.from(gpc.children.map((child) => growthPlanComponentArr.indexOf(child)));
    });

    growthPlanArr.forEach((gp) => {
        gp.steps = Array.from(gp.steps.map((gps) => growthPlanStepArr.indexOf(gps)));
        gp.component = growthPlanComponentArr.indexOf(gp.component);
    });

    iterateOnSquares((sq) => {
        sq.lighting = [];
        if (sq.linkedOrganism != null)
            sq.linkedOrganism = orgArr.indexOf(sq.linkedOrganism);
        sq.linkedOrganismSquares = Array.from(sq.linkedOrganismSquares.map((lsq) => lsqArr.indexOf(lsq)));
        sqArr.push(sq)
    });

    iterateOnOrganisms((org) => {
        org.lighting = [];
        org.linkedSquare = sqArr.indexOf(org.linkedSquare);
        org.growthPlans = Array.from(org.growthPlans.map((gp) => growthPlanArr.indexOf(gp)));
        org.lifeSquares.forEach((lsq) => {
            lsq.lighting = [];
            lsq.linkedSquare = sqArr.indexOf(lsq.linkedSquare);
            lsq.linkedOrganism = orgArr.indexOf(lsq.linkedOrganism);
            lsq.component = growthPlanComponentArr.indexOf(lsq.component);
        });
        org.lifeSquares = Array.from(org.lifeSquares.map((lsq) => lsqArr.indexOf(lsq)));
        org.originGrowth = growthPlanComponentArr.indexOf(org.originGrowth);
        if (org.greenType != null) {
            org.greenType = org.greenType.name;
            org.rootType = org.rootType.name;
        }
    })

    let saveObj = {
        sqArr: sqArr,
        orgArr: orgArr,
        lsqArr: lsqArr,
        growthPlanArr: growthPlanArr,
        growthPlanComponentArr: growthPlanComponentArr,
        growthPlanStepArr: growthPlanStepArr,
        curDay: getCurDay(),
        windMap: getWindPressureMap(),
        temperatureMap: getTemperatureMap(),
        waterSaturationMap: getWaterSaturationMap(),
        ui: getGAMEDATA()
    }
    return saveObj;
}



function loadSlotFromSave(slotData) {
    let sqArr = slotData.sqArr;
    let orgArr = slotData.orgArr;
    let lsqArr = slotData.lsqArr;
    let growthPlanArr = slotData.growthPlanArr;
    let growthPlanComponentArr = slotData.growthPlanComponentArr;
    let growthPlanStepArr = slotData.growthPlanStepArr;

    let windMap = slotData.windMap;
    let temperatureMap = slotData.temperatureMap;
    let waterSaturationMap = slotData.waterSaturationMap;


    // setWindPressureMap(windMap);
    // setTemperatureMap(temperatureMap);
    // setWaterSaturationMap(waterSaturationMap);
    setCurDay(slotData.curDay);
    setGAMEDATA(slotData.ui)

    sqArr.forEach((sq) => Object.setPrototypeOf(sq, ProtoMap[sq.proto]));
    orgArr.forEach((org) => Object.setPrototypeOf(org, ProtoMap[org.proto]));
    lsqArr.forEach((lsq) => Object.setPrototypeOf(lsq, ProtoMap[lsq.proto]));

    growthPlanArr.forEach((gp) => Object.setPrototypeOf(gp, GrowthPlan.prototype));
    growthPlanComponentArr.forEach((gpc) => Object.setPrototypeOf(gpc, GrowthComponent.prototype));
    growthPlanStepArr.forEach((gps) => Object.setPrototypeOf(gps, GrowthPlanStep.prototype));

    growthPlanStepArr.forEach((gps) => {
        gps.growthPlan = growthPlanArr[gps.growthPlan];
        if (gps.completedSquare != -1) {
            gps.completedSquare = lsqArr[gps.completedSquare];
        }
    });

    growthPlanComponentArr.forEach((gpc) => {
        gpc.growthPlan = growthPlanArr[gpc.growthPlan];
        gpc.lifeSquares = Array.from(gpc.lifeSquares.map((lsq) => lsqArr[lsq]));
        gpc.parentComponent = growthPlanComponentArr[gpc.parentComponent];
        gpc.children = Array.from((gpc.children.map((ggpc) => growthPlanComponentArr[ggpc])));
    });

    growthPlanArr.forEach((gp) => {
        gp.steps = Array.from(gp.steps.map((gps) => growthPlanStepArr[gps]));
        gp.component = growthPlanComponentArr[gp.component];
    });

    sqArr.forEach((sq) => {
        if (sq.linkedOrganism == -1) {
            sq.linkedOrganism = null;
        } else {
            sq.linkedOrganism = orgArr[sq.linkedOrganism];
        }
        sq.linkedOrganismSquares = Array.from(sq.linkedOrganismSquares.map((lsqIdx) => lsqArr[lsqIdx]));
    });

    sqArr.forEach(addSquare);

    orgArr.forEach((org) => {
        org.linkedSquare = sqArr[org.linkedSquare];
        org.growthPlans = Array.from(org.growthPlans.map((gp) => growthPlanArr[gp]));
        org.lifeSquares = Array.from(org.lifeSquares.map((lsq) => lsqArr[lsq]));
        org.originGrowth = growthPlanComponentArr[org.originGrowth];
        org.lifeSquares.forEach((lsq) => {
            lsq.lighting = [];
            lsq.linkedSquare = sqArr[lsq.linkedSquare];
            lsq.linkedOrganism = orgArr[lsq.linkedOrganism];
            lsq.component = growthPlanComponentArr[lsq.component];
        });

        org.greenType = TypeMap[org.greenType];
        org.rootType = TypeMap[org.rootType];

        addOrganism(org);
        org.lifeSquares.forEach(addOrganismSquare);
    });

    indexCanvasSize();

}

async function compress(inputString) {
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
async function decompress(base64String) {
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



export function loadEmptyScene() {
    purgeGameState();
}
