import { removeSquare } from "../globalOperations.js";
import { removeOrganismSquare } from "../squares/_sqOperations.js";
import { removeOrganism } from "./_orgOperations.js";
import { Law } from "../Law.js";
import { randNumber } from "../common.js";
import { getCurTime } from "../globals.js";
import { getNextEntitySpawnId } from "../globals.js";

class BaseOrganism {
    constructor(square) {
        this.proto = "BaseOrganism";
        this.posX = square.posX;
        this.posY = square.posY;
        this.lifeSquares = new Array();
        this.type = "base";
        this.law = new Law();
        this.spawnedEntityId = 0;
        this.width = 0.95;
        this.xOffset = 0.5;
        this.alive = true;

        this.spawnTime = getCurTime();
        this.currentEnergy = 0;
        this.totalEnergy = 0;

        // life cycle properties
        this.maxLifeTime = 1000 * 40 * 1;
        this.reproductionEnergy = 1000;
        this.reproductionEnergyUnit = 300;
        this.perNewLifeSquareGrowthCost = 10;
        this.maximumLifeSquaresOfType = {}
        this.lifeSquaresCountByType = {};
        this.spawnedEntityId = getNextEntitySpawnId();
        this.linkSquare(square);
        this.growInitialSquares();
    }

    linkSquare(square) {
        this.linkedSquare = square;
        square.linkedOrganism = this;
    }
    unlinkSquare() {
        this.linkedSquare = null;
    }

    addAssociatedLifeSquare(lifeSquare) {
        this.lifeSquares.push(lifeSquare);
        if (!(lifeSquare.type in this.lifeSquaresCountByType)) {
            this.lifeSquaresCountByType[lifeSquare.type] = 0;
        }
        this.lifeSquaresCountByType[lifeSquare.type] += 1;
    }
    removeAssociatedLifeSquare(lifeSquare) {
        this.lifeSquaresCountByType[lifeSquare.type] -= 1;
        this.lifeSquares = Array.from(this.lifeSquares.filter((lsq) => lsq != lifeSquare));
        lifeSquare.destroy();
    }

    preRender() {}

    spawnSeed() {
        var seedSquare = this.getSeedSquare();
        if (seedSquare != null) {
            seedSquare.speedX = Math.floor(randNumber(-3, 3));
            seedSquare.speedY = Math.floor(randNumber(-3, -1));
            return true;
        } else {
            return false;
        }
    }

    getSeedSquare() {
        return null; // should be a SeedSquare with a contained PlantSeedOrganism or similar
    }

    getCountOfAssociatedSquaresOfProto(proto) {
        return Array.from(this.lifeSquares.filter((org) => org.proto == proto)).length;
    }
    getCountOfAssociatedSquaresOfType(type) {
        return Array.from(this.lifeSquares.filter((org) => org.type == type)).length;
    }

    growInitialSquares() { return new Array(); }

    render() {
        this.preRender();
        this.lifeSquares.forEach((sp) => sp.render())
    }

    destroy() {
        this.lifeSquares.forEach((lifeSquare) => lifeSquare.destroy());
        this.alive = false;
        removeOrganism(this);
    }

    process() {
        this.preTick();
        this.tick();
        this.postTick();
    }

    preTick() {
        this.lifeSquares.forEach((sp) => sp.preTick())
    }

    tick() {
        this.lifeSquares.forEach((sp) => sp.tick())
    }

    getLifeCyclePercentage() {
        return (getCurTime() - this.spawnTime) / this.maxLifeTime;
    }

    getCurrentEnergyPercentage() {
        return this.currentEnergy / this.reproductionEnergy;
    }

    postTick() {
        this.lifeSquares.forEach((lifeSquare) => {
            this.dirtNutrients += lifeSquare.dirtNutrients;
            this.waterNutrients += lifeSquare.waterNutrients;
            this.airNutrients += lifeSquare.airNutrients;
        });

        var energyGained = this.law.photosynthesis(this.airNutrients - this.totalEnergy, this.waterNutrients - this.totalEnergy, this.dirtNutrients - this.totalEnergy);

        this.currentEnergy += energyGained;
        this.totalEnergy += energyGained;

        var lifeCyclePercentage = this.getLifeCyclePercentage();
        if (lifeCyclePercentage > 1) {
            this.destroy();
        }

        var currentEnergyPercentage = this.getCurrentEnergyPercentage();
        var totalEnergyLifeCycleRate = this.totalEnergy / lifeCyclePercentage;

        if (currentEnergyPercentage > 1) {
            this.spawnSeed();
            this.currentEnergy -= this.reproductionEnergyUnit;
            return;
        }

        var projectedEnergyAtEOL = this.currentEnergy + totalEnergyLifeCycleRate * (1 - lifeCyclePercentage);
        if (projectedEnergyAtEOL < this.reproductionEnergy * 2) {
            this.growAndDecay();
            return;
        } else {
            return;
        }
    }

    growAndDecay() {}
}

export {BaseOrganism}