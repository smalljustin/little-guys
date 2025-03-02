import { getCurDay, getDt } from "../climate/time.js";
import { getWindSpeedAtLocation } from "../climate/wind.js";
import { STATE_DEAD, STATE_DESTROYED, STATE_HEALTHY, STATE_THIRSTY } from "./Stages.js";
import { getGlobalThetaBase } from "../globals.js";

const ROLLING_AVERAGE_PERIOD = 200;
export class GrowthPlan {
    constructor(posX, posY, required, endStage, theta, twist, baseRotation, baseDeflection, baseCurve, type, strengthMult) {
        this.posX = posX;
        this.posY = posY;
        this.required = required;
        this.steps = new Array(); // GrowthPlanStep
        this.endStage = endStage;
        this.theta = theta;
        this.baseRotation = baseRotation;
        this.baseDeflection = baseDeflection;
        this.baseCurve = baseCurve;
        this.type = type;
        this.completed = false;
        this.stepLastExecuted = 0;
        this.component = new GrowthComponent(
            this,
            this.steps.filter((step) => step.completed).map((step) => step.completedSquare),
            theta, twist, baseRotation, baseDeflection, baseCurve, type, strengthMult)
    }

    areStepsCompleted() {
        return this.steps.every((step) => step.completed);
    }

    postConstruct() {
        console.warn("Warning: postconstruct not implemented");
    }

    postComplete() { };

    setBaseDeflectionOverTime(deflectionOverTimeList) {
        this.deflectionOverTimeList = deflectionOverTimeList;
        this.component.deflectionOverTimeList = deflectionOverTimeList;
    }

    setBaseRotationOverTime(rotationOverTimeList) {
        this.rotationOverTimeList = rotationOverTimeList;
        this.component.rotationOverTimeList = rotationOverTimeList;
    }

    complete() {
        this.completed = true;
        this.postComplete();
    }

    executePostConstruct() {
        this.postConstruct();
        this.postConstruct = () => null;
    }

}

export class GrowthPlanStep {
    constructor(growthPlan, energyCost, timeCost, growSqAction, otherAction) {
        this.growthPlan = growthPlan;
        this.energyCost = energyCost;
        this.timeCost = timeCost;
        this.growSqAction = growSqAction;
        this.otherAction = otherAction;
        this.completed = false;
        this.completedSquare = null;
    }

    doAction() {
        if (this.growSqAction != null) {
            var newLifeSquare = this.growSqAction(); // TODO: This can't be a lambda! Saving and loading breaks it.
            this.completed = true;
            if (newLifeSquare) {
                this.completedSquare = newLifeSquare;
                newLifeSquare.component = this.growthPlan.component;
            }
            this.growthPlan.executePostConstruct();
            this.growthPlan.component.addLifeSquare(newLifeSquare);
        } else {
            this.growthPlan.steps = Array.from(this.growthPlan.steps.filter((step) => step != this));
        }
        if (this.otherAction != null) {
            this.otherAction();
            this.completed = true;
        }
    }
}

export class GrowthComponent {
    constructor(growthPlan, lifeSquares, theta, twist, baseRotation, baseDeflection, baseCurve, type, strengthMult) {
        this.growthPlan = growthPlan;
        this.lifeSquares = lifeSquares;
        this.theta = theta;
        this.twist = twist;
        this.baseRotation = baseRotation;
        this.baseDeflection = baseDeflection;
        this.baseCurve = baseCurve;
        this.type = type;

        this.posX = growthPlan.posX;
        this.posY = growthPlan.posY;

        this.xOffset = 0;
        this.yOffset = 0;

        this.currentDeflection = 0;
        this.deflectionRollingAverage = 10 ** 8;
        this.strengthMult = strengthMult;
        this.children = new Array();
        this.parentComponent = null;
        this.setCurrentDeflection(baseDeflection);
        this.distToFront = 0;
        this.spawnTime = getCurDay();
    }

    getChildPath(searchChild) {
        for (let i = 0; i < this.children.length; i++) {
            let child = this.children[i];
            if (child == searchChild) {
                return [i];
            }
            let childSearch = child.getChildPath(searchChild);
            if (childSearch !== -1) {
                return [i, ...childSearch]
            }
        }
        return -1;
    }

