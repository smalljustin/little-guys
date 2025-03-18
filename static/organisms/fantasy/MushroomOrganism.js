import { hueShiftColor, hueShiftColorArr, randNumber, randRange, rgbToHex } from "../../common.js";
import { GenericParameterizedRootSquare } from "../../lifeSquares/parameterized/GenericParameterizedRootSquare.js";
import { STAGE_ADULT, STAGE_JUVENILE, SUBTYPE_FLOWER, SUBTYPE_FLOWERNODE, SUBTYPE_LEAF, SUBTYPE_NODE, SUBTYPE_ROOTNODE, SUBTYPE_STEM, TYPE_FLOWER, TYPE_LEAF, TYPE_STEM } from "../Stages.js";

// import { GrowthPlan, GrowthPlanStep } from "../../../GrowthPlan.js";
import { GrowthPlan, GrowthPlanStep } from "../GrowthPlan.js";
import { BaseSeedOrganism } from "../BaseSeedOrganism.js";
import { BaseOrganism } from "../BaseOrganism.js";
import { MushroomGreenSquare } from "../../lifeSquares/parameterized/fantasy/MushroomGreenSquare.js";
import { SeedSquare } from "../../squares/SeedSquare.js";
import { addSquare } from "../../squares/_sqOperations.js";
import { addNewOrganism } from "../_orgOperations.js";
import { getCurDay } from "../../climate/time.js";

export class MushroomOrganism extends BaseOrganism {
    constructor(posX, posY) {
        super(posX, posY);
        this.proto = "MushroomOrganism";
        this.greenType = MushroomGreenSquare;
        this.rootType = GenericParameterizedRootSquare;
        this.grassGrowTimeInDays =  0.01;
        this.side = Math.random() > 0.5 ? -1 : 1;

        this.numGrowthCycles = 5;

        this.growthCycleMaturityLength = 1;
        this.growthCycleLength = 1;

        this.stems = [];
        this.leaves = [];
        this.flower = null;

        this.curLeafTheta = 0;

        this.maxNumLeaves = 10;
        this.maxStemLength = 20;
        this.maxLeafLength = 10;
        this.maxFlowerLength = 6;

        this.targetNumStems = 1;
        this.targetNumLeaves = 1;
        this.targetLeafLength = 1;
        this.targetStemLength = 1;
        this.targetFlowerLength = this.maxFlowerLength;

        this.curGrowthCycleNum = 0;

        this.growthNumGreen = this.maxNumLeaves * (this.maxLeafLength) + this.maxStemLength;
    }

    growStem(parent, startNode, theta) {
        if (parent == null || startNode == null) {
            return;
        }
        var growthPlan = new GrowthPlan(
            startNode.posX, startNode.posY,
            false, STAGE_ADULT,
            theta, 0, 0, 0,
            randRange(0, 0.05), TYPE_STEM, 10);

        growthPlan.postConstruct = () => {
            parent.addChild(growthPlan.component);
            this.stems.push(this.originGrowth.getChildPath(growthPlan.component));
        };
        growthPlan.component._getWilt = (val) => Math.sin(val) / 2;
        growthPlan.steps.push(new GrowthPlanStep(
            growthPlan,
            0,
            this.grassGrowTimeInDays,
            () => {
                var node = this.growPlantSquare(startNode, 0, growthPlan.steps.length);
                node.subtype = SUBTYPE_NODE;
                return node;
            },
            null
        ))
        this.growthPlans.push(growthPlan);
    }

    growLeaf(parent, startNode) {
        if (parent == null || startNode == null) {
            return;
        }
        var growthPlan = new GrowthPlan(
            startNode.posX, startNode.posY,
            false, STAGE_ADULT, this.curLeafTheta, 0, 0,
            randRange(1, 1.4),
            randRange(.8, 1.2), TYPE_LEAF, 1);

        growthPlan.postConstruct = () => {
            parent.addChild(growthPlan.component);
            this.leaves.push(this.originGrowth.getChildPath(growthPlan.component));
        };
        growthPlan.component._getWilt = (val) => Math.sin(val) / 2;
        growthPlan.steps.push(new GrowthPlanStep(
            growthPlan,
            0,
            this.grassGrowTimeInDays,
            () => {
                var node = this.growPlantSquare(startNode, 0, growthPlan.steps.length);
                node.subtype = SUBTYPE_LEAF;
                return node;
            },
            null
        ))
        this.growthPlans.push(growthPlan);
        this.curLeafTheta += randRange(Math.PI / 2, Math.PI);
    }

    adultGrowStem() {
        let parentPath = this.stems[this.stems.length - 1];
        let parent = this.originGrowth.getChildFromPath(parentPath);
        this.growStem(parent, parent.lifeSquares.find((lsq) => lsq.subtype == SUBTYPE_NODE), 0);
    }

    adultGrowLeaf() {
        var parent = this.originGrowth.getChildFromPath(this.stems[this.stems.length - 1]);
        if (parent == null) {
            return;
        }
        this.growLeaf(parent, parent.lifeSquares.find((lsq) => lsq.subtype == SUBTYPE_NODE));
    }

