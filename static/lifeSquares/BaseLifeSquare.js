import { MAIN_CONTEXT } from "../index.js";
import { hexToRgb, hsv2rgb, rgb2hsv, rgbToHex, rgbToRgba } from "../common.js";

import { getCurTime } from "../climate/time.js";
import { addSquare, getSquares } from "../squares/_sqOperations.js";

import { RGB_COLOR_BLUE, RGB_COLOR_BROWN, RGB_COLOR_OTHER_BLUE, RGB_COLOR_RED, RGB_COLOR_GREEN } from "../colors.js";
import { removeSquare } from "../globalOperations.js";
import { STATE_HEALTHY, STATE_DESTROYED, STAGE_DEAD } from "../organisms/Stages.js";
import { processLighting } from "../lighting/lightingProcessing.js";
import { getBaseSize, zoomCanvasFillRectTheta } from "../canvas.js";
import { loadGD, UI_LIGHTING_PLANT, UI_VIEWMODE_MOISTURE, UI_VIEWMODE_NITROGEN, UI_VIEWMODE_ORGANISMS, UI_VIEWMODE_SELECT } from "../ui/UIData.js";


class BaseLifeSquare {
    constructor(square, organism) {
        this.proto = "BaseLifeSquare";
        this.posX = square.posX;
        this.posY = square.posY;
        this.xOffset = 0;
        this.yOffset = 0;
        this.xRef = 0;
        this.yRef = 0;
        this.type = "base";
        this.subtype = "";
        this.theta = 0;

        this.lightHealth = 1;
        this.prevLightHealth = 1;

        this.baseColor = "#515c24";
        this.darkColor = "#353b1a";
        this.accentColor = "#5d6637";

        this.baseColor_rgb = hexToRgb(this.baseColor); 
        this.darkColor_rgb = hexToRgb(this.darkColor); 
        this.accentColor_rgb = hexToRgb(this.accentColor); 

        this.baseColorAmount = 33;
        this.darkColorAmount = 33;
        this.accentColorAmount = 33;

        this.spawnTime = getCurTime();

        this.deflectionStrength = 0;
        this.deflectionXOffset = 0;
        this.deflectionYOffset = 0;

        this.linkedSquare = square;
        this.linkedOrganism = organism;
        this.spawnedEntityId = organism.spawnedEntityId;
        this.childLifeSquares = new Array();

        if (square.organic) {
            square.spawnedEntityId = organism.spawnedEntityId;
            square.linkOrganismSquare(this);
        }

        this.strength = 1;

        this.state = STATE_HEALTHY;
        this.activeRenderState = null;

        this.opacity = 1;
        this.width = 1;
        this.height = 1;
        this.strength = 1;
        this.xOffset = 0;
        this.randoms = [];

        this.cachedRgba = null;

        this.distToFront = 0;
        this.component = null;

        this.LSQ_RENDER_SIZE_MULT = Math.SQRT2;

        this.lighting = [];
        this.touchingGround = null;


    }

    getLightFilterRate() {
        return 0.00023 * (this.width ** 2) * Math.exp(loadGD(UI_LIGHTING_PLANT));
    }

    getLsqRenderSizeMult() {
        if (this.type == "green") {
            return this.LSQ_RENDER_SIZE_MULT;
        } else {
            return 1;
        }
    }

    makeRandomsSimilar(otherSquare) {
        for (let i = 0; i < this.randoms.length; i++) {
            this.randoms[i] = otherSquare.randoms[i] * 0.9 + this.randoms[i] * 0.1;
        }
    }

    updatePositionDifferential(dx, dy) {
        removeSquare(this.linkedSquare);
        this.posX += dx;
        this.posY += dy;
        addSquare(this.linkedSquare);
    }

    shiftUp() {
        this.updatePositionDifferential(0, -1);
    }

    dist(testX, testY) { // manhattan
        return Math.abs(this.posX - testX) + Math.abs(this.posY - testY);
    }

