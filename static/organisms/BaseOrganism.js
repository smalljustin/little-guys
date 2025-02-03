import { removeOrganism } from "./_orgOperations.js";
import { getStandardDeviation, randNumber } from "../common.js";
import { getCurDay, getCurTime } from "../time.js";
import { getNextEntitySpawnId } from "../globals.js";
import { getWindSpeedAtLocation } from "../wind.js";
import { lightingRegisterLifeSquare } from "../lighting.js";

class BaseOrganism {
    constructor(square) {
        this.proto = "BaseOrganism";
        this.posX = square.posX;
        this.posY = square.posY;
        this.stage = STAGE_SPROUT;
        this.stages = [
            STAGE_SPROUT,
            STAGE_JUVENILE,
            STAGE_ADULT,
            STAGE_FLOWER,
            STAGE_FRUIT
        ];
        this.originGrowth = null;
        this.spinnable = false;

        this.lifeSquares = new Array();
        this.growthPlans = [];
        this.lastGrownMap = {};
        this.linkSquare(square);
        this.maxSquaresOfTypePerDay = 1000;
        this.stageTimeMap = { STAGE_SPROUT: 0 };

        this.greenType = null;
        this.rootType = null;

        this.curWilt = 0;
        this.waterPressure = -2;
        this.waterPressureTarget = -2;
        this.waterPressureWiltThresh = -3;
        this.waterPressureDieThresh = -5;
        this.waterPressureOverwaterThresh = -1;
        this.transpirationRate = 0.001;
        this.rootPower = 2;

        this.ph = 7;
        this.nitrogen = 0;
        this.phosphorus = 0;

        this.applyWind = false;
        this.springCoef = 4;
        this.startDeflectionAngle = 0;
        this.lastDeflectionStateRollingAverage = 0;
        this.lastDeflectionStateThetaRollingAveragePeriod = 1000;
        this.deflectionIdx = 0;
        this.deflectionStateTheta = 0;
        this.deflectionStateFunctions = [];

        this.rootOpacity = 0.4;
    }

    // WIND DEFLECTION 


    updateDeflectionState() {
        if (this.originGrowth != null) {
            this.originGrowth.updateDeflectionState();
        }
    }

    applyDeflectionStateToSquares() {
        if (this.originGrowth != null) {
            this.originGrowth.applyDeflectionState(null);
        }
    }

    // WATER SATURATION

    waterSaturationAndPhTick() {
        let amountOfWaterTransferred = 0;
        let sumPh = 0;
        this.lifeSquares
            .filter((lsq) => lsq.type == "root")
            .filter((lsq) => lsq.linkedSquare != null && lsq.linkedSquare.proto == "SoilSquare")
            .filter((lsq) => (this.rootPower + lsq.linkedSquare.getSoilWaterPressure()) > this.waterPressure)
            .forEach((lsq) => {
                var amountOfWater = 0;
                if (this.waterPressure < this.waterPressureTarget) {
                    amountOfWater = lsq.linkedSquare.suckWater(this.transpirationRate);
                } else {
                    amountOfWater = lsq.linkedSquare.suckWater(this.transpirationRate / 10);
                };
                amountOfWaterTransferred += amountOfWater;
                sumPh += amountOfWaterTransferred * lsq.linkedSquare.ph;
            });
        
        this.ph = (this.ph * this.waterPressure + sumPh) / (this.waterPressure + amountOfWaterTransferred)
        this.waterPressure += amountOfWaterTransferred;

        // todo: make this humidfy the air
        this.waterPressure -= (this.lifeSquares.length * this.transpirationRate) / 10;
        this.wilt();
    }

    nutrientTick() {
        
        
        this.lifeSquares
            .filter((lsq) => lsq.type == "root")
            .filter((lsq) => lsq.linkedSquare != null && lsq.linkedSquare.proto == "SoilSquare")
        
        

    }

