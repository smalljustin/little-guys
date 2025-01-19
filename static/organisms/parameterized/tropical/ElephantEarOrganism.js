import { randNumber, randRange } from "../../../common.js";
import { PalmTreeGreenSquare } from "../../../lifeSquares/parameterized/tropical/PalmTreeGreenSquare.js";
import { PalmTreeRootSquare } from "../../../lifeSquares/parameterized/tropical/PalmTreeRootSquare.js";
import { BaseParameterizedOrganism } from "../BaseParameterizedOrganism.js";
import { GrowthPlan, GrowthPlanStep } from "../GrowthPlan.js";
import { STAGE_ADULT, STAGE_FLOWER, STAGE_FRUIT, STAGE_JUVENILE, STAGE_SPROUT, SUBTYPE_LEAF, SUBTYPE_NODE, SUBTYPE_ROOTNODE, SUBTYPE_SHOOT, SUBTYPE_SPROUT, SUBTYPE_TRUNK, TYPE_LEAF, TYPE_TRUNK } from "../Stages.js";

export class ElephantEarOrganism extends BaseParameterizedOrganism {
    constructor(posX, posY) {
        super(posX, posY);
        this.greenType = PalmTreeGreenSquare;
        this.rootType = PalmTreeRootSquare;

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

        this.org_thicknessHeightMult = randRange(3, 4);

        /* 
        the elephant ear rules

        stems grow up at an angle, then they have a node 
        

        */
    }

    gp_juvenile() {
        if (!(STAGE_JUVENILE in this.stageGrowthPlans)) {
            this.stageGrowthPlans[STAGE_JUVENILE] = new Array();
        }
        if (this.stageGrowthPlans[STAGE_JUVENILE].length > 0) {
            return null;
        }

        var startRootNode = this.getOriginsForNewGrowth(SUBTYPE_ROOTNODE).at(0);
        var growthPlan = new GrowthPlan(startRootNode.posX, startRootNode.posY, false, STAGE_ADULT, 0, randRange(-.05, .05), TYPE_TRUNK, 1);
        growthPlan.postConstruct = () => this.originGrowth.addChild(growthPlan.component);
        for (let t = 1; t < randNumber(5, 10); t++) {
            growthPlan.steps.push(new GrowthPlanStep(
                growthPlan,
                0,
                this.sproutGrowTimeInDays,
                () => {
                    var shoot = this.growPlantSquare(startRootNode, 0, t);
                    shoot.subtype = SUBTYPE_TRUNK;
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
                var node = this.growPlantSquare(startRootNode, 0, growthPlan.steps.length);
                node.subtype = SUBTYPE_NODE;
                return node;
            },
            null
        ))

        this.stageGrowthPlans[STAGE_JUVENILE].push(growthPlan);
        return growthPlan;
    }

    adultGrowthPlanning() {
        var trunk = this.getAllComponentsofType(TYPE_TRUNK).at(0);

        var maxLeaves = 3 + Math.floor(trunk.lifeSquares.map((lsq) => lsq.subtype == SUBTYPE_NODE ? 3 : 0.1).reduce(
            (accumulator, currentValue) => accumulator + currentValue,
            0,
        )) * 0.7;
        var maxLeafLength = 3 + trunk.ySizeCur() * 0.4;

        var maxHeight = trunk.xSizeCur() * this.org_thicknessHeightMult;

        // try to grow additional leaves if we can 

        var curLeaves = trunk.children.length;
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
        var startNode;

        startComponent.lifeSquares.filter((lsq) => lsq.subtype == SUBTYPE_NODE).forEach((lsq) => {
            if (startNode == null || lsq.childLifeSquares.length < startNode.childLifeSquares.length) {
                startNode = lsq;
            }
        })
        var growthPlan = new GrowthPlan(startNode.posX, startNode.posY, false, STAGE_ADULT, randRange(-Math.PI, Math.PI), Math.random() / 3, TYPE_LEAF, 1);
        growthPlan.postConstruct = () => startComponent.addChild(growthPlan.component);
        for (let t = 1; t < randNumber(0, maxLeafLength); t++) {
            growthPlan.steps.push(new GrowthPlanStep(
                growthPlan,
                0,
                this.leafGrowTimeInDays,
                () => {
                    var shoot = this.growPlantSquare(startNode, 0, t);
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
                        var shoot = this.growPlantSquare(leafComponent.lifeSquares.at(0), 0, 0);
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
        var xPositions = trunk.xPositions();
        trunk.growthPlan.completed = false;
        trunk.growthPlan.postComplete = () => this.redistributeLeaves(trunk);
        xPositions.forEach((posX) => {
            var existingTrunkSq = trunk.lifeSquares.find((lsq) => lsq.posX == posX);
            for (let i = 0; i < increaseAmount; i++) {
                trunk.growthPlan.steps.push(new GrowthPlanStep(
                    trunk.growthPlan,
                    0,
                    this.trunkGrowTimeInDays,
                    () => {
                        var node = this.growPlantSquare(existingTrunkSq, 0, 0);
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
        this.trunkCurThickness += 1;
        var xPositions = trunk.xPositions();
        var nextX = (this.trunkCurThickness % 2 > 0 ? this.side : this.side * -1) * Math.ceil(this.trunkCurThickness / 2);
        var trunkMaxY = Math.max(...trunk.yPositions());
        var trunkMinY = Math.min(...trunk.yPositions());

        var rootNodeSq = this.lifeSquares.find((lsq) => lsq.type == "root" && lsq.posX == trunk.posX + nextX && lsq.posY <= trunkMaxY + 1);
        if (rootNodeSq == null || xPositions.some((num) => num == rootNodeSq.posX)) {
            this.side *= -1;
            return;
        }
        rootNodeSq.subtype = SUBTYPE_ROOTNODE;
        trunk.growthPlan.completed = false;
        trunk.growthPlan.postComplete = () => this.redistributeLeaves(trunk);

        var curY = rootNodeSq.posY - 1;
        while (curY >= trunkMinY) {
            trunk.growthPlan.steps.push(new GrowthPlanStep(
                trunk.growthPlan,
                0,
                this.trunkGrowTimeInDays,
                () => {
                    var node = this.growPlantSquarePos(rootNodeSq, rootNodeSq.posX, rootNodeSq.posY - 1);
                    node.subtype = SUBTYPE_TRUNK;
                    return node;
                },
                null
            ));
            curY -= 1;
        };
    }

    redistributeLeaves(trunk) {
        var xPositions = trunk.xPositions();
        var trunkMinY = Math.min(...trunk.yPositions());
        trunk.lifeSquares.forEach((lsq) => {
            if (lsq.posY == trunkMinY) {
                lsq.subtype = SUBTYPE_NODE;
            } else {
                lsq.subtype = SUBTYPE_TRUNK;
            }
            var middleLsq = this.lifeSquares.find((llsq) => llsq.posX == this.posX && llsq.posY == lsq.posY);
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
            var plan = this.gp_juvenile();
            if (plan != null)
                this.growthPlans.push(plan);
        }
        if (this.stage == STAGE_ADULT) {
            this.adultGrowthPlanning();
        }
    }
}