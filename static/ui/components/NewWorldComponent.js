import { getBaseUISize } from "../../canvas.js";
import { getActiveClimate } from "../../climate/climateManager.js";
import { Container } from "../Container.js";
import { EditableText } from "../elements/EditableText.js";
import { RadioToggle } from "../elements/RadioToggle.js";
import { RadioToggleLabel } from "../elements/RadioToggleLabel.js";
import { Text } from "../elements/Text.js";
import { PopupComponent } from "../PopupComponent.js";
import { UI_CENTER, UI_MAIN_NEWWORLD_CLOUDS, UI_SIMULATION_HEIGHT, UI_MAIN_NEWWORLD_CUSTOM, UI_MAIN_NEWWORLD_TYPE_BLOCKS, UI_MAIN_NEWWORLD_TYPE_PLANTS, UI_MAIN_NEWWORLD_TYPE_SELECT, UI_MAIN_NEWWORLD_NAME } from "../UIData.js";
export class WorldSetupComponent extends PopupComponent {
    constructor(posXFunc, posYFunc, padding, dir, key) {
        super(posXFunc, posYFunc, padding, dir, key);
        let sizeX = getBaseUISize() * 38;
        let half = sizeX / 2;
        let third = sizeX / 3;
        let container = new Container(this.window, padding, 1);
        this.window.container = container; 

        let row1 = new Container(this.window, padding, 0);
        let row2 = new Container(this.window, padding, 0);
        let row3 = new Container(this.window, padding, 0);

        container.addElement(new EditableText(this.window, sizeX, getBaseUISize() * 4, UI_CENTER, UI_MAIN_NEWWORLD_NAME, "*"));
        container.addElement(new Text(this.window, sizeX, getBaseUISize() * 2, UI_CENTER, "optimize for"));
        container.addElement(new Text(this.window, sizeX, getBaseUISize() * .5, UI_CENTER, ""));

        container.addElement(row1);
        container.addElement(row2);
        // container.addElement(row3);

        row1.addElement(new RadioToggleLabel(this.window, half, getBaseUISize() * 4, UI_CENTER,"plants", UI_MAIN_NEWWORLD_TYPE_SELECT, 
            UI_MAIN_NEWWORLD_TYPE_PLANTS, () => getActiveClimate().getUIColorInactiveCustom(0.65), () => getActiveClimate().getUIColorActive()));
        row1.addElement(new RadioToggleLabel(this.window, half, getBaseUISize() * 4, UI_CENTER, "blocks",UI_MAIN_NEWWORLD_TYPE_SELECT, 
            UI_MAIN_NEWWORLD_TYPE_BLOCKS, () => getActiveClimate().getUIColorInactiveCustom(0.65), () => getActiveClimate().getUIColorActive()));

        row2.addElement(new RadioToggleLabel(this.window, half, getBaseUISize() * 4, UI_CENTER,"clouds", UI_MAIN_NEWWORLD_TYPE_SELECT, 
        UI_MAIN_NEWWORLD_CLOUDS, () => getActiveClimate().getUIColorInactiveCustom(0.65), () => getActiveClimate().getUIColorActive()));
        row2.addElement(new RadioToggleLabel(this.window, half, getBaseUISize() * 4, UI_CENTER, "custom",UI_MAIN_NEWWORLD_TYPE_SELECT, 
        UI_MAIN_NEWWORLD_CUSTOM, () => getActiveClimate().getUIColorInactiveCustom(0.65), () => getActiveClimate().getUIColorActive()));


        container.addElement(new Text(this.window, sizeX, getBaseUISize() * 2, UI_CENTER, "world size"));
            
        let sizeRow1 =  new Container(this.window, 0, 0);
        let sizeRow2 =  new Container(this.window, 0, 0);
        let sizeRow3 =  new Container(this.window, 0, 0);
        let sizeRow4 =  new Container(this.window, 0, 0);
        let sizeRow5 =  new Container(this.window, 0, 0);

        sizeRow1.addElement(new RadioToggle(this.window, third, getBaseUISize() * 3, UI_CENTER, UI_SIMULATION_HEIGHT, 75,() => getActiveClimate().getUIColorInactiveCustom(0.62), () => getActiveClimate().getUIColorActive()));
        sizeRow1.addElement(new RadioToggle(this.window, third, getBaseUISize() * 3, UI_CENTER, UI_SIMULATION_HEIGHT, 100,() => getActiveClimate().getUIColorInactiveCustom(0.55), () => getActiveClimate().getUIColorActive()));
        sizeRow1.addElement(new RadioToggle(this.window, third, getBaseUISize() * 3, UI_CENTER, UI_SIMULATION_HEIGHT, 125,() => getActiveClimate().getUIColorInactiveCustom(0.60), () => getActiveClimate().getUIColorActive()));
        sizeRow2.addElement(new RadioToggle(this.window, third, getBaseUISize() * 3, UI_CENTER, UI_SIMULATION_HEIGHT, 150,() => getActiveClimate().getUIColorInactiveCustom(0.58), () => getActiveClimate().getUIColorActive()));
        sizeRow2.addElement(new RadioToggle(this.window, third, getBaseUISize() * 3, UI_CENTER, UI_SIMULATION_HEIGHT, 175,() => getActiveClimate().getUIColorInactiveCustom(0.62), () => getActiveClimate().getUIColorActive()));
        sizeRow2.addElement(new RadioToggle(this.window, third, getBaseUISize() * 3, UI_CENTER, UI_SIMULATION_HEIGHT, 200,() => getActiveClimate().getUIColorInactiveCustom(0.55), () => getActiveClimate().getUIColorActive()));
        sizeRow3.addElement(new RadioToggle(this.window, third, getBaseUISize() * 3, UI_CENTER, UI_SIMULATION_HEIGHT, 225,() => getActiveClimate().getUIColorInactiveCustom(0.63), () => getActiveClimate().getUIColorActive()));
        sizeRow3.addElement(new RadioToggle(this.window, third, getBaseUISize() * 3, UI_CENTER, UI_SIMULATION_HEIGHT, 250,() => getActiveClimate().getUIColorInactiveCustom(0.59), () => getActiveClimate().getUIColorActive()));
        sizeRow3.addElement(new RadioToggle(this.window, third, getBaseUISize() * 3, UI_CENTER, UI_SIMULATION_HEIGHT, 275,() => getActiveClimate().getUIColorInactiveCustom(0.64), () => getActiveClimate().getUIColorActive()));
        sizeRow4.addElement(new RadioToggle(this.window, third, getBaseUISize() * 3, UI_CENTER, UI_SIMULATION_HEIGHT, 300,() => getActiveClimate().getUIColorInactiveCustom(0.60), () => getActiveClimate().getUIColorActive()));
        sizeRow4.addElement(new RadioToggle(this.window, third, getBaseUISize() * 3, UI_CENTER, UI_SIMULATION_HEIGHT, 350,() => getActiveClimate().getUIColorInactiveCustom(0.56), () => getActiveClimate().getUIColorActive()));
        sizeRow4.addElement(new RadioToggle(this.window, third, getBaseUISize() * 3, UI_CENTER, UI_SIMULATION_HEIGHT, 400,() => getActiveClimate().getUIColorInactiveCustom(0.62), () => getActiveClimate().getUIColorActive()));
        sizeRow5.addElement(new RadioToggle(this.window, third, getBaseUISize() * 3, UI_CENTER, UI_SIMULATION_HEIGHT, 450,() => getActiveClimate().getUIColorInactiveCustom(0.57), () => getActiveClimate().getUIColorActive()));
        sizeRow5.addElement(new RadioToggle(this.window, third, getBaseUISize() * 3, UI_CENTER, UI_SIMULATION_HEIGHT, 500,() => getActiveClimate().getUIColorInactiveCustom(0.61), () => getActiveClimate().getUIColorActive()));
        sizeRow5.addElement(new RadioToggle(this.window, third, getBaseUISize() * 3, UI_CENTER, UI_SIMULATION_HEIGHT, 550,() => getActiveClimate().getUIColorInactiveCustom(0.58), () => getActiveClimate().getUIColorActive()));
        

        container.addElement(sizeRow1);
        container.addElement(sizeRow2);
        container.addElement(sizeRow3);
        container.addElement(sizeRow4);
        container.addElement(sizeRow5);

    }
}