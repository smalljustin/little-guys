import { getNeighbors } from "../../../squares/_sqOperations.js";
import { BaseLifeSquare } from "../../BaseLifeSquare.js";
import { SUBTYPE_DEAD, SUBTYPE_LEAF, SUBTYPE_LEAFSTEM, SUBTYPE_NODE, SUBTYPE_SHOOT, SUBTYPE_SPROUT, SUBTYPE_STEM, SUBTYPE_TRUNK } from "../../../organisms/Stages.js";
import { hexToRgb } from "../../../common.js";

export class PalmTreeGreenSquare extends BaseLifeSquare {
    constructor(square, organism) {
        super(square, organism);
        this.proto = "PalmTreeGreenSquare";
        this.type = "green";

        this.activeRenderSubtype = null;
    }

    
    subtypeColorUpdate() {
        switch (this.subtype) {
            case SUBTYPE_TRUNK:
            case SUBTYPE_SHOOT:
            case SUBTYPE_SPROUT:
                this.baseColor = "#a28575";
                this.darkColor = "#6f544b";
                this.accentColor = "#351e0f";
                break;
            case SUBTYPE_LEAF:
            case SUBTYPE_LEAFSTEM:
                this.baseColor = "#334718";
                this.darkColor = "#757826";
                this.accentColor = "#a79228";
                break;
            case SUBTYPE_NODE:
                this.baseColor = "#5b4238";
                this.darkColor = "#5c4a3c";
                this.accentColor = "#613d2a";
                break;
            case SUBTYPE_DEAD:
                this.baseColor = "#70747e";
                this.darkColor = "#a1816d";
                this.accentColor = "#33261d";
                break;
            default:
                console.warn("BIPPITY BOPPITY")
        }

        this.activeRenderSubtype = this.subtype;
        this.baseColor_rgb = hexToRgb(this.baseColor);
        this.darkColor_rgb = hexToRgb(this.darkColor);
        this.accentColor_rgb = hexToRgb(this.accentColor);

    }

    preTick() {
        if (this.activeRenderSubtype != this.subtype) {
            this.subtypeColorUpdate();
        }
    }


    tick() {
        this.addAirNutrient(
            airNutrientsPerEmptyNeighbor.value *
            (
                8 - getNeighbors(this.posX, this.posY)
                    .filter((sq) => !sq.surface)
                    .map((sq) => 1)
                    .reduce(
                        (accumulator, currentValue) => accumulator + currentValue,
                        0,
                    ))
        );
    }
}