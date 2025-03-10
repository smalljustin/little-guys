import { COLOR_BLACK, COLOR_BLUE, COLOR_OTHER_BLUE, COLOR_VERY_FUCKING_RED } from "../../colors.js";
import { MAIN_CONTEXT } from "../../index.js";
import { isLeftMouseClicked } from "../../mouse.js";
import { loadUI, saveUI } from "../UIData.js";
import { WindowElement } from "../Window.js";

export class Slider extends WindowElement {
    constructor(window, key, sizeX, sizeY, min, max, blockColorFunc) {
        super(window, key, sizeX, sizeY);
        this.sizeX = sizeX;
        this.sizeY = sizeY;
        this.min = min;
        this.max = max;
        this.blockColorFunc = blockColorFunc;
    }

    render(startX, startY) {
        var py = startY + this.sizeY / 2;
        var p1x = startX + this.window.padding; 
        var p2x = startX + this.sizeX - this.window.padding;

        MAIN_CONTEXT.beginPath();
        MAIN_CONTEXT.moveTo(p1x, py);
        MAIN_CONTEXT.lineTo(p2x, py);
        MAIN_CONTEXT.stroke();

        let block_size = this.window.padding;
        MAIN_CONTEXT.fillStyle = this.blockColorFunc();

        var p = (loadUI(this.key) - this.min) / (this.max - this.min);
        var x = p1x + p * (p2x - p1x)
        MAIN_CONTEXT.fillRect(x - block_size / 2, py - block_size / 2, block_size, block_size);
        return [this.sizeX, this.sizeY]
    }

    hover(posX, posY) {
        super.hover(posX, posY);
        if (!isLeftMouseClicked()) {
            return;
        }
        this.window.locked = true;
        var py = this.sizeY / 2;
        if (Math.abs(posY - py) > this.window.padding) {
            return;
        }
        let min = this.window.padding / 2;
        let max = this.sizeX - this.window.padding / 2;
        let p = (posX - min) / (max - min);
        saveUI(this.key, this.min + p * (this.max - this.min));
    }

}