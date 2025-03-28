import { BaseLifeSquare } from "../../BaseLifeSquare.js";
import { STATE_DEAD, STATE_THIRSTY, SUBTYPE_TRUNK, SUBTYPE_LEAF, SUBTYPE_NODE, SUBTYPE_SHOOT, SUBTYPE_SPROUT, SUBTYPE_STEM, SUBTYPE_FLOWER, SUBTYPE_FLOWERNODE } from "../../../organisms/Stages.js";
import { addNewOrganism } from "../../../organisms/_orgOperations.js";
import { WheatSeedOrganism } from "../../../organisms/agriculture/WheatOrganism.js";
import { addSquare } from "../../../squares/_sqOperations.js";
import { SeedSquare } from "../../../squares/SeedSquare.js";
import { CattailSeedOrganism } from "../../../organisms/midwest/CattailOrganism.js";
import { MushroomSeedOrganism } from "../../../organisms/fantasy/MushroomOrganism.js";
import { getCurDay } from "../../../climate/time.js";
import { hueShiftColorArr, rgbToHex, rgbToRgba } from "../../../common.js";

export class MushroomGreenSquare extends BaseLifeSquare {
    constructor(square, organism) {
        super(square, organism);
        this.proto = "MushroomGreenSquare";
        this.type = "green";
        this.width = 1;
        this.activeRenderSubtype = null;
        this.LSQ_RENDER_SIZE_MULT = 1;
    }

    applySubtypeRenderConfig() {
        switch (this.subtype) {
            case SUBTYPE_FLOWERNODE:
            case SUBTYPE_FLOWER:
                this.baseColor = "#542f1f";
                this.darkColor = "#301a11";
                this.accentColor = "#3b231a";
                this.width = 1.4 + (0.1 * Math.random())
                break;
            case SUBTYPE_TRUNK:
            case SUBTYPE_SHOOT:
            case SUBTYPE_SPROUT:
            case SUBTYPE_STEM:
                if (this.linkedOrganism.evolutionParameters[1] == 0) {
                    this.baseColor = "#def6fc";
                    this.darkColor = "#7290ba";
                    this.accentColor = "#657373"; 
                } else {
                    this.baseColor = "#450c1f";
                    this.darkColor = "#380726";
                    this.accentColor = "#400622"; 
                }
                break;
            case SUBTYPE_NODE:
            case SUBTYPE_LEAF:
                this.baseColor = "#13346d";
                this.darkColor = "#0e55ae";
                this.accentColor = "#6da6e3";
                this.width = 1
                break;
            default:
                console.warn("Subtype doesn't have a display configuration!")
        }
        if (this.subtype != SUBTYPE_STEM) {
            let hueShift = ((this.linkedOrganism.evolutionParameters[1] == 1) ? 100 : 0) + 100 * this.linkedOrganism.evolutionParameters[0];
            this.accentColor = rgbToHex(...hueShiftColorArr(this.accentColor, hueShift, 0,0));
            this.darkColor = rgbToHex(...hueShiftColorArr(this.darkColor, hueShift, 0, 0));
            this.baseColor = rgbToHex(...hueShiftColorArr(this.baseColor, hueShift, 0, 0));
        }
    }
}