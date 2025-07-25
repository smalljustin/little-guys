

import { getNeighbors, addSquare, getSquares, isSqColChanged, isSqRowChanged, getSqColChangeLocation } from "./_sqOperations.js";
import {
    getNextGroupId,
    getMixArrLen,
    getTargetMixIdx,
    setGroupGrounded,
    isGroupGrounded,
    regSquareToGroup
} from "../globals.js";

import { MAIN_CONTEXT } from "../index.js";

import { hexToRgb, removeItemAll, rgbToRgba } from "../common.js";
import { removeSquare } from "../globalOperations.js";
import { calculateColorTemperature, getTemperatureAtWindSquare, temperatureHumidityFlowrateFactor, updateWindSquareTemperature } from "../climate/simulation/temperatureHumidity.js";
import { getWindSpeedAtLocation, getWindSquareAbove } from "../climate/simulation/wind.js";
import { COLOR_BLACK, GROUP_BROWN, GROUP_BLUE, GROUP_MAUVE, GROUP_TAN, GROUP_GREEN, RGB_COLOR_BLUE, RGB_COLOR_RED } from "../colors.js";
import { getDaylightStrengthFrameDiff, getFrameDt, getTimeScale } from "../climate/time.js";
import { applyLightingFromSource, getDefaultLighting, processLighting } from "../lighting/lightingProcessing.js";
import { getBaseSize, getCanvasSquaresX, getCanvasSquaresY, getFrameYMax, isSquareOnCanvas, zoomCanvasFillCircle, zoomCanvasFillRect, zoomCanvasSquareText } from "../canvas.js";
import { loadGD, UI_PALETTE_ACTIVE, UI_PALETTE_SELECT, UI_PALETTE_SURFACE, UI_LIGHTING_ENABLED, UI_VIEWMODE_LIGHTING, UI_VIEWMODE_MOISTURE, UI_VIEWMODE_NORMAL, UI_VIEWMODE_SELECT, UI_VIEWMODE_SURFACE, UI_VIEWMODE_TEMPERATURE, UI_VIEWMODE_ORGANISMS, UI_LIGHTING_WATER_OPACITY, UI_VIEWMODE_WIND, UI_PALETTE_SURFACE_OFF, UI_GAME_MAX_CANVAS_SQUARES_X, UI_GAME_MAX_CANVAS_SQUARES_Y, UI_VIEWMODE_WATERTICKRATE, UI_SIMULATION_CLOUDS, UI_VIEWMODE_WATERMATRIC, UI_VIEWMODE_GROUP, UI_PALETTE_SPECIAL_SHOWINDICATOR, UI_PALETTE_MODE, UI_PALLETE_MODE_SPECIAL, UI_VIEWMODE_DEV1, UI_VIEWMODE_DEV2, UI_VIEWMODE_EVOLUTION, UI_VIEWMODE_NUTRIENTS, UI_VIEWMODE_AIRTICKRATE, UI_CAMERA_EXPOSURE } from "../ui/UIData.js";
import { deregisterSquare, registerSquare } from "../waterGraph.js";

export class BaseSquare {
    constructor(posX, posY) {
        this.proto = "BaseSquare";
        this.posX = Math.floor(posX);
        this.posY = Math.floor(posY);

        this.offsetX = posX % 1;
        this.offsetY = posY % 1;

        this.color = hexToRgb("#00FFFF");

        this.solid = true;
        this.spawnedEntityId = 0;
        // block properties - overridden by block type
        this.physicsEnabled = true;
        this.gravity = 1;
        this.hasBonked = false;
        this.blockHealthMax = 1;
        this.blockHealth = this.blockHealthMax; // when reaches zero, delete
        // water flow parameters

        this.currentPressureDirect = -1;
        this.waterContainment = 0;
        this.waterContainmentMax = 0.5;
        this.speedX = 0;
        this.speedY = 0;
        this.rootable = false;
        this.group = -1;
        this.groupSetThisFrame = false;
        this.organic = false;
        this.collision = true;
        this.visible = true;
        this.darken = true;
        this.special = false;
        this.randoms = [];
        this.linkedOrganisms = new Array();
        this.linkedOrganismSquares = new Array();
        this.lighting = new Array();
        this.spawnTime = Date.now();

        // for ref - values from dirt
        this.opacity = 1;
        this.cachedRgba = null;
        this.distToFront = 0;
        this.distToFrontLastUpdated = -(10 ** 8);
        this.miscBlockPropUpdateInterval = Math.random() * 1000;

        this.surface = false;

        this.temperature = 273;

        this.thermalMass = 2; // e.g., '2' means one degree of this would equal 2 degrees of air temp for a wind square 

        this.state = 0; // 0 = solid, 1 = liquid
        this.fusionHeat = 10 ** 8; // kJ/mol
        this.vaporHeat = 10 ** 8; // kJ/mol
        this.fusionTemp = 0; // freezing point 
        this.vaporTemp = 10 ** 8; // boiling point

        this.water_fusionHeat = 6;
        this.water_vaporHeat = .000047;
        this.water_fusionTemp = 273;
        this.water_vaporTemp = 373;

        this.lastColorCacheTime = 0;
        this.lastColorCacheOpacity = 1;
        this.colorCacheHoldTime = 0.10;

        this.blockHealth_color1 = RGB_COLOR_RED;
        this.blockHealth_color2 = RGB_COLOR_BLUE;
        this.surfaceLightingFactor = 0.1;
        this.mixIdx = -1;
        this.initTemperature();
        this.activeParticles = new Array();
    };

