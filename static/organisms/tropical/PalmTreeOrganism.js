import { randNumber, randRange } from "../../common.js";
import { GenericParameterizedRootSquare } from "../../lifeSquares/parameterized/GenericParameterizedRootSquare.js";
import { PalmTreeGreenSquare } from "../../lifeSquares/parameterized/tropical/PalmTreeGreenSquare.js";
import { BaseOrganism } from "../BaseOrganism.js";
import { BaseSeedOrganism } from "../BaseSeedOrganism.js";
import { GrowthPlan, GrowthPlanStep } from "../GrowthPlan.js";
import { STAGE_ADULT, STAGE_FLOWER, STAGE_FRUIT, STAGE_JUVENILE, STAGE_SPROUT, SUBTYPE_LEAF, SUBTYPE_NODE, SUBTYPE_ROOTNODE, SUBTYPE_SHOOT, SUBTYPE_SPROUT, SUBTYPE_STEM, SUBTYPE_TRUNK, TYPE_LEAF, TYPE_TRUNK } from "../Stages.js";

export class PalmTreeOrganism extends BaseOrganism {
    constructor(posX, posY) {
        super(posX, posY);
        this.proto = "PalmTreeOrganism";
        this.greenType = PalmTreeGreenSquare;
        this.rootType = GenericParameterizedRootSquare;
        this.spinnable = true;
        this.trunkMaxThickness = 2;
        this.trunkCurThickness = 1;

        this.airCoef = 0.01;
        this.waterCoef = 0.01;
        this.dirtCoef = 0.001;
        this.reproductionEnergy = 10 ** 8;
        this.currentHealth = 10 ** 8;
        
        this.sproutGrowTimeInDays =  10 ** (-3);
        this.leafGrowTimeInDays =      10 ** (-3);
        this.trunkGrowTimeInDays =    10 ** (-3);

        this.side = Math.random() > 0.5 ? -1 : 1;


        // parameterized growth rules

        this.org_thicknessHeightMult = randRange(4, 5);

        /* 
        the palm tree rules
        ------------------- 

        each node can only grow so many fronds (fraction of number of life squares in trunk)
        to grow some height, you must be at least height/n wide
        to grow a leaf of some length, you must be some fraction of that leaf length tall 
        as more height is added at the top, if there already 2 or more nodes, the "middle" node gets moved to the side (with all its children) and the new node goes in the middle
        to grow some width, you must be anchored at the bottom to a SUBTYPE_ROOTNODE root 
        roots may be promoted to SUBTYPE_ROOTNODE 
        */
    }

    gp_juvenile() {
        let startRootNode = this.getOriginsForNewGrowth(SUBTYPE_ROOTNODE).at(0);
        let growthPlan = new GrowthPlan(
            startRootNode.posX, startRootNode.posY, 
            false, STAGE_ADULT, 0, 0, 0, 
            randRange(-.05, .05), 
            0, TYPE_TRUNK, 7);

        growthPlan.component._getWilt = (val) => val / 100;
        growthPlan.postConstruct = () => this.originGrowth.addChild(growthPlan.component);
        for (let t = 1; t < randNumber(5, 10); t++) {
            growthPlan.steps.push(new GrowthPlanStep(
                growthPlan,
                0,
                this.sproutGrowTimeInDays,
                () => {
                    let shoot = this.growPlantSquare(startRootNode, 0, t);
                    shoot.subtype = SUBTYPE_STEM;
                    return shoot;
                },
                null
            ))
        }

        growthPlan.steps.push(new GrowthPlanStep(
            growthPlan,
            0,
            this.sproutGrowTimeInDays,
            () => {
                let node = this.growPlantSquare(startRootNode, 0, growthPlan.steps.length);
                node.subtype = SUBTYPE_NODE;
                return node;
            },
            null
        ))

        return growthPlan;
    }

    adultGrowthPlanning() {
        let trunk = this.getAllComponentsofType(TYPE_TRUNK).at(0);

        let maxLeaves = 3 + Math.floor(trunk.lifeSquares.map((lsq) => lsq.subtype == SUBTYPE_NODE ? 3 : 0.1).reduce(
            (accumulator, currentValue) => accumulator + currentValue,
            0,
        )) * 0.7;
        let maxLeafLength = 3 + trunk.ySizeCur() * 0.4;

        let maxHeight = this.trunkCurThickness * this.org_thicknessHeightMult;

        // try to grow additional leaves if we can 

        let curLeaves = trunk.children.length;
        if (curLeaves < maxLeaves) {
            this.growthPlans.push(this.newLeafGrowthPlan(trunk, maxLeafLength));
        }

        // then try to extend our leaves 

        this.getAllComponentsofType(TYPE_LEAF).forEach((growthPlan) => this.extendLeafGrowthPlan(growthPlan, maxLeafLength));

        // then try to increase our height, but only if we are all out of other things to do 
        
        if (this.growthPlans.some((gp) => !gp.completed)) {
            return;
        }
        

        if (trunk.ySize() < maxHeight) {
            this.increaseHeightGrowthPlan(trunk, maxHeight - trunk.ySize());
        }

        // then thicken our trunk

        this.thickenTrunkGrowthPlan(trunk);

        // then, uh, i don't fucking know 
    }