    addChild(lifeSquare) {
        lifeSquare.deflectionXOffset = this.deflectionXOffset;
        lifeSquare.deflectionYOffset = this.deflectionYOffset;
        lifeSquare.lighting = this.lighting;
    }

    removeChild(lifeSquare) {
        this.childLifeSquares = Array.from(this.childLifeSquares.filter((lsq) => lsq != lifeSquare));
    }

    linkSquare(square) {
        this.linkedSquare = square;
    }
    unlinkSquare() {
        this.linkedSquare = null;
    }
    destroy() {
        if (this.linkedSquare != null) {
            if (this.linkedSquare.organic) {
                this.linkedSquare.destroy();
            } else {
                this.linkedSquare.unlinkOrganismSquare(this);
            }
        }
        this.lighting = [];
    }

    getStaticRand(randIdx) {
        while (randIdx > this.randoms.length - 1) {
            this.randoms.push(Math.random());
        }
        return this.randoms[randIdx];
    }
    
    calculateWidthXOffset() {
        return -(0.5 - (this.width / 2));
    }
    getPosX() {
        return this.posX - (this.deflectionXOffset + this.xOffset + this.calculateWidthXOffset());
    }

    getPosY() {
        return this.posY - (this.deflectionYOffset + this.yOffset);
    }

    applySubtypeRenderConfig() {

    }

    processLightHealth(rgb) {
        let hsv = rgb2hsv(rgb.r, rgb.g, rgb.b);
        hsv[1] *= this.lightHealth;
        let rgbArr = hsv2rgb(...hsv);
        return {r: rgbArr[0], g: rgbArr[1], b: rgbArr[2]};
    }

    subtypeColorUpdate() {
        if (this.type == "root") {
            return;
        }
        
        this.applySubtypeRenderConfig();
        this.activeRenderSubtype = this.subtype;
        this.activeRenderState = this.state;
        this.prevLightHealth = this.lightHealth;
        this.baseColor_rgb = this.processLightHealth(hexToRgb(this.baseColor));
        this.darkColor_rgb = this.processLightHealth(hexToRgb(this.darkColor));
        this.accentColor_rgb = this.processLightHealth(hexToRgb(this.accentColor));
    }