    getChildFromPath(childPath) {
        if (childPath.length == 1) {
            return this.children.at(childPath);
        } else {
            return this.children.at(childPath.at(0)).getChildFromPath(childPath.slice(1));
        }
    }

    strength() {
        return this.strengthMult * this.lifeSquares.map((lsq) => lsq.strength).reduce(
            (accumulator, currentValue) => accumulator + currentValue,
            0,
        ) * (this.xSize()) / this.ySize();
    }

    setBaseDeflectionOverTime(deflectionOverTimeList) {
        this.deflectionOverTimeList = deflectionOverTimeList;
        this.growthPlan.deflectionOverTimeList = deflectionOverTimeList;
    }

    setBaseRotationOverTime(rotationOverTimeList) {
        this.rotationOverTimeList = rotationOverTimeList;
        this.growthPlan.rotationOverTimeList = rotationOverTimeList;
    }

    addLifeSquare(newLsq) {
        this.children.filter((child) => child.posX == newLsq.posX && child.posY <= newLsq.posY)
            .forEach((child) => child.shiftUp());

        this.lifeSquares.filter((llsq) => llsq.proto == newLsq.proto && llsq.posX == newLsq.posX && llsq.posY <= newLsq.posY)
            .forEach((llsq) => {
                llsq.shiftUp();
            });

        this.lifeSquares.push(newLsq);
    }

    updatePosition(newPosX, newPosY) {
        var dx = newPosX - this.posX;
        var dy = newPosY - this.posY;

        this.lifeSquares.forEach((lsq) => lsq.updatePositionDifferential(dx, dy));
        this.children.forEach((child) => child.updatePosition(newPosX, newPosY));

        this.posX = newPosX;
        this.posY = newPosY;
    }

    shiftUp() {
        this.posY -= 1;
        this.lifeSquares.forEach((lsq) => lsq.shiftUp());
        this.children.forEach((child) => child.shiftUp());
    }

    xPositions() {
        return this.lifeSquares.map((lsq) => lsq.posX);
    }

    yPositions() {
        return this.lifeSquares.map((lsq) => lsq.posY);
    }

    xSize() {
        if (this.lifeSquares.length <= 1) {
            return 1;
        }
        var xPositions = this.lifeSquares.map((lsq) => lsq.posX);
        return 1 + Math.max(...xPositions) - Math.min(...xPositions);
    }

    getTheta() {
        if (this.parentComponent == null) {
            return this.theta + getGlobalThetaBase();
        }
        return this.theta + this.parentComponent.getTheta();
    }

    getTwist() {
        if (this.parentComponent == null) {
            return this.twist;
        }
        return this.twist + this.parentComponent.getTwist();
    }

    ySize() {
        var yPositions = this.lifeSquares.map((lsq) => lsq.posY);
        return 1 + Math.max(...yPositions) - Math.min(...yPositions);
    }

    xSizeCur() {
        return this.lifeSquares.length / Math.max(1, this.ySize());
    }

    ySizeCur() {
        return this.lifeSquares.length / Math.max(1, this.xSize());
    }

    addChild(childComponent) {
        if (this.children.indexOf(childComponent) != -1) {
            return;
        }
        this.children.push(childComponent);
        childComponent.parentComponent = this;
    }

    updateDeflectionState() {
        var strength = this.getTotalStrength();
        var windVec = this.getNetWindSpeed();
        var startSpringForce = this.getStartSpringForce();
        var windX = Math.sin(this.getTheta()) * windVec[0] * 0.1;
        var coef = 0.05;

        var endSpringForce = startSpringForce * (1 - coef) + windX * coef;
        endSpringForce = Math.min(endSpringForce, strength);
        endSpringForce = Math.max(endSpringForce, -strength);
        this.setCurrentDeflection(Math.asin(endSpringForce / (strength)));
        this.children.forEach((child) => child.updateDeflectionState());
    }

    getDeflectionXAtPosition(posX, posY) {
        return this.lifeSquares.filter((lsq) => lsq.posX == posX && lsq.posY == posY).map((lsq) => lsq.deflectionXOffset).at(0);
    }