    wilt() {
        if (this.lifeSquares.length == 0) {
            return;
        }
        var greenLifeSquares = Array.from(this.lifeSquares.filter((lsq) => lsq.type == "green"));
        if (greenLifeSquares.length == 0) {
            return;
        }
        if (this.waterPressure < this.waterPressureWiltThresh) {
            this.curWilt += 0.01;
            var lifeSquareToThirstify = greenLifeSquares.at(randNumber(0, greenLifeSquares.length - 1));
            if (lifeSquareToThirstify.state == STATE_HEALTHY) {
                lifeSquareToThirstify.state = STATE_THIRSTY;
            } else if (lifeSquareToThirstify.state == STATE_THIRSTY) {
                lifeSquareToThirstify.state = STATE_DEAD;
            }
        } else {
            this.curWilt -= 0.01;
            var lifeSquareToRevive = greenLifeSquares.at(randNumber(0, greenLifeSquares.length - 1));
            if (lifeSquareToRevive.state != STATE_DEAD) {
                lifeSquareToRevive.state = STATE_HEALTHY;
            }
        }

        if (this.waterPressure > this.waterPressureOverwaterThresh) {
            var lifeSquareToKill = greenLifeSquares.at(randNumber(0, greenLifeSquares.length - 1));
            lifeSquareToKill.state = STATE_DEAD;
        }

        this.curWilt = Math.max(0, this.curWilt);
        this.curWilt = Math.min(Math.PI / 2, this.curWilt);

        var totalDead = Array.from(greenLifeSquares.filter((lsq) => lsq.state == STATE_DEAD)).length;

        if (totalDead > greenLifeSquares.length * 0.5) {
            this.destroy();
        }

    }

    // PHYSICAL SQUARES
    linkSquare(square) {
        this.linkedSquare = square;
        square.linkOrganism(this);
    }
    unlinkSquare() {
        this.linkedSquare = null;
    }

    // LIFE SQUARES
    addAssociatedLifeSquare(lifeSquare) {
        this.lifeSquares.push(lifeSquare);
        var pred = (lsq) => lsq.lighting != null && lsq.lighting.length > 0;
        if (this.lifeSquares.some(pred)) {
            lifeSquare.lighting = this.lifeSquares.reverse().find(pred).lighting;
        }
    }
    removeAssociatedLifeSquare(lifeSquare) {
        this.lifeSquares = Array.from(this.lifeSquares.filter((lsq) => lsq != lifeSquare));
        lifeSquare.destroy();
    }

    // COMPONENT GROWTH
    growPlantSquarePos(parentSquare, posX, posY) {
        var newPlantSquare = new PlantSquare(posX, posY);
        if (addSquare(newPlantSquare)) {
            var newGreenSquare = addOrganismSquare(new this.greenType(newPlantSquare, this));
            if (newGreenSquare) {
                this.addAssociatedLifeSquare(newGreenSquare);
                newGreenSquare.linkSquare(newPlantSquare);
                parentSquare.addChild(newPlantSquare);
                return newGreenSquare;
            }
        }
        return null;
    }

    growPlantSquare(parentSquare, dx, dy) {
        var newPlantSquare = new PlantSquare(parentSquare.posX + dx, parentSquare.posY - dy);
        if (addSquare(newPlantSquare)) {
            var newGreenSquare = addOrganismSquare(new this.greenType(newPlantSquare, this));
            if (newGreenSquare) {
                this.addAssociatedLifeSquare(newGreenSquare);
                newGreenSquare.linkSquare(newPlantSquare);
                parentSquare.addChild(newPlantSquare);
                return newGreenSquare;
            }
        }
        return null;
    }

    getAllComponentsofType(componentType) {
        return this._getAllComponentsofType(componentType, this.originGrowth);
    }

    _getAllComponentsofType(componentType, component) {
        var out = [];
        out.push(...component.children.filter((child) => child.type === componentType));
        component.children.forEach((child) => out.push(...this._getAllComponentsofType(componentType, child)));
        return out;
    }

    getOriginsForNewGrowth(subtype) {
        return this._getOriginForNewGrowth(subtype, this.originGrowth);
    }

