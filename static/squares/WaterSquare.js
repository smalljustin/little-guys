import { BaseSquare } from "./BaseSqaure.js";
import { getSquares, iterateOnSquares, getNeighbors } from "./_sqOperations.js";
import { WATERFLOW_CANDIDATE_SQUARES, WATERFLOW_TARGET_SQUARES } from "../globals.js";
import { MAIN_CONTEXT } from "../index.js";
import { RGB_COLOR_OTHER_BLUE } from "../colors.js";
import { hexToRgb, hsv2rgb, randRange, rgb2hsv, rgbToRgba } from "../common.js";
import { loadGD, UI_LIGHTING_WATER, UI_LIGHTING_WATER_HUE, UI_LIGHTING_WATER_SATURATION, UI_LIGHTING_WATER_VALUE } from "../ui/UIData.js";
import { getBaseSize, zoomCanvasFillRect } from "../canvas.js";
import { getActiveClimate } from "../climate/climateManager.js";
class WaterSquare extends BaseSquare {
    constructor(posX, posY) {
        super(posX, posY);
        this.proto = "WaterSquare";
        this.boundedTop = false;
        this.solid = false;
        this.currentPressureDirect = -1;
        this.currentPressureIndirect = -1;
        this.rootable = false;
        this.calculateGroupFlag = true; 
        this.gravity = 1;

        this.color = getActiveClimate().waterColor;

        this.opacity = 0.5;

        this.blockHealthMax = 1;
        this.blockHealth = this.blockHealthMax;

        // water starts as a liquid 
        this.state = 1;
        this.thermalConductivity = 0.6;
        this.thermalMass = 4.2;
    }

    getLightFilterRate() {
        return super.getLightFilterRate() * loadGD(UI_LIGHTING_WATER);
    }

    getColorBase() {
        let base = getActiveClimate().waterColor;
        let hsv = rgb2hsv(base.r, base.g, base.b);
        hsv[1] = loadGD(UI_LIGHTING_WATER_VALUE);
        hsv[2] = 255 * loadGD(UI_LIGHTING_WATER_SATURATION);
        hsv[0] += 355 * loadGD(UI_LIGHTING_WATER_HUE);
        let rgb = hsv2rgb(...hsv);
        return {r: rgb[0], g: rgb[1], b: rgb[2]}
    }

    reset() {
        super.reset();
        this.currentPressureDirect = -1;
        this.currentPressureIndirect = -1;
    }

    physics() {
        super.physics();
        this.doNeighborPercolation();
        this.combineAdjacentNeighbors();
        this.doLocalColorSwapping();9
        this.calculateCandidateFlows();
    }

    physicsSimple() {
        this.gravityPhysics();
        this.calculateCandidateFlows();
    }

    doLocalColorSwapping() {
        if (Math.random() > 0.999) {
            getNeighbors(this.posX, this.posY).filter((sq) => sq.group == this.group).forEach((sq) => {
                if (Math.random() > 0.75) {
                    this.swapColors(sq);
                }
            });
        }
    }
    renderWaterSaturation() {
        MAIN_CONTEXT.fillStyle = rgbToRgba(RGB_COLOR_OTHER_BLUE.r, RGB_COLOR_OTHER_BLUE.g, RGB_COLOR_OTHER_BLUE.b, 0.25 * (this.blockHealth / this.blockHealthMax));
        zoomCanvasFillRect(
            this.posX * getBaseSize(),
            this.posY * getBaseSize(),
            getBaseSize(),
            getBaseSize()
        );
    }

    physicsBefore() {
        super.physicsBefore();
        this.calculateIndirectPressure();
    }

    triggerParticles(bonkSpeed) {
        if (Date.now() < this.spawnTime + 100) {
            return;
        }
        for (let i = 0; i < 4; i += Math.random()) {
            let speed = randRange(0, (bonkSpeed ** 0.25) - 1);
            let theta = randRange(0, 2 * Math.PI);
            let speedX = speed * Math.cos(theta);
            let speedY = Math.max(speed * Math.sin(theta), 0) / 4;
            let size = randRange(getBaseSize() * 0.2, getBaseSize() * 0.6);
            this.activeParticles.push([this.posX, this.posY, theta, speedX, speedY, size])
        }
    }

    calculateCandidateFlows() {
        if (this.speedY > 0) {
            return;
        }

        if (!(this.group in WATERFLOW_CANDIDATE_SQUARES)) {
            WATERFLOW_CANDIDATE_SQUARES[this.group] = new Map();
        }
        if (!(this.group in WATERFLOW_TARGET_SQUARES)) {
            WATERFLOW_TARGET_SQUARES[this.group] = new Map();
        }

        let candidateMap = WATERFLOW_CANDIDATE_SQUARES[this.group];
        let targetMap = WATERFLOW_TARGET_SQUARES[this.group]
        if (!(this.currentPressureIndirect in candidateMap)) {
            candidateMap[this.currentPressureIndirect] = new Array();
        }
        if (!(getSquares(this.posX, this.posY).some((sq) => sq.surface))) {
            candidateMap[this.currentPressureIndirect].push(this);
        }
        if (this.currentPressureIndirect >= this.currentPressureDirect) {
            for (let i = -1; i < 2; i++) {
                for (let j = -1; i < 2; i++) {
                    if (!(getSquares(this.posX + i, this.posY + j)
                            .some((sq) => (!sq.surface && sq.collision) || (sq.surface && (sq.waterContainment < sq.waterContainmentMax)) || sq.proto == this.proto))) {
                        if (!(this.currentPressureIndirect in targetMap)) {
                            targetMap[this.currentPressureIndirect] = new Array();
                        }
                        targetMap[this.currentPressureIndirect].push([this.posX + i, this.posY + j, i]);
                    }
                }
            }
        }
    }

    calculateIndirectPressure() {
        if (this.currentPressureIndirect != -1) {
            return;
        }

        if (this.blockHealth < this.blockHealthMax / 10) {
            this.currentPressureIndirect = 10 ** 8;
            return;
        }

        let perGroupData = new Map();
        iterateOnSquares((sq) => {
            if (sq.proto != this.proto) {
                return;
            }
            if (!(sq.group in perGroupData)) {
                perGroupData[sq.group] = 10 ** 8;
            }
            perGroupData[sq.group] = Math.min(sq.posY, perGroupData[sq.group])
        });

        iterateOnSquares((sq) => {
            if (sq.proto != this.proto) {
                return;
            }
            sq.currentPressureIndirect = Math.max(sq.currentPressureDirect, sq.posY - perGroupData[sq.group]);
        })
    }

    doNeighborPercolation() {
        getNeighbors(this.posX, this.posY)
            .filter((sq) => sq.solid)
            .forEach((sq) => this.blockHealth -= sq.percolateFromWater(this));
    }

    combineAdjacentNeighbors() {
        if (this.blockHealth < this.blockHealthMax) {
            getNeighbors(this.posX, this.posY)
            .filter((sq) => sq.proto == this.proto)
            .filter((sq) => (sq.posY < this.posY || (sq.posY == this.posY && Math.random() > 0.5))) 
            .forEach((sq) => {
                let start = this.blockHealth;
                this.blockHealth = Math.min(this.blockHealthMax, this.blockHealth + sq.blockHealth / 2);
                sq.blockHealth -= this.blockHealth - start;
            });
        }

    }
}

export { WaterSquare }