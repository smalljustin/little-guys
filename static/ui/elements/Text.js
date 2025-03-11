import { COLOR_BLACK, COLOR_OTHER_BLUE, COLOR_VERY_FUCKING_RED } from "../../colors.js";
import { MAIN_CONTEXT } from "../../index.js";
import { isLeftMouseClicked } from "../../mouse.js";
import { loadUI, saveUI } from "../UIData.js";
import { WindowElement } from "../Window.js";

export class Text extends WindowElement {
    constructor(window, sizeX, sizeY, offsetX, text) {
        super(window, sizeX, sizeY);
        this.sizeX = sizeX;
        this.sizeY = sizeY;
        this.offsetX = offsetX;
        this.text = text;
    }

    render(startX, startY) {
        MAIN_CONTEXT.font = this.sizeY * 0.75 + "px courier"
        MAIN_CONTEXT.textAlign = 'left';
        MAIN_CONTEXT.textBaseline = 'middle';
        MAIN_CONTEXT.fillStyle = "#FFFFFF";
        MAIN_CONTEXT.fillText(this.text, startX + this.offsetX, startY + (this.sizeY / 2))
        return [this.sizeX, this.sizeY];
    }
}