    getDeflectionYAtPosition(posX, posY) {
        return this.lifeSquares.filter((lsq) => lsq.posX == posX && lsq.posY == posY).map((lsq) => lsq.deflectionYOffset).at(0);
    }

    getCurrentDeflection() {
        if (this.parentComponent == null) {
            return this.currentDeflection + this.baseDeflection;
        } else {
            return this.currentDeflection + this.baseDeflection + this.parentComponent.getCurrentDeflection();
        }
    }

    getBaseRotation() {
        var ret = this._getBaseRotation();
        if (this.parentComponent != null) {
            ret += this.parentComponent.getBaseRotation();
        }
        return ret;
    }

    _getBaseRotation() {
        if (this.rotationOverTimeList == null) {
            return this.baseRotation;
        } else {
            if (this.rotationOverTimeList.length != 2) {
                alert("just fyi, this is not implemented yet. just send 2 for now and update them through your growth cycles");
            }
            var mapped = this.rotationOverTimeList.map((l) => l[0]);

            var min = Math.min(...mapped);
            var max = Math.max(...mapped);

            var ot = getCurDay() - this.spawnTime;

            if (ot > max) {
                return this.rotationOverTimeList[this.rotationOverTimeList.length - 1][1];
            }
            if (ot < min) {
                return this.rotationOverTimeList[0][1];
            } else { // assuming this has two entries at the moment
                var rel = (ot - min) / (max - min);
                return this.rotationOverTimeList[0][1] * (1 - rel) + this.rotationOverTimeList[1][1] * rel;
            }
        }
    }

    getDistToFront() {
        if (this.parentComponent == null) {
            return this.distToFront;
        } else {
            return this.distToFront + this.parentComponent.getDistToFront();
        }
    }

    getParentDeflection() {
        if (this.parentComponent == null) {
            return 0;
        } else {
            return Math.cos(this.theta) * (this.parentComponent.currentDeflection + this.parentComponent.getParentDeflection());
        }
    }

    /**
     * Override this method directly on a child organism. 
     * 'curWilt' is a value from 0 to 1, where 0 is least wilted and 1 is most wilted.
     * This value is applied to the 'curve' of a grown component.
     */
    _getWilt(wilt) {
        return wilt;
    }

    getWilt() {
        if (this.lifeSquares.length == 0) {
            return 0;
        }
        return this._getWilt(this.lifeSquares.at(0).linkedOrganism.curWilt);
    }

    applyDeflectionState(parentComponent) {
        var startDeflectionXOffset = 0;
        var startDeflectionYOffset = 0;
        if (parentComponent != null) {
            startDeflectionXOffset = parentComponent.getDeflectionXAtPosition(this.posX, this.posY);
            startDeflectionYOffset = parentComponent.getDeflectionYAtPosition(this.posX, this.posY);
        }

        var curve = this.baseCurve + Math.sin(this.currentDeflection) * 0.06 * (this.ySizeCur() - 1) / this.getTotalStrength();

        var startTheta = this.deflectionRollingAverage + this.getParentDeflection();
        var endTheta = this.currentDeflection + curve + this.getParentDeflection() + this.getWilt();

        var length = this.ySizeCur();

        var thetaDelta = endTheta - startTheta;

        this.lifeSquares.forEach((lsq) => {
            // relative to origin
            var relLsqX = this.posX - lsq.posX;
            var relLsqY = this.posY - lsq.posY;
            var lsqDist = (relLsqX ** 2 + relLsqY ** 2) ** 0.5;
            var currentTheta = startTheta + (lsqDist / length) * thetaDelta;

            var offsetX = relLsqX * Math.cos(currentTheta) - relLsqY * Math.sin(currentTheta);
            var offsetY = relLsqY * Math.cos(currentTheta) + relLsqX * Math.sin(currentTheta);

            this.distToFront = offsetX * Math.cos(this.getTheta());
            lsq.distToFront = this.getDistToFront();
            offsetX *= Math.sin(this.getTheta());
            offsetY *= Math.cos(this.getTwist());

            var endX = startDeflectionXOffset + offsetX;
            var endY = startDeflectionYOffset + offsetY;

            lsq.deflectionXOffset = (endX - relLsqX) + this.xOffset;
            lsq.deflectionYOffset = (endY - relLsqY) + this.yOffset;
        })

        this.children.forEach((child) => child.applyDeflectionState(this));
    }

