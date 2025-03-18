import { MAIN_CONTEXT } from "../index.js";
import { hexToRgb, rgbToHex, rgbToRgba } from "../common.js";

import { getCurTime } from "../climate/time.js";
import { addSquare, getSquares, removeOrganismSquare } from "../squares/_sqOperations.js";

import { RGB_COLOR_BLUE, RGB_COLOR_BROWN, RGB_COLOR_OTHER_BLUE, RGB_COLOR_RED } from "../colors.js";
import { addOrganismSquare } from "./_lsOperations.js";
import { removeSquare } from "../globalOperations.js";
import { STATE_DEAD, STATE_HEALTHY, STATE_THIRSTY, SUBTYPE_TRUNK, SUBTYPE_LEAF, SUBTYPE_NODE, SUBTYPE_SHOOT, SUBTYPE_SPROUT, SUBTYPE_STEM, STATE_DESTROYED, SUBTYPE_FLOWER } from "../organisms/Stages.js";
import { processLighting } from "../lighting/lightingProcessing.js";
import { getBaseSize, zoomCanvasFillRect, zoomCanvasFillRectTheta } from "../canvas.js";
import { loadUI, UI_LIGHTING_PLANT, UI_VIEWMODE_MOISTURE, UI_VIEWMODE_NITROGEN, UI_VIEWMODE_SELECT } from "../ui/UIData.js";


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

        this.baseColor = "#515c24";
        this.darkColor = "#353b1a";
        this.accentColor = "#5d6637";

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

    groundTouchSquare() {
        if (this.touchingGround != null) {
            return this.touchingGround;
        }
        this.touchingGround = getSquares(Math.floor(this.getPosX()), Math.floor(this.getPosY())).find((sq) => sq.collision && sq.solid);
        return this.touchingGround;
    }

    doGroundDecay() {
        var sq = this.groundTouchSquare();
        if (sq != null) {
            sq.nitrogen += this.linkedOrganism.getDecayNitrogen();
            sq.phosphorus += this.linkedOrganism.getDecayPhosphorus();
            this.linkedOrganism.removeAssociatedLifeSquare(this);
            this.state = STATE_DESTROYED;
        }
    }

    getLightFilterRate() {
        return 0.0015 * (this.width ** 2) * loadUI(UI_LIGHTING_PLANT);
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
        removeOrganismSquare(this);
        removeSquare(this.linkedSquare);
        this.posX += dx;
        this.posY += dy;
        addOrganismSquare(this);
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
        removeOrganismSquare(this);
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

    subtypeColorUpdate() {
        if (this.type == "root") {
            return;
        }
        
        this.applySubtypeRenderConfig();
        this.activeRenderSubtype = this.subtype;
        this.activeRenderState = this.state;
        this.baseColor_rgb = hexToRgb(this.baseColor);
        this.darkColor_rgb = hexToRgb(this.darkColor);
        this.accentColor_rgb = hexToRgb(this.accentColor);
    }

    render() {
        if (this.activeRenderSubtype != this.subtype || this.activeRenderState != this.state) {
            this.subtypeColorUpdate();
        }
        let selectedViewMode = loadUI(UI_VIEWMODE_SELECT);
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
            var color1 = null;
            var color2 = null;

            var val = this.linkedOrganism.waterPressure;
            var valMin = -100;
            var valMax = 0;

            if (this.linkedOrganism.waterPressure > -2) {
                color1 = RGB_COLOR_BLUE;
                color2 = RGB_COLOR_OTHER_BLUE;
                valMin = this.linkedOrganism.waterPressureTarget;
                valMax = this.linkedOrganism.waterPressureOverwaterThresh;

            } else if (this.linkedOrganism.waterPressure > this.linkedOrganism.waterPressureWiltThresh) {
                color1 = RGB_COLOR_OTHER_BLUE;
                color2 = RGB_COLOR_BROWN;
                valMin = this.linkedOrganism.waterPressureWiltThresh;
                valMax = this.linkedOrganism.waterPressureTarget;
            } else {
                color1 = RGB_COLOR_BROWN;
                color2 = RGB_COLOR_RED;
                valMin = this.linkedOrganism.waterPressureDieThresh;
                valMax = this.linkedOrganism.waterPressureWiltThresh;
            }


            val = Math.max(valMin, val);
            val = Math.min(valMax, val);

            var valInvLerp = (val - valMin) / (valMax - valMin);
            var out = {
                r: color1.r * valInvLerp + color2.r * (1 - valInvLerp),
                g: color1.g * valInvLerp + color2.g * (1 - valInvLerp),
                b: color1.b * valInvLerp + color2.b * (1 - valInvLerp),
            }


            MAIN_CONTEXT.fillStyle = rgbToRgba(out.r, out.g, out.b, this.opacity);
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
            var res = this.getStaticRand(1) * this.accentColorAmount + this.darkColorAmount + this.baseColorAmount;
            var primaryColor = null;
            var altColor1 = null;
            var altColor2 = null;
            if (res < this.accentColorAmount) {
                primaryColor = this.accentColor;
                altColor1 = this.darkColor;
                altColor2 = this.colorBase;
            } else if (res < this.accentColorAmount + this.darkColorAmount) {
                primaryColor = this.accentColor;
                altColor1 = this.baseColor;
                altColor2 = this.darkColor;
            } else {
                altColor1 = this.accentColor;
                altColor2 = this.darkColor;
                primaryColor = this.baseColor;
            }

            var rand = this.getStaticRand(2);
            var baseColorRgb = hexToRgb(primaryColor);
            var altColor1Rgb = hexToRgb(altColor1);
            var altColor2Rgb = hexToRgb(altColor2);

            // the '0.1' is the base darkness
            var outColorBase = {
                r: (baseColorRgb.r * 0.5 + ((altColor1Rgb.r * rand + altColor2Rgb.r * (1 - rand)) * 0.5)),
                g: (baseColorRgb.g * 0.5 + ((altColor1Rgb.g * rand + altColor2Rgb.g * (1 - rand)) * 0.5)),
                b: (baseColorRgb.b * 0.5 + ((altColor1Rgb.b * rand + altColor2Rgb.b * (1 - rand)) * 0.5))
            }
            var lightingColor = processLighting(this.lighting);
            var outColor = { r: lightingColor.r * outColorBase.r / 255, g: lightingColor.g * outColorBase.g / 255, b: lightingColor.b * outColorBase.b / 255 };
            
            var opacity = this.opacity;
            if (selectedViewMode == "organismStructure") {
                opacity = Math.max(0.25, this.opacity);
            }
            var outRgba = rgbToRgba(Math.floor(outColor.r), Math.floor(outColor.g), Math.floor(outColor.b), opacity);
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
        var baseColorRGB = hexToRgb(this.colorBase);
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