    mossSpaceRemaining() {
        return 1 - this.linkedOrganismSquares
            .filter((lsq) => lsq.type == "moss")
            .map((lsq) => lsq.opacity)
            .reduce((a, b) => a + b, 0);
    }

    initLightingFromNeighbors() {
        let neighbor = getNeighbors(this.posX, this.posY).find((sq) => sq.lighting.length > 0);
        let curY = this.posY + 1;
        while (neighbor == null) {
            neighbor = getSquares(this.posX, curY).find((sq) => sq.lighting.length > 0);
            curY += 1;
            if (curY > getCanvasSquaresY()) {
                this.lighting = [];
                return;
            }
        }
        applyLightingFromSource(neighbor, this);
    }

    initTemperature() {
        this.temperature = 273 + 25;
    }

    processFrameLightingTemperature() {
        let tickFrac = 4;
        if (Math.random() < 1 - (1 / tickFrac)) {
            return;
        }
        let lightingColor = this.processLighting();
        let lightingApplied = Math.max(0, lightingColor.r + lightingColor.g / 2 + lightingColor.b / 4);

        if (isNaN(lightingApplied)) {
            return;
        }
        lightingApplied /= (15000 / tickFrac);
        this.temperature = Math.min(370, this.temperature + lightingApplied);
    }

    getSoilWaterPressure() { return -(10 ** 8); }

    getLightFilterRate() {
        return 0.00017;
    }

    temperatureRoutine() {
        if (this.organic) {
            return;
        }
        let adjacentWindSquare = getWindSquareAbove(this.posX, this.posY);

        let x = adjacentWindSquare[0];
        let y = adjacentWindSquare[1];

        if (x < 0 || y < 0) {
            return;
        }
        let adjacentTemp = getTemperatureAtWindSquare(x, y);
        let diff = (adjacentTemp - this.temperature);
        diff /= temperatureHumidityFlowrateFactor();
        diff /= 50;
        diff /= Math.max(1, (1 + this.currentPressureDirect));
        this.temperature += diff;
        updateWindSquareTemperature(x, y, getTemperatureAtWindSquare(x, y) - (diff / 4));
    }

    waterEvaporationRoutine() {
    }

