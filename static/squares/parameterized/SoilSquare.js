import { BaseSquare } from "../BaseSqaure.js";
import { getNeighbors, getSquares } from "../_sqOperations.js";
import { hexToRgb } from "../../common.js";
import { getCurTimeScale, timeScaleFactor } from "../../climate/time.js";
import { getPressure, getWindSquareAbove } from "../../climate/wind.js";
import { addWaterSaturationPascals, getWaterSaturation, pascalsPerWaterSquare, saturationPressureOfWaterVapor } from "../../climate/temperatureHumidity.js";
import { loadGD, UI_PALETTE_COMPOSITION, UI_PALETTE_SOILIDX, UI_SOIL_COMPOSITION, UI_SOIL_INITALWATER } from "../../ui/UIData.js";
import { getActiveClimate } from "../../climate/climateManager.js";
import { addSquareByName } from "../../manipulation.js";

// maps in form "water containment" / "matric pressure in atmospheres"
export const clayMatricPressureMap = [
    [0, -7],
    [0.28, -4.2],
    [0.45, -2.5],
    [0.48, -2],
    [0.49, 0]
];
export const siltMatricPressureMap = [
    [0, -7],
    [0.09, -4.2],
    [0.15, -2.3],
    [0.26, -2],
    [0.42, 0]
];
export const sandMatricPressureMap = [
    [0, -7],
    [0.06, -2],
    [0.40, 0]
]

// https://docs.google.com/spreadsheets/d/1MWOde96t-ruC5k1PLL4nex0iBjdyXKOkY7g59cnaEj4/edit?gid=0#gid=0
export function getBasePercolationRate(sand, silt, clay) {
    let clayRate = 2;
    let siltRate = 1.5;
    let sandRate = 0.92;
    let power = 10;
    return (sand * sandRate +
        silt * siltRate +
        clay * clayRate) ** power;
}

export function getBaseNutrientRate(sand, silt, clay) {
    return sand + silt * 2 + clay * 4
}

export class SoilSquare extends BaseSquare {
    constructor(posX, posY) {
        super(posX, posY);
        this.proto = "SoilSquare";
        this.colorBase = "#B06C49";
        this.rootable = true;

        this.clayColorRgb = getActiveClimate().clayColorRgb;
        this.siltColorRgb = getActiveClimate().siltColorRgb;
        this.sandColorRgb = getActiveClimate().sandColorRgb;

        this.lightDarkeningColor = hexToRgb("#3C3A04");
        this.moonlightColor = hexToRgb("#F0F8FF");

        this.colorVariant = loadGD(UI_PALETTE_SOILIDX) % getActiveClimate().soilColors.length;

        // generic loam
        this.sand = 0.40;
        this.silt = 0.40;
        this.clay = 0.20;
        // nutrients normalized to "pounds per acre" per farming websites
        this.ph = 7;
        this.nitrogen = 50;
        this.phosphorus = 25;

        this.setVariant();
    }

    reset() {
        super.reset();
    }

    setVariant() {
        let arr = loadGD(UI_PALETTE_COMPOSITION);
        this.sand = arr[0];
        this.silt = arr[1];
        this.clay = arr[2];
        this.randomize();
    }

    randomize() {
        let rand1 = (Math.random() - 0.5) * 0.3;
        let rand2 = (Math.random() - 0.5) * 0.3;
        let rand3 = (Math.random() - 0.5) * 0.3;
        this.clay *= (1 + rand1);
        this.silt *= (1 + rand2);
        this.sand *= (1 + rand3);

        let sum = this.clay + this.silt + this.sand;

        this.clay *= (1 / sum);
        this.silt *= (1 / sum);
        this.sand *= (1 / sum);

        this.clay = Math.min(Math.max(this.clay, 0), 1);
        this.silt = Math.min(Math.max(this.silt, 0), 1);
        this.sand = Math.min(Math.max(this.sand, 0), 1);

        this.initWaterContainment();
    }

    initWaterContainment() {
        this.waterContainment = this.getInverseMatricPressure(loadGD(UI_SOIL_INITALWATER));
    }

    getInversePressureGeneric(waterContainment, refArr) {
        return this.getPressureGeneric(waterContainment, Array.from(refArr.map((vec) => [vec[1], vec[0]])));
    }