    newLeafGrowthPlan(startComponent, maxLeafLength) {
        // grow from the node with the least child lifesquares
        let startNode;
        startComponent.lifeSquares.filter((lsq) => lsq.subtype == SUBTYPE_NODE).forEach((lsq) => {
            if (startNode == null || lsq.childLifeSquares.length < startNode.childLifeSquares.length) {
                startNode = lsq;
            }
        })
        let growthPlan = new GrowthPlan(startNode.posX, startNode.posY, 
            false, STAGE_ADULT, 
            randRange(-Math.PI, Math.PI), 0, 0, randRange(0.8,1.2), 
            0.1 + Math.random() / 5, TYPE_LEAF, 100);
        growthPlan.postConstruct = () => startComponent.addChild(growthPlan.component);
        for (let t = 1; t < randNumber(0, maxLeafLength); t++) {
            growthPlan.steps.push(new GrowthPlanStep(
                growthPlan,
                0,
                this.leafGrowTimeInDays,
                () => {
                    let shoot = this.growPlantSquare(startNode, 0, t);
                    shoot.subtype = SUBTYPE_LEAF;
                    return shoot;
                },
                null
            ))
        }
        return growthPlan;
    }

    extendLeafGrowthPlan(leafComponent, maxLeafLength) {
        if (leafComponent.growthPlan.steps.length < maxLeafLength) {
            for (let t = leafComponent.growthPlan.steps.length; t < maxLeafLength; t++) {
                leafComponent.growthPlan.completed = false;
                leafComponent.growthPlan.steps.push(new GrowthPlanStep(
                    leafComponent.growthPlan,
                    0,
                    this.leafGrowTimeInDays,
                    () => {
                        let shoot = this.growPlantSquare(leafComponent.lifeSquares.at(0), 0, 0);
                        shoot.subtype = SUBTYPE_LEAF;
                        return shoot;
                    },
                    null
                ))
            }
            return true;
        }
        return false;
    }

    increaseHeightGrowthPlan(trunk, increaseAmount) {
        let xPositions = trunk.xPositions();
        trunk.growthPlan.completed = false;
        trunk.growthPlan.postComplete = () => this.redistributeLeaves(trunk);
        xPositions.forEach((posX) => {
            let existingTrunkSq = trunk.lifeSquares.find((lsq) => lsq.posX == posX);
            for (let i = 0; i < increaseAmount; i++) {
                trunk.growthPlan.steps.push(new GrowthPlanStep(
                    trunk.growthPlan,
                    0,
                    this.trunkGrowTimeInDays,
                    () => {
                        let node = this.growPlantSquare(existingTrunkSq, 0, 0);
                        node.subtype = SUBTYPE_TRUNK;
                        return node;
                    },
                    null
                ));
            }
        });
    }

    thickenTrunkGrowthPlan(trunk) {
        if (this.trunkCurThickness >= this.trunkMaxThickness) {
            return;
        }
        let xPositions = trunk.xPositions();
        let nextX = (this.trunkCurThickness % 2 > 0 ? this.side : this.side * -1) * Math.ceil(this.trunkCurThickness / 2);
        let trunkMaxY = Math.max(...trunk.yPositions());
        let trunkMinY = Math.min(...trunk.yPositions());

        let rootNodeSq = this.lifeSquares.find((lsq) => lsq.type == "root" && lsq.posX == trunk.posX + nextX && lsq.posY <= trunkMaxY + 1);
        if (rootNodeSq == null || xPositions.some((num) => num == rootNodeSq.posX)) {
            this.side *= -1;
            return;
        }
        this.trunkCurThickness += 1;
        rootNodeSq.subtype = SUBTYPE_ROOTNODE;
        trunk.growthPlan.completed = false;
        trunk.growthPlan.postComplete = () => this.redistributeLeaves(trunk);

        let curY = rootNodeSq.posY - 1;
        while (curY >= trunkMinY) {
            trunk.growthPlan.steps.push(new GrowthPlanStep(
                trunk.growthPlan,
                0,
                this.trunkGrowTimeInDays,
                () => {
                    // let node = this.growPlantSquarePos(rootNodeSq, rootNodeSq.posX, rootNodeSq.posY - 1);
                    node.subtype = SUBTYPE_TRUNK;
                    return node;
                },
                null
            ));
            curY -= 1;
        };
    }

    redistributeLeaves(trunk) {
        let xPositions = trunk.xPositions();
        let trunkMinY = Math.min(...trunk.yPositions());
        trunk.lifeSquares.forEach((lsq) => {
            if (lsq.posY == trunkMinY) {
                lsq.subtype = SUBTYPE_NODE;
            } else {
                lsq.subtype = SUBTYPE_TRUNK;
            }
            let middleLsq = this.lifeSquares.find((llsq) => llsq.posX == this.posX && llsq.posY == lsq.posY);
            if (lsq != middleLsq) {
                lsq.makeRandomsSimilar(middleLsq);
            }
        });

        if (xPositions.length == 1) {
            return;
        }

    }

    planGrowth() {
        if (this.stage == STAGE_JUVENILE) {
            let plan = this.gp_juvenile();
            if (plan != null)
                this.growthPlans.push(plan);
        }
        if (this.stage == STAGE_ADULT) {
            this.adultGrowthPlanning();
        }
    }
}


export class PalmTreeSeedOrganism extends BaseSeedOrganism {
    constructor(square) {
        super(square);
        this.proto = "PalmTreeSeedOrganism";
    }

    getSproutType() {
        return PalmTreeOrganism;
    }
}