    destroy(deep = false) {
        if (deep) {
            this.linkedOrganisms.forEach((org) => org.destroy());
            this.linkedOrganismSquares.forEach((lsq) => lsq.destroy());
        }
        removeSquare(this);
        this.lighting = [];
        this.linkedOrganismSquares = [];
    }
    linkOrganism(organism) {
        this.linkedOrganisms.push(organism);
    }
    unlinkOrganism(organism) {
        this.linkedOrganisms = removeItemAll(this.linkedOrganisms, organism);
    }
    linkOrganismSquare(organismSquare) {
        this.linkedOrganismSquares.push(organismSquare);
    }
    unlinkOrganismSquare(organismSquare) {
        this.linkedOrganismSquares = removeItemAll(this.linkedOrganismSquares, organismSquare);
    }
    reset() {
        if (this.blockHealth <= 0) {
            removeSquare(this);
        }

        if (Math.random() > 0.5) {
            this.groupSetThisFrame = false;
        }

    }
    render() {
        if (!this.visible || this.posY >= getCanvasSquaresY()) {
            return;
        }

        if (loadGD(UI_LIGHTING_ENABLED) && this.lighting.length == 0) {
            this.initLightingFromNeighbors();
        }

        let selectedViewMode = loadGD(UI_VIEWMODE_SELECT);
        if (selectedViewMode == UI_VIEWMODE_NORMAL) {
            this.renderWithVariedColors(1);
        } else if (selectedViewMode == UI_VIEWMODE_ORGANISMS || selectedViewMode == UI_VIEWMODE_EVOLUTION || selectedViewMode == UI_VIEWMODE_NUTRIENTS) {
            this.renderWithVariedColors(0.35);
        } else if (selectedViewMode == UI_VIEWMODE_GROUP) {
            this.renderGroup();
        } else if (selectedViewMode == UI_VIEWMODE_LIGHTING) {
            this.renderWithVariedColors(1);
            if (this.solid)
                this.renderLightingView();
        } else if (selectedViewMode == UI_VIEWMODE_MOISTURE) {
            this.renderWaterSaturation();
        } else if (selectedViewMode == UI_VIEWMODE_WATERTICKRATE) {
            this.renderWaterTickrate();
        } else if (selectedViewMode == UI_VIEWMODE_WATERMATRIC) {
            this.renderMatricPressure();
        }
        if (selectedViewMode == UI_VIEWMODE_SURFACE || (loadGD(UI_PALETTE_ACTIVE) && (loadGD(UI_PALETTE_MODE) == UI_PALLETE_MODE_SPECIAL) && (loadGD(UI_PALETTE_SELECT) == UI_PALETTE_SURFACE || loadGD(UI_PALETTE_SELECT) == UI_PALETTE_SURFACE_OFF))) {
            if (this.solid) {
                this.renderWithVariedColors(1);
                this.renderSurface();
            } else {
                this.renderWithVariedColors(0.25);
            }
        }
        else if (selectedViewMode == UI_VIEWMODE_TEMPERATURE) {
            this.renderTemperature();
        } else if (selectedViewMode == UI_VIEWMODE_WIND || selectedViewMode == UI_VIEWMODE_AIRTICKRATE) {
            this.renderWithVariedColors(0.25);
        } else if (selectedViewMode == UI_VIEWMODE_DEV1 || selectedViewMode == UI_VIEWMODE_DEV2) {
            this.renderWithVariedColors(0.5);
        }
    };

    renderGroup() {
        let colorArr = [
            GROUP_BROWN,
            GROUP_MAUVE,
            GROUP_BLUE,
            GROUP_GREEN,
            GROUP_TAN
        ]
        MAIN_CONTEXT.fillStyle = colorArr[this.group % colorArr.length];
        zoomCanvasFillRect(
            this.posX * getBaseSize(),
            this.posY * getBaseSize(),
            getBaseSize(),
            getBaseSize()
        );

    }

    renderTemperature() {
        MAIN_CONTEXT.fillStyle = calculateColorTemperature(this.temperature);
        zoomCanvasFillRect(
            this.posX * getBaseSize(),
            this.posY * getBaseSize(),
            getBaseSize(),
            getBaseSize()
        );
    }

    renderSurface() {
        if (!loadGD(UI_PALETTE_SPECIAL_SHOWINDICATOR)) {
            return;
        }
        if (!this.surface) {
            MAIN_CONTEXT.fillStyle = "rgba(90, 71, 97, 0.3)"
            zoomCanvasFillRect(
                (this.offsetX + this.posX) * getBaseSize(),
                (this.offsetY + this.posY) * getBaseSize(),
                getBaseSize(),
                getBaseSize()
            );
        } else {
            this.renderSpecialViewModeLinearOpacity({ r: 255, g: 255, b: 255 }, { r: 0, g: 0, b: 0 }, 1 - this.surfaceLightingFactor, 1, 0.3);
        }

    }

    renderAsGrey() {
        MAIN_CONTEXT.fillStyle = "rgba(50, 50, 50, 0.2)";
        zoomCanvasFillRect(
            (this.offsetX + this.posX) * getBaseSize(),
            (this.offsetY + this.posY) * getBaseSize(),
            getBaseSize(),
            getBaseSize()
        );
    }

    renderBlockHealth() {
        this.renderSpecialViewModeLinear(this.waterSaturation_color1, this.waterSaturation_color2, this.blockHealth, this.blockHealthMax);
    }


    renderWaterSaturation() {
        this.renderSpecialViewModeLinear(this.blockHealth_color1, this.blockHealth_color2, this.waterContainment, this.waterContainmentMax);
    }

    renderWaterTickrate() {
        if (this.percolationFactor != null) {
            this.renderSpecialViewModeLinear(this.blockHealth_color1, this.blockHealth_color2, this.percolationFactor, 1);
        }
    }