    render() {
        let frameOpacity = this.opacity;
        if (this.lightHealth != this.prevLightHealth || this.activeRenderSubtype != this.subtype || this.activeRenderState != this.state) {
            this.subtypeColorUpdate();
        }
        if (this.linkedOrganism.stage == STAGE_DEAD) {
            frameOpacity *= 1 - this.linkedOrganism.deathProgress; 
        }
        let selectedViewMode = loadGD(UI_VIEWMODE_SELECT);
        if (selectedViewMode == UI_VIEWMODE_NITROGEN) {
            let color = {
                r: 100 + (1 - this.nitrogenIndicated) * 130,
                g: 100 + (1 - this.lightlevelIndicated) * 130,
                b: 100 + (1 - this.phosphorusIndicated) * 130
            }
            MAIN_CONTEXT.fillStyle = rgbToHex(color.r, color.g, color.b);
            zoomCanvasFillRectTheta(
                this.getPosX() * getBaseSize(),
                this.getPosY() * getBaseSize(),
                this.width * getBaseSize() * this.getLsqRenderSizeMult(),
                this.height * getBaseSize() * this.getLsqRenderSizeMult(),
                this.xRef,
                this.yRef,
                this.theta
            );
            return;
        }
        else if (selectedViewMode == UI_VIEWMODE_MOISTURE) {
            let color1 = null;
            let color2 = null;

            let val = this.linkedOrganism.getWilt();
            let valMin, valMax;

            if (val > 0) {
                color1 = RGB_COLOR_OTHER_BLUE;
                color2 = RGB_COLOR_GREEN;
                valMin = 0;
                valMax = 1;
            } else {
                color1 = RGB_COLOR_GREEN;
                color2 = RGB_COLOR_RED;
                valMin = -1;
                valMax = 0;
            }
            let valInvLerp = (val - valMin) / (valMax - valMin);
            let out = {
                r: color1.r * valInvLerp + color2.r * (1 - valInvLerp),
                g: color1.g * valInvLerp + color2.g * (1 - valInvLerp),
                b: color1.b * valInvLerp + color2.b * (1 - valInvLerp),
            }

            MAIN_CONTEXT.fillStyle = rgbToRgba(out.r, out.g, out.b, frameOpacity);
            zoomCanvasFillRectTheta(
                this.getPosX() * getBaseSize(),
                this.getPosY() * getBaseSize(),
                this.width * getBaseSize() * this.getLsqRenderSizeMult(),
                this.height * getBaseSize() * this.getLsqRenderSizeMult(),
                this.xRef,
                this.yRef,
                this.theta
            );
            return;
        }
        else {
            let res = this.getStaticRand(1) * this.accentColorAmount + this.darkColorAmount + this.baseColorAmount;
            let baseColor = null;
            let altColor1 = null;
            let altColor2 = null;
            if (res < this.accentColorAmount) {
                baseColor = this.accentColor_rgb;
                altColor1 = this.darkColor_rgb;
                altColor2 = this.baseColor_rgb;
            } else if (res < this.accentColorAmount + this.darkColorAmount) {
                baseColor = this.accentColor_rgb;
                altColor1 = this.baseColor_rgb;
                altColor2 = this.darkColor_rgb;
            } else {
                altColor1 = this.accentColor_rgb;
                altColor2 = this.darkColor_rgb;
                baseColor = this.baseColor_rgb;
            }

            let rand = this.getStaticRand(2);
            // the '0.1' is the base darkness
            let outColorBase = {
                r: (baseColor.r * 0.5 + ((altColor1.r * rand + altColor2.r * (1 - rand)) * 0.5)),
                g: (baseColor.g * 0.5 + ((altColor1.g * rand + altColor2.g * (1 - rand)) * 0.5)),
                b: (baseColor.b * 0.5 + ((altColor1.b * rand + altColor2.b * (1 - rand)) * 0.5))
            }
            let lightingColor; 
            if (this.type == "root")
                lightingColor = processLighting(this.linkedSquare.lighting);
            else    
                lightingColor = processLighting(this.lighting);
            
            let outColor = { r: lightingColor.r * outColorBase.r / 255, g: lightingColor.g * outColorBase.g / 255, b: lightingColor.b * outColorBase.b / 255 };
            
            if (selectedViewMode == UI_VIEWMODE_ORGANISMS) {
                frameOpacity = Math.max(0.25, this.opacity);
            }
            let outRgba = rgbToRgba(Math.floor(outColor.r), Math.floor(outColor.g), Math.floor(outColor.b), frameOpacity);
            MAIN_CONTEXT.fillStyle = outRgba;

            zoomCanvasFillRectTheta(
                this.getPosX() * getBaseSize(),
                this.getPosY() * getBaseSize(),
                this.width * getBaseSize() * this.getLsqRenderSizeMult(),
                this.height * getBaseSize() * this.getLsqRenderSizeMult(),
                this.xRef,
                this.yRef,
                this.theta
            );
        }

    }

    calculateColor() {
        let baseColorRGB = hexToRgb(this.colorBase);
        return rgbToHex(Math.floor(baseColorRGB.r), Math.floor(baseColorRGB.g), Math.floor(baseColorRGB.b));
    }

    setSpawnedEntityId(id) {
        this.spawnedEntityId = id;
        if (this.linkedSquare != null) {
            this.linkedSquare.spawnedEntityId = id;
        }
    }

    getMinNutrient() {
        return Math.min(Math.min(this.airNutrients, this.dirtNutrients), this.waterNutrients);
    }

    getMaxNutrient() {
        return Math.max(Math.max(this.airNutrients, this.dirtNutrients), this.waterNutrients);
    }
    getMeanNutrient() {
        return (this.airNutrients + this.dirtNutrients + this.waterNutrients) / 3;
    }

}
export { BaseLifeSquare };