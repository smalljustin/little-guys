export let ALL_SQUARES = new Map();
export let ALL_ORGANISMS = new Map();
export let ALL_ORGANISM_SQUARES = new Map();
export let stats = new Map();
export let NUM_GROUPS = 0; 
export let WATERFLOW_TARGET_SQUARES = new Map();
export let WATERFLOW_CANDIDATE_SQUARES = new Set();
export let LIGHT_SOURCES = new Array();
export let global_theta_base = 0;

export function purgeMaps() {
    ALL_SQUARES = new Map();
    ALL_ORGANISMS = new Map();
    ALL_ORGANISM_SQUARES = new Map();
}

let mixArrLen = 3; 
let curMixIdx = Math.floor(Date.now());
curMixIdx -= curMixIdx % mixArrLen;
let targetMixIdx = curMixIdx + mixArrLen;
let mixArr = new Array(mixArrLen);

export function getCurMixIdx() {
    return curMixIdx;
}
export function setCurMixIdx(inVal) {
    curMixIdx = inVal;
}
export function getTargetMixIdx() {
    return targetMixIdx;
}
export function setTargetMixIdx(inVal) {
    targetMixIdx = inVal;
}
export function getMixArrLen() {
    return mixArrLen;
}
export function getMixArr() {
    return mixArr;
}

export function getNextGroupId() {
    NUM_GROUPS += 1;
    return NUM_GROUPS;
}

export function resetWaterflowSquares() {
    WATERFLOW_TARGET_SQUARES = new Map();
    WATERFLOW_CANDIDATE_SQUARES = new Map();
}

export function getGlobalThetaBase() {
    return global_theta_base;
}

export function setGlobalThetaBase(inVal) {
    global_theta_base = inVal;
}