    renderMatricPressure() {
        if (this.proto == "SoilSquare" || this.proto == "RockSquare") {
            let sp = Math.abs(this.getSoilWaterPressure());
            this.renderSpecialViewModeLinear(this.blockHealth_color2, this.blockHealth_color1, sp, 5);
        }
    }

    renderSpecialViewModeLinear(color1, color2, value, valueMax) {
        this.renderSpecialViewModeLinearOpacity(color1, color2, value, valueMax, 0.4)
    }

    renderSpecialViewModeLinearOpacity(color1, color2, value, valueMax, opacity) {
        let frac = value / valueMax;
        let outColor = {
            r: color1.r * frac + color2.r * (1 - frac),
            g: color1.g * frac + color2.g * (1 - frac),
            b: color1.b * frac + color2.b * (1 - frac)
        }
        let outRgba = rgbToRgba(Math.floor(outColor.r), Math.floor(outColor.g), Math.floor(outColor.b), opacity);
        MAIN_CONTEXT.fillStyle = outRgba;
        zoomCanvasFillRect(
            (this.offsetX + this.posX) * getBaseSize(),
            (this.offsetY + this.posY) * getBaseSize(),
            getBaseSize(),
            getBaseSize()
        );
    }

    getStaticRand(randIdx) {
        while (randIdx > this.randoms.length - 1) {
            this.randoms.push(Math.random());
        }
        return this.randoms[randIdx];
    }

    swapColors(otherSquare) {
        let t1 = this.randoms;
        this.randoms = otherSquare.randoms;
        otherSquare.randoms = t1;
        this.cachedRgba = null;
        otherSquare.cachedRgba = null;
    }

    getColorBase() {
        return this.color;
    }

    processLighting(override = false) {
        if (this.frameCacheLighting != null && !override) {
            return this.frameCacheLighting;
        }
        if (!loadGD(UI_LIGHTING_ENABLED)) {
            this.frameCacheLighting = getDefaultLighting();
            return this.frameCacheLighting;
        }
        this.frameCacheLighting = processLighting(this.lighting);
        return this.frameCacheLighting;
    }

    renderLightingView() {
        if (this.frameCacheLighting == null) {
            this.processLighting();
        }
        let outRgba = rgbToRgba(
            Math.floor(this.frameCacheLighting.r / loadGD(UI_CAMERA_EXPOSURE)),
            Math.floor(this.frameCacheLighting.g / loadGD(UI_CAMERA_EXPOSURE)),
            Math.floor(this.frameCacheLighting.b / loadGD(UI_CAMERA_EXPOSURE)),
            0.5);
        MAIN_CONTEXT.fillStyle = outRgba;
        zoomCanvasFillRect(
            (this.offsetX + this.posX) * getBaseSize(),
            (this.offsetY + this.posY) * getBaseSize(),
            getBaseSize(),
            getBaseSize()
        );
    }

    triggerParticles(bonkSpeed) {
    }

    processParticles() {
        return;
        let next = new Array();
        this.activeParticles.forEach((partArr) => {
            partArr[0] += partArr[3]; // px
            partArr[1] += partArr[4]; // py
            partArr[4] += 0.15;
            partArr[3] *= 0.99;

            let x = Math.round(partArr[0]);
            let y = Math.round(partArr[1]);
            if (x < 0 || y < 0 || x >= getCanvasSquaresX() || y >= getCanvasSquaresY() || getSquares(x, y).length > 0) {
                return;
            } else {
                next.push(partArr);
            }
        });
        this.activeParticles = next;
    }

    renderParticles() {
        MAIN_CONTEXT.fillStyle = this.cachedRgba;
        this.activeParticles.forEach((partArr) => {
            let px = partArr[0];
            let py = partArr[1];
            let size = partArr[5];
            zoomCanvasFillCircle(px * getBaseSize(), py * getBaseSize(), size)
        });
    }

