
import { getSquares } from "../_sqOperations.js";
import { hexToRgb } from "../../common.js";
import { addSquareByName, CANVAS_SQUARES_Y } from "../../index.js";
import { SoilSquare } from "./SoilSquare.js";
import { getRockLightDecayFactor } from "../../lighting/lighting.js";
import { getActiveClimate } from "../../climateManager.js";
import { loadUI, UI_LIGHTING_ROCK, UI_ROCK_COMPOSITION } from "../../ui/UIData.js";


export function getBaseRockColor(sand, silt, clay) {
    let clayColorRgb = getActiveClimate().rockColorClay;
    let siltColorRgb = getActiveClimate().rockColorSilt;
    let sandColorRgb = getActiveClimate().rockColorSand;
    return {
        r: clay * clayColorRgb.r + silt * siltColorRgb.r + sand * sandColorRgb.r, 
        g: clay * clayColorRgb.g + silt * siltColorRgb.g + sand * sandColorRgb.g, 
        b: clay * clayColorRgb.b + silt * siltColorRgb.b + sand * sandColorRgb.b
    }
}

export class RockSquare extends SoilSquare {
    constructor(posX, posY) {
        super(posX, posY);
        this.proto = "RockSquare";
        this.gravity = 0;

        this.clayColorRgb = getActiveClimate().rockColorClay;
        this.siltColorRgb = getActiveClimate().rockColorSilt;
        this.sandColorRgb = getActiveClimate().rockColorSand;
    }

    getColorBase() {
        var outColor = getBaseRockColor(this.sand, this.silt, this.clay);
        var darkeningColorMult = (this.waterContainment / this.waterContainmentMax);

        outColor.r *= (1 - 0.24 * darkeningColorMult);
        outColor.g *= (1 - 0.30 * darkeningColorMult);
        outColor.b *= (1 - 0.383 * darkeningColorMult);
        return outColor;
    }

    setVariant() {
        let arr = loadUI(UI_ROCK_COMPOSITION);
        this.sand = arr[0];
        this.silt = arr[1];
        this.clay = arr[2];
        this.randomize();
    }

    initWaterContainment() {
        this.waterContainment = 0;
    }

    lightFilterRate() {
        return super.lightFilterRate() * loadUI(UI_LIGHTING_ROCK);
    }

    doBlockOutflow() {
        super.doBlockOutflow();
        var thisWaterPressure = this.getMatricPressure(); 
        if (thisWaterPressure < -2) {
            return;
        }

        if (getSquares(this.posX, this.posY + 1).some((sq) => sq.collision)) {
            return;
        }

        var pressureToOutflowWaterContainment = this.getInverseMatricPressure(thisWaterPressure + 2);
        var diff = (this.waterContainment - pressureToOutflowWaterContainment) / this.getWaterflowRate();
        diff *= Math.abs(thisWaterPressure - -2);
        if ((this.posY + 1) >= CANVAS_SQUARES_Y) {
            this.waterContainment -= diff;
        } else {
            var newWater = addSquareByName(this.posX, this.posY + 1, "water");
            if (newWater) {
                newWater.blockHealth = diff;
                this.waterContainment -= diff;
            }
        }
    }
}