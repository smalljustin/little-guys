import { getBaseUISize } from "../../canvas.js";
import { COLOR_BLACK, COLOR_OTHER_BLUE, COLOR_VERY_FUCKING_RED } from "../../colors.js";
import { MAIN_CONTEXT } from "../../index.js";
import { isLeftMouseClicked } from "../../mouse.js";
import { loadUI, saveUI, UI_CENTER } from "../UIData.js";
import { WindowElement } from "../Window.js";

export class RowedRadio extends WindowElement {
    constructor(window, sizeX, sizeY, elementOffsetX, key, rows, choices, colorInactiveFunc, colorActiveFunc) {
        super(window, sizeX, sizeY);
        this.sizeX = sizeX;
        this.sizeY = sizeY;
        this.elementOffsetX = elementOffsetX;
        this.key = key;
        this.rows = rows;
        this.choices = choices;
        this.selected = this.choices.indexOf(loadUI(this.key));
        this.colorActiveFunc = colorActiveFunc;
        this.colorInactiveFunc = colorInactiveFunc;
    }

    render(startX, startY) {
        var curX = 0;
        MAIN_CONTEXT.font = (this.sizeY / this.rows) * 0.75 + "px courier"
        MAIN_CONTEXT.textAlign = 'left';
        MAIN_CONTEXT.textBaseline = 'middle';
        let xStep = (this.rows * this.sizeX) / this.choices.length;
        var yStep = this.sizeY / this.rows;
        
        for (let i = 0; i < this.choices.length; i++) {
            if (i == this.selected) {
                MAIN_CONTEXT.fillStyle = this.colorActiveFunc();

            } else {
                MAIN_CONTEXT.fillStyle = this.colorInactiveFunc();
            }
            var leftX = startX + xStep * (i % (this.choices.length / this.rows));
            var topY = startY + Math.floor(((this.rows * i) / this.choices.length)) * yStep;

            MAIN_CONTEXT.fillRect(leftX, topY, xStep, yStep);

            if (this.elementOffsetX == UI_CENTER) {
                MAIN_CONTEXT.textAlign = 'center';
                MAIN_CONTEXT.strokeText(this.choices[i], leftX + xStep / 2, topY + yStep / 2);
            } else {
                MAIN_CONTEXT.textAlign = 'left';
                MAIN_CONTEXT.strokeText(this.choices[i], leftX + this.elementOffsetX, topY + yStep / 2);
            }
            curX += xStep;
        }
        return [this.sizeX, this.sizeY];
    }

    hover(posX, posY) {
        super.hover(posX, posY);
        if (!isLeftMouseClicked()) {
            return;
        }
        let xStep = (this.rows * this.sizeX) / this.choices.length;
        var yStep = this.sizeY / this.rows;
        for (let i = 0; i < this.choices.length; i++) {
            var leftX = xStep * (i % (this.choices.length / this.rows));
            var topY = Math.floor(((this.rows * i) / this.choices.length)) * yStep;
            if (posX > leftX && posX < leftX + xStep && posY > topY && posY < topY + yStep) {
                this.selected = i;
                saveUI(this.key, this.choices[i]);
            }
        }
    }

}