    renderWithVariedColors(opacityMult) {
        if (this.proto == "WaterSquare") {
            this.opacity = loadGD(UI_LIGHTING_WATER_OPACITY);
        }

        let minTime = getFrameDt() * 128;
        if (isSqColChanged(this.posX)) {
            minTime /= 4;
        }
        if (isSqRowChanged(this.posY)) {
            minTime /= 4;
        }

        if (
            (opacityMult != this.lastColorCacheOpacity) ||
            (Date.now() > this.lastColorCacheTime + minTime * Math.random()) ||
            Math.abs(getDaylightStrengthFrameDiff()) > 0.005) {

            this.lastColorCacheTime = Date.now();
            let outColorBase = this.getColorBase();
            let lightingColor = this.processLighting(true);
            this.frameCacheLighting = lightingColor;
            let outColor = { r: lightingColor.r * outColorBase.r / 255, g: lightingColor.g * outColorBase.g / 255, b: lightingColor.b * outColorBase.b / 255 };
            this.lastColorCacheOpacity = opacityMult;
            this.cachedRgba = rgbToRgba(Math.floor(outColor.r), Math.floor(outColor.g), Math.floor(outColor.b), opacityMult * this.opacity * this.blockHealth ** 0.2);
            this.cachedRgbaParticle = rgbToRgba(Math.floor(outColor.r), Math.floor(outColor.g), Math.floor(outColor.b), .2 * (opacityMult * this.opacity * (this.blockHealth ** 0.2)));
        }
        MAIN_CONTEXT.fillStyle = this.cachedRgba;
        if (this.proto == "WaterSquare" && this.blockHealth < 0.5 && this.speedY > 2) {
            let size = this.blockHealth;
            if (size < 0.3) {
                size = 20 * (this.blockHealth);
            }
            zoomCanvasFillCircle(
                (this.offsetX + this.posX) * getBaseSize(),
                (this.offsetY + this.posY) * getBaseSize(),
                getBaseSize() * Math.max(this.blockHealth, 0.3));
        } else {
            zoomCanvasFillRect(
                (this.offsetX + this.posX) * getBaseSize(),
                (this.offsetY + this.posY) * getBaseSize(),
                getBaseSize(),
                getBaseSize()
            );
        }

        if (this.mixIdx >= (getTargetMixIdx() - getMixArrLen())) {
            MAIN_CONTEXT.font = getBaseSize() + "px courier"
            MAIN_CONTEXT.textAlign = 'center';
            MAIN_CONTEXT.textBaseline = 'middle';
            MAIN_CONTEXT.fillStyle = COLOR_BLACK;
            zoomCanvasSquareText(((this.offsetX + this.posX) + 0.5) * getBaseSize(),
                ((this.offsetY + this.posY) + 0.5) * getBaseSize(),
                this.mixIdx % getMixArrLen());
        }
        // this.renderParticles();
    }
    updatePosition(newPosX, newPosY) {
        if (newPosX == this.posX && newPosY == this.posY) {
            return true;
        }
        newPosX = Math.round(newPosX);
        newPosY = Math.round(newPosY);

        if (getSquares(newPosX, newPosY).some((sq) => this.testCollidesWithSquare(sq))) {
            return false;
        }

        if (newPosX < 0 || newPosX >= loadGD(UI_GAME_MAX_CANVAS_SQUARES_X) || newPosY >= loadGD(UI_GAME_MAX_CANVAS_SQUARES_Y)) {
            this.destroy();
            return;
        }

        this.linkedOrganismSquares.forEach((lsq) => {
            if (lsq != null && lsq.posX != null) {
                lsq.posX = newPosX;
                lsq.posY = newPosY;
            }
        })

        if (this.linkedOrganisms != null) {
            this.linkedOrganisms.forEach((org) => {
                org.posX = newPosX;
                org.posY = newPosY;
            })
        }

        removeSquare(this);
        this.posX = newPosX;
        this.posY = newPosY;
        addSquare(this);

        this.lastColorCacheTime = 0;
        return true;
    }

    _percolateGroup(origGroup = null) {
        if (origGroup != null) {
            if (getNeighbors(this.posX, this.posY).some((sq) => sq.group == origGroup)) {
                return false;
            }
        }

        let toVisit = new Set();
        let visited = new Set();

        getNeighbors(this.posX, this.posY)
            .filter((sq) => sq.proto == this.proto)
            .filter((sq) => sq.posY <= this.posY)
            .filter((sq) => !sq.groupSetThisFrame)
            .forEach((sq) => toVisit.add(sq));

        toVisit.forEach((sq) => {
            if (sq == null || sq in visited) {
                return;
            } else {
                sq.updateGroup(this.group);
                visited.add(sq);
                getNeighbors(sq.posX, sq.posY)
                    .filter((ssq) => ssq.proto == sq.proto)
                    .filter((sq) => !sq.solid || sq.posY <= this.posY)
                    .filter((sq) => !sq.groupSetThisFrame)
                    .forEach((ssq) => toVisit.add(ssq));
            }
        });
        return true;
    }