    _getOriginForNewGrowth(subtype, component) {
        var out = new Array();
        out.push(...component.lifeSquares.filter((sq) => sq.subtype == subtype))
        component.children.forEach((child) => out.push(...this._getOriginForNewGrowth(subtype, child)));
        return out;
    }
    gp_sprout() {
        if (this.linkedSquare.currentPressureDirect > 0) {
            this.destroy();
            return;
        }
        var growthPlan = new GrowthPlan(this.posX, this.posY, true, STAGE_JUVENILE, Math.PI / 2, 0, 0, 0, 0, TYPE_HEART, 10 ** 8);
        growthPlan.steps.push(new GrowthPlanStep(
            growthPlan,
            0,
            0,
            () => {
                var rootSq = new this.rootType(this.linkedSquare, this);
                rootSq.linkSquare(this.linkedSquare);
                rootSq.subtype = SUBTYPE_ROOTNODE;
                if (this.linkedSquare != null && this.linkedSquare != -1) {
                    this.linkedSquare.linkOrganismSquare(rootSq);
                }
                this.addAssociatedLifeSquare(rootSq);
                return rootSq;
            }
        ));
        growthPlan.postConstruct = () => this.originGrowth = growthPlan.component;
        return growthPlan;
    }

    executeGrowthPlans() {
        if (!this.alive) {
            return;
        }
        // if (!this.shouldGrow) {
        //     return;
        // }
        var anyStepFound = false;
        var timeBudget = getCurDay() - getPrevDay();
        this.growthPlans.filter((gp) => !gp.completed).forEach((growthPlan) => {
            anyStepFound = true;
            growthPlan.steps.filter((step) => !step.completed).forEach((step) => {
                if (
                    (getCurDay() + timeBudget >= growthPlan.stepLastExecuted + step.timeCost) &&
                    (this.currentEnergy >= step.energyCost)
                ) {
                    step.doAction();
                    step.growthPlan.stepLastExecuted = getCurDay();
                    this.currentEnergy -= step.energyCost;
                    if (this.originGrowth != null) {
                        this.originGrowth.updateDeflectionState();
                        this.originGrowth.applyDeflectionState();
                    }
                };
            });
            if (growthPlan.areStepsCompleted()) {
                growthPlan.complete();
                this.stage = growthPlan.endStage;
            }
            if (growthPlan.required && growthPlan.steps.some((step) => step.completedSquare == null)) {
                this.destroy();
            }
        });

        if (!anyStepFound) {
            this.planGrowth();
        }
    }

    growRoot(f) {
        var targetSquare = null;
        var targetSquareParent = null;
        this.lifeSquares.filter((lsq) => lsq.type == "root").forEach((lsq) => {
            getDirectNeighbors(lsq.posX, lsq.posY)
                .filter((_sq) => _sq != null)
                .filter((_sq) => _sq.rootable)
                .filter((_sq) => getOrganismSquaresAtSquareWithEntityId(_sq, this.spawnedEntityId).length == 0)
                .filter((_sq) => targetSquare == null || f(targetSquare) < f(_sq))
                .forEach((_sq) => {targetSquare = _sq; targetSquareParent = lsq});
        });
        if (targetSquare == null) {
            return;
        }

        var newRootLifeSquare = addOrganismSquare(new this.rootType(targetSquare, this));
        if (newRootLifeSquare) {
            this.addAssociatedLifeSquare(newRootLifeSquare);
            newRootLifeSquare.linkSquare(targetSquare);
            targetSquareParent.addChild(newRootLifeSquare)
            targetSquare.linkOrganismSquare(newRootLifeSquare);
        }
    }

    // ** PLAN GROWTH METHOD IMPLEMENTED BY ORGANISMS 
    planGrowth() {}


    // RENDERING
    render() {
        this.lifeSquares.forEach((sp) => sp.render())
    }

    // DESTRUCTION
    destroy() {
        this.lifeSquares.forEach((lifeSquare) => lifeSquare.destroy());
        if (this.linkedSquare != null && this.linkedSquare != -1) {
            this.linkedSquare.unlinkOrganism();
        }
        removeOrganism(this);
    }

    // ** OUTER TICK METHOD INVOKED EACH FRAME
    // -- these methods are universal to every organism
    process() {
        this.lifeSquares.forEach((sp) => sp.tick());
        this.waterSaturationAndPhTick();
        this.updateDeflectionState();
        this.applyDeflectionStateToSquares();
        this.lifeSquares = this.lifeSquares.sort((a, b) => a.distToFront - b.distToFront);
    }
}

export { BaseOrganism }