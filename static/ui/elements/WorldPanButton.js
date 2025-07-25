import { COLOR_BLACK, COLOR_OTHER_BLUE, COLOR_VERY_FUCKING_RED } from "../../colors.js";
import { UI_TINYDOT } from "../../common.js";
import { MAIN_CONTEXT } from "../../index.js";
import { getLastMouseDown, isLeftMouseClicked } from "../../mouse.js";
import { loadGD, saveGD, UI_CENTER } from "../UIData.js";
import { WindowElement } from "../Window.js";

export class WorldPanButton extends WindowElement {
    constructor(window, sizeX, sizeY, offsetX, func, label, color, textSizeMult=0.75) {
        super(window, sizeX, sizeY);
        this.sizeX = sizeX;
        this.sizeY = sizeY;
        this.offsetX = offsetX;
        this.func = func;
        this.label = label;
        this.lastClick = 0;
        this.color = color;
        this.textSizeMult = textSizeMult;
        this.lastRenderOffset = 0;
    }

    size() {
        return [this.sizeX, this.sizeY];
    }

    render(startX, startY, opacity) {
        startY -= this.lastRenderOffset;

        MAIN_CONTEXT.font = this.sizeY * this.textSizeMult + "px courier"
        MAIN_CONTEXT.textBaseline = 'middle';
        MAIN_CONTEXT.fillStyle = this.color + opacity + ")";
        MAIN_CONTEXT.fillRect(startX, startY, this.sizeX, this.sizeY);
        MAIN_CONTEXT.fillStyle = "rgba(30, 30, 30, " + opacity + ")";
        MAIN_CONTEXT.textAlign = 'center';
        MAIN_CONTEXT.fillText(this.label, startX + this.sizeX / 2, startY + this.sizeY / 1.6);

        return [this.sizeX, this.sizeY];
    }

    hover(posX, posY) {
        super.hover(posX, posY);
        posY -= this.lastRenderOffset;

        if (!isLeftMouseClicked()) {
            return;
        } 
        if (this.lastClick != getLastMouseDown()) {
            this.func();
            this.lastClick = getLastMouseDown();
        }
    }

}