    updateGroup(newGroup) {
        regSquareToGroup(this.group, -1);
        deregisterSquare(this.posX, this.posY, this.group);
        this.group = newGroup;
        this.groupSetThisFrame = true;
        regSquareToGroup(this.group);
        registerSquare(this.posX, this.posY, this.group);
    }

    calculateGroup() {
        if (this.proto == "SoilSquare") {
            return;
        }
        if (this.group != -1) {
            return;
        }
        this.updateGroup(getNextGroupId());
        regSquareToGroup(this.group);
        this._percolateGroup();
        if (this.proto == "RockSquare") {
            setGroupGrounded(this.group)
        }
    }

    percolateInnerMoisture() { }

    testCollidesWithSquare(sq) {
        if (!this.collision || !sq.collision) {
            return false;
        }
        if (this.proto == "SeedSquare" && sq.proto == "SeedSquare") {
            return false;
        }
        if (this.proto == "WaterSquare" && sq.proto == "WaterSquare" && (getSquares(this.posX, this.posY).filter((sq) => sq.proto == "WaterSquare").map((sq) => sq.blockHealth).reduce((a, b) => a + b, sq.blockHealth) < 1)) {
            return false;
        }
        if (this.organic) {
            if (!sq.solid) {
                return false;
            }
            if (!sq.surface && sq.collision) {
                return true;
            }
            if (sq.collision && sq.currentPressureDirect > 0 && Math.random() > 0.9) {
                return true;
            }
            return false;
        }
        if (sq.proto === this.proto) {
            return true;
        }
        if (this.solid) {
            if (!sq.solid) {
                if (this.surface) {
                    return !((this.waterContainment == this.waterContainmentMax || this.gravity == 0));
                }
                return true;
            }
            return true;
        }
        if (!this.solid) {
            if (sq.organic) {
                return false;
            }
            if ((!sq.solid) && (!this.hasBonked || !sq.hasBonked || this.speedY > 0 || sq.speedY > 0)) {
                return false;
            }
            if (!sq.collision) {
                return false;
            }
            if (!sq.solid) {
                return true;
            } else {
                if ((sq.surface && (sq.waterContainment == sq.waterContainmentMax || sq.gravity == 0))) {
                    return false;
                }
                return true;
            }
        }
        return true;
    }

    getNutrientRate(proto) {
        if (this.cachedNutrientRateSquares == this.linkedOrganismSquares.length) {
            return this.cachedNutrientRate;
        } else {
            this.cachedNutrientRate = 2 / (this.linkedOrganismSquares
                .filter((lsq) => lsq != null && lsq.linkedOrganism.proto == proto)
                .map((lsq) => 1)
                .reduce((a, b) => a + b, 1));
            this.cachedNutrientRateSquares = this.linkedOrganismSquares.length;
            return this.cachedNutrientRate;
        }
    }

    shouldFallThisFrame() {
        if (!this.physicsEnabled) {
            return false;
        }
        if (this.gravity == 0) {
            return false;
        }
        if (this.proto == "SoilSquare" && (this.linkedOrganismSquares.some((lsq) => lsq.type == "root"))) {
            return false;
        }
        return true;
    }

    getNextPath() {
        let gnpf = (v) => Math.max(1, Math.abs(v));
        let f = gnpf(this.speedX) * gnpf(this.speedY);

        let dsx = this.speedX / f;
        let dsy = this.speedY / f;

        let csx = 0;
        let csy = 0;

        let rcsx = 0;
        let rcsy = 0;

        let last, collSquare;

        let pathArr = new Array();
        pathArr.push([this.posX, this.posY]);

        for (let i = 0; i < f; i++) {
            csx += dsx;
            csy += dsy;

            rcsx = Math.round(csx) + this.posX;
            rcsy = Math.round(csy) + this.posY;

            last = pathArr[pathArr.length - 1];

            if (rcsx == last[0] && rcsy == last[1])
                continue;

            collSquare = getSquares(rcsx, rcsy).find((sq) => sq.testCollidesWithSquare(this));

            if (collSquare != null) {
                return [collSquare, pathArr];
            }

            pathArr.push([rcsx, rcsy]);
        }

        return [null, pathArr];
    }