    getTotalStrength() {
        return Math.max(1, this.strength());
    }

    getTotalLifeSquares() {
        return Math.max(1, this.lifeSquares.length + this.children.map((gc) => this.lifeSquares.length).reduce(
            (accumulator, currentValue) => accumulator + currentValue,
            0,
        ));
    }

    getNetWindSpeed() {
        if (this.parentComponent == null) {
            return this._getNetWindSpeed();
        } else {
            var ret = this._getNetWindSpeed();
            this.children.forEach((child) => {
                var childWs = child.getNetWindSpeed();
                ret[0] += childWs[0];
                ret[1] += childWs[1];
            });
            return ret;
        }
    }

    _getNetWindSpeed() {
        return this.lifeSquares.map((lsq) => getWindSpeedAtLocation(lsq.getPosX(), lsq.getPosY())).reduce(
            (accumulator, currentValue) => [accumulator[0] + currentValue[0], accumulator[1] + currentValue[1]],
            [0, 0]
        );
    }
    getStartSpringForce() {
        return Math.sin(this.getBaseDeflection() - this.deflectionRollingAverage) * this.getTotalStrength();
    }

    getBaseDeflection() {
        if (this.parentComponent == null) {
            return this._getBaseDeflection();
        } else {
            return this._getBaseDeflection() + this.parentComponent.getBaseDeflection();
        }
    }

    _getBaseDeflection() {
        if (this.deflectionOverTimeList == null) {
            return this.baseDeflection;
        } else {
            if (this.deflectionOverTimeList.length != 2) {
                alert("just fyi, this is not implemented yet. just send 2 for now and update them through your growth cycles");
            }
            var mapped = this.deflectionOverTimeList.map((l) => l[0]);

            var min = Math.min(...mapped);
            var max = Math.max(...mapped);

            var ot = getCurDay() - this.spawnTime;

            if (ot > max) {
                return this.deflectionOverTimeList[this.deflectionOverTimeList.length - 1][1];
            }
            if (ot < min) {
                return this.deflectionOverTimeList[0][1];
            } else {
                var rel = (ot - min) / (max - min);
                return this.deflectionOverTimeList[0][1] * (1 - rel) + this.deflectionOverTimeList[1][1] * rel;
            }
        }
    }

    setCurrentDeflection(deflection) {
        this.currentDeflection = deflection;
        if (this.deflectionRollingAverage == 10 ** 8) {
            this.deflectionRollingAverage = deflection;
        } else {
            this.deflectionRollingAverage = this.deflectionRollingAverage * ((ROLLING_AVERAGE_PERIOD - 1) / ROLLING_AVERAGE_PERIOD) + deflection * (1 / ROLLING_AVERAGE_PERIOD);
        }
    }

    someSquareTouchingGround() {
        return this.lifeSquares.some((lsq) =>
            lsq.type == "green" &&
            lsq.state != STATE_DESTROYED &&
            lsq.groundTouchSquare() != null)
            || this.children.some((child) => child.someSquareTouchingGround());
    }

    decay(amount) {
        amount *= Math.min(0.01, getDt());
        var livingLifeSquares = Array.from(this.lifeSquares
            .filter((lsq) => lsq.state == STATE_HEALTHY || lsq.state == STATE_THIRSTY));
        if (livingLifeSquares.length > 0) {
            livingLifeSquares.filter((lsq) => Math.random() > 1 - 0.05).forEach((lsq) => lsq.state = STATE_DEAD);
        }
        this.baseDeflection += amount;
        this.children.forEach((child) => child.decay(amount / 2));
        this.lifeSquares.filter((lsq) =>
            lsq.type == "green" &&
            lsq.state == STATE_DEAD &&
            lsq.groundTouchSquare() != null).forEach((lsq) => lsq.doGroundDecay());
            
    }
}