    getPressureGeneric(waterContainment, refArr) {
        if (refArr.length === 0) {
            return 0;
        }
    
        let lower = refArr[0];
        let upper = refArr[refArr.length - 1];

        if (waterContainment <= lower[0]) {
            return lower[1];
        }
        if (waterContainment >= upper[0]) {
            return upper[1];
        }
    
        for (let i = 0; i < refArr.length; i++) {
            let entry = refArr[i];
            if (entry[0] < waterContainment && entry[0] > lower[0]) {
                lower = entry;
            }
            if (entry[0] > waterContainment && entry[0] < upper[0]) {
                upper = entry;
            }
        }
    
        let t = (waterContainment - lower[0]) / (upper[0] - lower[0]);
        let interpolated = lower[1] + t * (upper[1] - lower[1]);
        return interpolated;
    }
    
    getInverseMatricPressure(waterPressure) {
        return (
            this.clay * this.getInversePressureGeneric(waterPressure, clayMatricPressureMap)
             + this.silt * this.getInversePressureGeneric(waterPressure, siltMatricPressureMap)
             + this.sand * this.getInversePressureGeneric(waterPressure, sandMatricPressureMap)
        )
    }

    getMatricPressure(waterContainment) {
        return (
            this.clay * this.getPressureGeneric(waterContainment, clayMatricPressureMap)
             + this.silt * this.getPressureGeneric(waterContainment, siltMatricPressureMap)
             + this.sand * this.getPressureGeneric(waterContainment, sandMatricPressureMap)
        )
    }
    getGravitationalPressure() {
        return -0.02 * 9.8 * this.posY; 
    }

    getSoilWaterPressure() {
        return this.getMatricPressure(this.waterContainment);
    }

    percolateInnerMoisture() {
        let saturatedNeighbors = 0;
        let unsaturatedNeighbors = 0;

        getNeighbors(this.posX, this.posY)
            .filter((sq) => sq.proto == this.proto)
            .filter((sq) => {
                if (sq.waterContainment < sq.waterContainmentMax) {
                    unsaturatedNeighbors += 1;
                    return true;
                } else {
                    saturatedNeighbors += 1;
                    return false;
                }})
            .forEach((sq) => {
                let thisWaterPressure = this.getMatricPressure(this.waterContainment);
                let sqWaterPressure = sq.getMatricPressure(sq.waterContainment) + (sq.getGravitationalPressure() - this.getGravitationalPressure());

                if (isNaN(thisWaterPressure) || isNaN(sqWaterPressure)) {
                    return;
                }
                if (thisWaterPressure < sqWaterPressure || thisWaterPressure < -2) {
                    return;
                }
                let meanPressure = (thisWaterPressure + sqWaterPressure) / 2;
                let meanPressureWaterContainment = this.getInverseMatricPressure(meanPressure);
                let thisDiff = (this.waterContainment - meanPressureWaterContainment) / this.getWaterflowRate();
                let sqDiff = (this.waterContainment - meanPressureWaterContainment) / sq.getWaterflowRate();
                let diff = Math.min(thisDiff, sqDiff) / 2;
                diff = Math.min(this.waterContainment, Math.max(0, Math.min(diff, sq.waterContainmentMax - sq.waterContainment)));
                this.waterContainment -= diff;
                sq.waterContainment += diff;
            });

        this.doBlockOutflow(unsaturatedNeighbors);
    }

    doBlockOutflow(unsaturatedNeighbors) {
        let thisWaterPressure = this.getMatricPressure(this.waterContainment); 
        if (thisWaterPressure < -2) {
            return;
        }
        for (let side = -1; side <= 1; side += 2) {
            if (unsaturatedNeighbors == 0)
                this.outflowNewWaterToLocation(this.posX + side, this.posY)
            this.outflowWaterToWaterLocation(this.posX + side, this.posY);
        }
    }

    outflowNewWaterToLocation(posX, posY) {
        if (getSquares(posX, posY).some((sq) => !sq.surface && sq.collision)) {
            return;
        }
        let outflowWaterAmount = (this.waterContainment - this.getInverseMatricPressure(-2)) / this.getWaterflowRate();
        if (outflowWaterAmount < Math.random() * 0.125) {
            return;
        }
        let newWater = addSquareByName(posX, posY, "water");
        if (newWater) {
            newWater.blockHealth = outflowWaterAmount;
            this.waterContainment -= outflowWaterAmount;
        }
    }
    