    lengthenStems() {
        let stem = this.stems
            .map((parentPath) => this.originGrowth.getChildFromPath(parentPath))
            .filter((stem) => stem.growthPlan.steps.length < this.targetStemLength).at(0);
        let startNode = stem.lifeSquares.find((lsq) => lsq.subtype == SUBTYPE_NODE);
        if (startNode == null) {
            this.growthPlans = Array.from(this.growthPlans.filter((gp) => gp != stem.growthPlan));
            this.stems = Array.from(this.stems.filter((st) => this.originGrowth.getChildFromPath(st) != stem));
            return;
        }
        stem.growthPlan.steps.push(new GrowthPlanStep(
            stem.growthPlan,
            0,
            this.grassGrowTimeInDays,
            () => {
                var shoot = this.growPlantSquare(startNode, 0, 0);
                shoot.subtype = SUBTYPE_STEM;
                return shoot;
            },
            null
        ))
        stem.growthPlan.completed = false;
    }
    lengthenLeaves() {
        this.leaves
            .map((parentPath) => this.originGrowth.getChildFromPath(parentPath))
            .filter((leaf) => leaf.growthPlan.steps.length < this.targetLeafLength)
            .forEach((leaf) => {
                let startNode = leaf.lifeSquares.find((lsq) => lsq.subtype == SUBTYPE_LEAF);
                if (startNode == null) {
                    this.growthPlans = Array.from(this.growthPlans.filter((gp) => gp != leaf.growthPlan));
                    this.leaves = Array.from(this.leaves.filter((le) => this.originGrowth.getChildFromPath(le) != leaf));
                    return;
                }

                for (let i = 0; i < this.targetLeafLength - leaf.growthPlan.steps.length; i++) {
                    leaf.growthPlan.steps.push(new GrowthPlanStep(
                        leaf.growthPlan,
                        0,
                        this.grassGrowTimeInDays,
                        () => {
                            var leaf = this.growPlantSquare(startNode, 0, 0);
                            leaf.subtype = SUBTYPE_LEAF;
                            return leaf;
                        },
                        null
                    ))
                };
                leaf.growthPlan.completed = false;
            });
    }

    juvenileGrowthPlanning() {
        this.growStem(this.originGrowth, this.originGrowth.lifeSquares.find((lsq) => lsq.subtype == SUBTYPE_ROOTNODE), randRange(0, Math.PI * 2));
    }

    executeGrowthPlans() {
        super.executeGrowthPlans();
        if (this.originGrowth != null && this.stems.length > 0) {
            let stem = this.originGrowth.getChildFromPath(this.stems[0]);
            if (stem != null) {
                stem.lifeSquares.forEach((lsq) => lsq.width = 1 + (this.targetStemLength / this.maxStemLength));
            }
        }
        let start = this.spawnTime;
        let age = getCurDay() - start;
        let cycles = age / this.growthCycleLength;
        if (Math.floor(cycles) != this.curGrowthCycleNum) {
            this.curGrowthCycleNum = Math.floor(cycles);
            this.lifeSquares.forEach((lsq) => {
                lsq.accentColor = rgbToHex(...hueShiftColorArr(lsq.accentColor, 50, 0, 0));
                lsq.darkColor = rgbToHex(...hueShiftColorArr(lsq.darkColor, 50, 0, 0));
                lsq.baseColor = rgbToHex(...hueShiftColorArr(lsq.baseColor, 50, 0, 0));
            });
        }
    }
    adultGrowthPlanning() {
        if (this.growthPlans.some((gp) => !gp.completed)) {
            this.executeGrowthPlans();
            return;
        }

        if (this.stems.length < 1) {
            this.adultGrowStem();
            return;
        }

        if (this.stems
            .map((parentPath) => this.originGrowth.getChildFromPath(parentPath))
            .some((stem) => stem.growthPlan.steps.length < this.targetStemLength)) {
            this.lengthenStems();
            return;
        }

        if (this.leaves.length < (this.targetStemLength / this.maxStemLength) * this.targetNumLeaves) {
            this.adultGrowLeaf();
            return;
        }

        if (this.leaves
            .map((parentPath) => this.originGrowth.getChildFromPath(parentPath))
            .some((leaf) => leaf.growthPlan.steps.length < Math.min(this.targetStemLength * (this.maxLeafLength / this.maxStemLength), this.targetLeafLength))) {
            this.lengthenLeaves();
            return;
        }
        if (this.targetNumLeaves < this.maxNumLeaves) {
            this.targetNumLeaves += 1;
            return;
        }
        if (this.targetLeafLength < this.maxLeafLength) {
            this.targetLeafLength += 1;
            return;
        }
        if (this.targetStemLength < this.maxStemLength && this.targetLeafLength == this.maxLeafLength) {
            this.targetStemLength += 1;
            return;
        }

        if (this.nitrogen > this.growthNitrogen && 
            this.phosphorus > this.growthPhosphorus && 
            this.lightlevel > this.growthLightLevel) {
                this.spawnSeed();
        }
    }

    spawnSeed() {
        let chosen = this.leaves.at(randNumber(0, this.leaves.length - 1));
        let comp = this.originGrowth.getChildFromPath(chosen);
        let lsq = comp.lifeSquares.at(comp.lifeSquares.length - 1);

        var seedSquare = addSquare(new SeedSquare(lsq.getPosX(), lsq.getPosY()));
        seedSquare.gravity = 4;

        if (seedSquare) {
            var orgAdded = addNewOrganism(new MushroomSeedOrganism(seedSquare));
            if (!orgAdded) {
                seedSquare.destroy();
            }
        }
        this.nitrogen *= 0.5;
        this.phosphorus *= 0.5;
        this.lightlevel *= 0.5;
    }

    planGrowth() {
        super.planGrowth();
        if (this.originGrowth == null) {
            return;
        }
        if (this.stage == STAGE_JUVENILE) {
            this.juvenileGrowthPlanning();
        }
        if (this.stage == STAGE_ADULT) {
            this.adultGrowthPlanning();
        }
    }
}


export class MushroomSeedOrganism extends BaseSeedOrganism {
    constructor(square) {
        super(square);
        this.proto = "MushroomSeedOrganism";
    }

    getSproutType() {
        return MushroomOrganism;
    }
}