    gravityPhysics() {
        if (!this.shouldFallThisFrame()) {
            return;
        }
        
        if (getTimeScale() != 0) {
            if (this.shouldFallThisFrame()) {
                this.speedY += (1 / this.gravity);
            }
        }

        let shouldResetGroup = false;
        if (isGroupGrounded(this.group) && this.currentPressureDirect > 10) {
            if ((Math.random() * 1.5) < 1 - (1 / this.currentPressureDirect) && !getSquares(this.posX, this.posY + 2).some((sq) => sq.testCollidesWithSquare(this))) {
                return;
            }
            shouldResetGroup = true;
        }

        let maxSpeed = 5;

        this.speedX = Math.min(maxSpeed, Math.max(-maxSpeed, this.speedX));
        this.speedY = Math.min(maxSpeed, Math.max(-maxSpeed, this.speedY));

        let nextPathRes = this.getNextPath();

        let colSq = nextPathRes[0];
        let nextPath = nextPathRes[1];

        if (colSq != null) {
            this.speedX = colSq.speedX;
            this.speedY = colSq.speedY;
            this.hasBonked = true;
        }

        let nextPos = nextPath.at(nextPath.length - 1);

        let finalXPos = nextPos[0];
        let finalYPos = nextPos[1];

        if (finalXPos != this.posX || this.posY != finalYPos) {
            let finalYPosFloor = Math.floor(finalYPos);
            let finalYPosFrac = finalYPos - finalYPosFloor;
            this.offsetY = finalYPosFrac;
            this.updatePosition(finalXPos, finalYPosFloor);

            if (!this.solid) {
                shouldResetGroup = true;
            }

            if (shouldResetGroup) {
                let origGroup = this.group;
                this.group = getNextGroupId();
                if (!this._percolateGroup(origGroup)) {
                    this.group = origGroup;
                };
            }
        }

        if (!isSquareOnCanvas(this.posX, this.posY)) {
            if (this.proto == "WaterSquare" || this.proto == "SeedSquare")
                this.destroy();
        }


    }

    _gravityPhysics() {
        if (!this.shouldFallThisFrame()) {
            return;
        }
        if (!this.organic && this.speedY >= 0) {
            if (getSquares(this.posX, this.posY + 1).some((sq) => sq.testCollidesWithSquare(this))) {
                this.speedY = 0;
                this.speedX = 0;
                this.hasBonked = true;
                return;
            }
        }

        if (Math.abs(this.speedX * this.speedY) > 2) {
            console.log(this.getNextPath());
        }
        let shouldResetGroup = false;
        if (isGroupGrounded(this.group) && this.currentPressureDirect > 10) {
            if ((Math.random() * 1.5) < 1 - (1 / this.currentPressureDirect) && !getSquares(this.posX, this.posY + 2).some((sq) => sq.testCollidesWithSquare(this))) {
                return;
            }
            shouldResetGroup = true;
        }

        if (getTimeScale() != 0) {
            if (this.shouldFallThisFrame()) {
                this.speedY += (1 / this.gravity);
            }
        }
        let finalXPos = this.posX;
        let finalYPos = this.posY;
        let bonked = false;
        let particleSpeed = Math.sqrt(this.speedX ** 2 + this.speedY ** 2);
        for (let i = 1; i < this.speedY + 1; i += 1) {
            for (let j = 0; j < Math.abs(this.speedX) + 1; j++) {
                let jSigned = (this.speedX > 0) ? j : -j;
                let jSignedMinusOne = (this.speedX == 0 ? 0 : (this.speedX > 0) ? (j - 1) : -(j - 1));
                let bonkSquare = getSquares(this.posX + jSigned, this.posY + i)
                    .find((sq) => this.testCollidesWithSquare(sq) ||
                        (this.proto == "WaterSquare" && sq.proto == "SoilSquare" && Math.random() > (1 / sq.getWaterflowRate())));
                if (bonkSquare) {
                    finalYPos = this.posY + (i - 1);
                    finalXPos = this.posX + jSignedMinusOne;
                    this.speedX = bonkSquare.speedX;
                    this.speedY = bonkSquare.speedY;
                    this.offsetY = 0;
                    bonked = true;
                    this.hasBonked = true;
                    if (bonkSquare.proto == this.proto || (this.sand != null && bonkSquare.sand != null)) {
                        this.group = bonkSquare.group;
                    };
                    if (this.lighting.length == 0 && loadGD(UI_LIGHTING_ENABLED)) {
                        this.initLightingFromNeighbors();
                    }
                    if (!this.solid) {
                        if (getSquares(this.posX + jSigned, this.posY + i)
                            .filter((sq) => sq.proto == this.proto)
                            .filter((sq) => sq.blockHealth + this.blockHealth < sq.blockHealthMax)
                            .some((sq) => {
                                sq.blockHealth = sq.blockHealth + this.blockHealth;
                                this.destroy();
                                return true;
                            })) {
                            return;
                        }
                    }
                }
                if (bonked)
                    break;
            } if (bonked)
                break;
        }
        if (!bonked) {
            finalXPos = this.posX + this.speedX;
            finalYPos = this.posY + this.speedY;
        }

        let maxY = loadGD(UI_GAME_MAX_CANVAS_SQUARES_Y);
        if (!this.solid) {
            maxY = getFrameYMax();
        }

        if (finalXPos < 0 || finalXPos > loadGD(UI_GAME_MAX_CANVAS_SQUARES_X) || finalYPos < 0 || finalYPos >= maxY) {
            this.destroy(true);
            return;
        }

        if (finalXPos != this.posX | this.posY != finalYPos) {
            let finalYPosFloor = Math.floor(finalYPos);
            let finalYPosFrac = finalYPos - finalYPosFloor;
            this.offsetY = finalYPosFrac;
            this.updatePosition(finalXPos, finalYPosFloor);

            if (!this.solid) {
                shouldResetGroup = true;
            }

            if (shouldResetGroup) {
                let origGroup = this.group;
                this.group = getNextGroupId();
                if (!this._percolateGroup(origGroup)) {
                    this.group = origGroup;
                };
            }
            if (bonked) {
                this.triggerParticles(particleSpeed);
            }
        }
        this.processParticles();
    }

