import { BaseSquare } from "./BaseSqaure.js";
import {
    global_plantToRealWaterConversionFactor,
    b_sq_waterContainmentMax,
    b_sq_nutrientValue,
    static_sq_waterContainmentMax,
    static_sq_waterContainmentTransferRate,
    drain_sq_waterContainmentMax,
    drain_sq_waterTransferRate,
    wds_sq_waterContainmentMax,
    wds_sq_waterContainmentTransferRate,
    b_sq_waterContainmentTransferRate,
    b_sq_waterContainmentEvaporationRate,
    b_sq_darkeningStrength,
    d_sq_nutrientValue,
    rain_dropChance,
    heavyrain_dropChance,
    rain_dropHealth,
    water_evaporationRate,
    water_viscocity,
    water_darkeningStrength,
    po_airSuckFrac,
    po_waterSuckFrac,
    po_rootSuckFrac,
    po_perFrameCostFracPerSquare,
    po_greenSquareSizeExponentCost,
    po_rootSquareSizeExponentCost,
    p_ls_airNutrientsPerExposedNeighborTick,
    p_seed_ls_sproutGrowthRate,
    p_seed_ls_neighborWaterContainmentRequiredToGrow,
    p_seed_ls_neighborWaterContainmentRequiredToDecay,
    p_seed_ls_darkeningStrength
    } from "../config/config.js"
    
    import { getOrganismsAtSquare } from "../organisms/_orgOperations.js";
    import { removeOrganism } from "../organisms/_orgOperations.js";
    import { removeSquareAndChildren } from "../globalOperations.js";
    import { getObjectArrFromMap } from "../common.js";
    import { getSquares } from "./_sqOperations.js";
    import { ALL_ORGANISMS } from "../globals.js";
class SeedSquare extends BaseSquare {
    constructor(posX, posY) {
        super(posX, posY);
        this.proto = "SeedSquare";
        this.colorBase = "#709775";
        this.nutrientValue = d_sq_nutrientValue;
        this.rootable = true;
        this.organic = true;
    }
    physics() {
        super.physics();

        getSquares(this.posX, this.posY + 1)
            .filter((sq) => sq.rootable)
            .forEach((sqBelow) => {
                var organismsBelow = getOrganismsAtSquare(sqBelow.posX, sqBelow.posY) ;
                if (organismsBelow.length == 0) {
                    getOrganismsAtSquare(this.posX, this.posY).forEach((org) => {
                        removeOrganism(org);
                        org.posY += 1;
                        org.associatedSquares.forEach((sq) => sq.posY += 1);
                        getObjectArrFromMap(ALL_ORGANISMS, org.posX, org.posY).push(org);
                    });
                }
                removeSquareAndChildren(this);
            })
    }
}

export {SeedSquare}