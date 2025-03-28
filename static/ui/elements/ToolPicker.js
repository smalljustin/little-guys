import { rgbToHex } from "../../common.js";
import { MAIN_CONTEXT } from "../../index.js";
import { isLeftMouseClicked } from "../../mouse.js";
import { getBaseRockColor } from "../../squares/parameterized/RockSquare.js";
import { getBaseNutrientRate, getBasePercolationRate, getBaseSoilColor } from "../../squares/parameterized/SoilSquare.js";
import { loadGD, saveGD, UI_SOIL_COMPOSITION, UI_SOIL_VIEWMODE } from "../UIData.js";
import { WindowElement } from "../Window.js";

export const R_COLORS = "🎨";
export const R_PERCOLATION_RATE = "💦";
export const R_NUTRIENTS = "⚡";

export class ToolPickerElement extends WindowElement {
    constructor(window, key, sizeX, sizeY) {
        super(window, key, sizeX, sizeY);
        this.pickerSize = Math.min(sizeX, sizeY);

        this.hoverColor = {r: 100, g: 100, b: 100};
        this.clickColor = {r: 100, g: 100, b: 100};
    }

    render(startX, startY) {
        for (let i = 0; i < this.pickerSize; i++) {
            for (let j = 0; j < this.pickerSize; j++) {
                this.renderSingleSquare(startX, startY, i, j);
            }
        }
        let colorSize = (this.sizeX - this.pickerSize) / 2;

        MAIN_CONTEXT.fillStyle = rgbToHex(this.hoverColor.r, this.hoverColor.g, this.hoverColor.b);
        MAIN_CONTEXT.fillRect(startX + this.pickerSize, startY, colorSize, this.sizeY);
        MAIN_CONTEXT.fillStyle = rgbToHex(this.clickColor.r, this.clickColor.g, this.clickColor.b);
        MAIN_CONTEXT.fillRect(startX + this.pickerSize + colorSize, startY, colorSize, this.sizeY);
        return [this.sizeX, this.sizeY];
    }


    getBaseColor(sand, silt, clay) {
        if (this.keyFunc == UI_SOIL_COMPOSITION) {
            return getBaseSoilColor(sand, silt, clay);
        } else {
            return getBaseRockColor(sand, silt, clay);
        }
    }

    getSquareColor(i, j) {
        let arr = this.getSquareComposition(i, j);
        if (arr != null) {
            let val, val_max, mult;
            switch (loadGD(UI_SOIL_VIEWMODE)) {
                case R_COLORS:
                    return this.getBaseColor(arr[0], arr[1], arr[2]);
                case R_PERCOLATION_RATE:
                    val = getBasePercolationRate(arr[0], arr[1], arr[2]);
                    val_max = getBasePercolationRate(0, 0, 1);
                    mult = (val / val_max) ** 0.4;
                    break;
                case R_NUTRIENTS:
                default:
                    val = getBaseNutrientRate(arr[0], arr[1], arr[2]);
                    val_max = getBaseNutrientRate(0, 0, 1);
                    mult = val / val_max;
                    break;
            }
            return {
                r: Math.floor(mult * 255),
                g: Math.floor(mult * 255),
                b: Math.floor(mult * 255)
            }

        }
    }

    renderSingleSquare(startX, startY, i, j) {
        let colorRGB = this.getSquareColor(i, j);
        if (colorRGB != null) {
            MAIN_CONTEXT.fillStyle = rgbToHex(colorRGB.r, colorRGB.g, colorRGB.b);
            MAIN_CONTEXT.fillRect(startX + i, startY + j, 1, 1);
        }
       
    }

    hover(posX, posY) {
        super.hover(posX, posY);
        let c = this.getSquareColor(posX, posY);
        if (c != null) {
            this.hoverColor = c;
            if (isLeftMouseClicked()) {
                this.clickColor = c;
                saveGD(this.keyFunc, this.getSquareComposition(posX, posY))
            }
        }
    }
}