    slopePhysics() { }

    windPhysics() {
        if (this.linkedOrganismSquares.length > 0) {
            return;
        }
        let ws = getWindSpeedAtLocation(this.posX, this.posY);
        let maxWindSpeed = 2;

        let wx = Math.min(Math.max(ws[0], -maxWindSpeed), maxWindSpeed);
        let wy = Math.min(Math.max(ws[1], -maxWindSpeed), maxWindSpeed);

        let px = Math.abs(wx) / maxWindSpeed;
        let py = Math.abs(wy) / maxWindSpeed;

        let factor = 1;

        if (Math.random() < px) {
            this.speedX += factor * Math.round(wx);
        }
        if (Math.random() < py) {
            this.speedY += factor * Math.round(wy);
        }

        let sxs = (this.speedX > 0) ? 1 : -1;
        let sys = (this.speedY > 0) ? 1 : -1;

        if (getSquares(this.posX + sxs, this.posY).filter((sq) => (sq.speedX != this.speedX)).some((sq) => sq.testCollidesWithSquare(this))) {
            this.speedX = 0;
        }
        if (getSquares(this.posX, this.posY + sys).filter((sq) => (sq.speedY != this.speedY)).some((sq) => sq.testCollidesWithSquare(this))) {
            this.speedY = 0;
        }
            
    }

    physics() {
        if (!isSquareOnCanvas(this.posX, this.posY)) {
            return;
        }

        if (getTimeScale() != 0) {
            this.slopePhysics();
            this.gravityPhysics();
            this.windPhysics();
            this.percolateInnerMoisture();
            if (this.speedY > 0) {
                if (loadGD(UI_SIMULATION_CLOUDS)) {
                    // this.waterEvaporationRoutine();
                    // this.temperatureRoutine();
                }
                if (loadGD(UI_LIGHTING_ENABLED)) {
                    // this.transferHeat();
                    // this.processFrameLightingTemperature();
                }
            }
        }
        this.processParticles();
    }

    /* Called before physics(), with blocks in strict order from top left to bottom right. */
    physicsBefore() {
        this.calculateGroup();
        this.calculateDirectPressure();
    }

    percolateFromWater(waterBlock) {
        return 0;
    }

    calculateDirectPressure() {
        if (this.gravity == 0) {
            this.currentPressureDirect = 0;
            return this.currentPressureDirect;
        }

        if (
            (!isSqColChanged(this.posX) || this.posY > getSqColChangeLocation(this.posX))
            && Math.random() < 0.95
            && this.currentPressureDirect != -1
        ) {
            return this.currentPressureDirect;
        }
        let filtered = getSquares(this.posX, this.posY - 1)
            .find((sq) => sq.proto == this.proto);
        if (filtered != null) {
            this.currentPressureDirect = filtered.calculateDirectPressure() + 1;
        } else {
            this.currentPressureDirect = 0;
        }
        return this.currentPressureDirect;
    }

    transferHeat() {
        if (Math.random() < 0.75) {
            return;
        }
        getNeighbors(this.posX, this.posY)
            .filter((sq) => sq.collision)
            .forEach((sq) => {
                let diff = this.temperature - sq.temperature;
                diff /= 8;
                this.temperature -= diff / this.thermalMass;
                sq.temperature += diff / sq.thermalMass;
            })
    }

}