    outflowWaterToWaterLocation(posX, posY) {
        getSquares(posX, posY).filter((sq) => sq.proto == "WaterSquare")
        .filter((sq) => sq.currentPressureDirect == 0)
        .forEach((sq) => {
            let outflowWaterAmount = (this.waterContainment - this.getInverseMatricPressure(-2)) / this.getWaterflowRate();
            let start = sq.blockHealth;
            sq.blockHealth = Math.min(1, sq.blockHealth + outflowWaterAmount);
            this.waterContainment -= sq.blockHealth - start;
        });
    }

    percolateFromWater(waterBlock) {
        if (this.waterContainmentMax == 0 || this.waterContainment >= this.waterContainmentMax) {
            return 0;
        }
        let maxWaterflowRate = (this.waterContainmentMax - this.waterContainment) / (this.getWaterflowRate() ** 0.5);
        let amountToPercolate = Math.min(waterBlock.blockHealth, maxWaterflowRate);
        this.waterContainment += amountToPercolate;
        return amountToPercolate;
    }

    getWaterflowRate() {
        // https://docs.google.com/spreadsheets/d/1MWOde96t-ruC5k1PLL4nex0iBjdyXKOkY7g59cnaEj4/edit?gid=0#gid=0
        let clayRate = 2;
        let siltRate = 1.5;
        let sandRate = 0.92;
        let power = 10;

        let baseRet = (this.sand * sandRate + 
                this.silt * siltRate + 
                this.clay * clayRate) ** power;

        let sandMult = 1 + Math.max(0, this.sand - 0.9) * 40;
        baseRet *= sandMult;
        baseRet /= Math.min(getCurTimeScale(), 20);
        baseRet = Math.max(1, baseRet);
        return baseRet;
    }

    getColorBase() {
        let outColor = getActiveClimate().getBaseSoilColor(this.colorVariant, this.sand, this.silt, this.clay);
        let darkeningColorMult = (this.waterContainment / this.waterContainmentMax);

        outColor.r *= (1 - 0.24 * darkeningColorMult);
        outColor.g *= (1 - 0.30 * darkeningColorMult);
        outColor.b *= (1 - 0.383 * darkeningColorMult);
        return outColor;
    }
    // soil nutrients

    takeNitrogen(requestedAmount, growthCycleFrac) {
        requestedAmount /= this.linkedOrganismSquares.length;
        // let meanAmount = this.nitrogen * growthCycleFrac;
        // requestedAmount = Math.max(meanAmount / 2, requestedAmount);
        // requestedAmount = Math.min(meanAmount * 2, requestedAmount);
        // this.nitrogen -= requestedAmount;
        return requestedAmount;
    }

    takePhosphorus(requestedAmount, growthCycleFrac) {
        requestedAmount /= this.linkedOrganismSquares.length;
        // let meanAmount = this.phosphorus * growthCycleFrac;
        // requestedAmount = Math.max(meanAmount / 2, requestedAmount);
        // requestedAmount = Math.min(meanAmount * 2, requestedAmount);
        // this.phosphorus -= requestedAmount;
        return requestedAmount;
    }

    waterEvaporationRoutine() {
        let adjacentWindSquare = getWindSquareAbove(this.posX, this.posY);
        let x = adjacentWindSquare[0];
        let y = adjacentWindSquare[1];
        if (x < 0 || y < 0 || this.waterContainment <= 0.01) {
            return;
        }
        let airWaterPressure = getWaterSaturation(x, y);
        let myVaporPressure = (this.waterContainment / this.waterContainmentMax) * saturationPressureOfWaterVapor(this.temperature);
        if (airWaterPressure > myVaporPressure) {
            return;
        }
        let pascals = (myVaporPressure - airWaterPressure);
        pascals *= Math.exp(-0.01 * (this.posY - (y * 4)));
        let amount = Math.min(this.waterContainment, pascals / pascalsPerWaterSquare)
        this.waterContainment -= amount;
        addWaterSaturationPascals(x, y, pascals);
    }
}
