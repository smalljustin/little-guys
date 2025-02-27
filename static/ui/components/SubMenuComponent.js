import { getBaseSize } from "../../canvas.js";
import { Component } from "../Component.js";
import { Container } from "../Container.js";
import { Toggle } from "../elements/Toggle.js";
import { UI_SM_BB, UI_SM_CLIMATE, UI_SM_GODMODE, UI_SM_LIGHTING, UI_SM_ORGANISM, UI_SM_SPECIAL } from "../UIData.js";


export class SubMenuComponent extends Component {
    constructor(posX, posY, padding, dir, key) {
        super(posX, posY, padding, dir, key);
        let subMenuContainer = new Container(this.window, getBaseSize(), 1);
        this.window.container = subMenuContainer;

        subMenuContainer.addElement(new Toggle(this.window, getBaseSize() * 11, getBaseSize() * 3, UI_SM_BB, "ground"));
        subMenuContainer.addElement(new Toggle(this.window, getBaseSize() * 11, getBaseSize() * 3, UI_SM_SPECIAL, "special"));
        subMenuContainer.addElement(new Toggle(this.window, getBaseSize() * 11, getBaseSize() * 3, UI_SM_LIGHTING, "lighting"));
        subMenuContainer.addElement(new Toggle(this.window, getBaseSize() * 11, getBaseSize() * 3, UI_SM_ORGANISM, "plants"));
        subMenuContainer.addElement(new Toggle(this.window, getBaseSize() * 11, getBaseSize() * 3, UI_SM_GODMODE, "god mode"));
        subMenuContainer.addElement(new Toggle(this.window, getBaseSize() * 11, getBaseSize() * 3, UI_SM_CLIMATE, "climate"));

        
    }

}