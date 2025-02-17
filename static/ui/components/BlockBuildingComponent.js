import { Component } from "../Component.js";
import { ConditionalContainer } from "../ConditionalContainer.js";
import { Container } from "../Container.js";
import { Radio } from "../elements/Radio.js";
import { Slider } from "../elements/Slider.js";
import { SoilPickerElement } from "../elements/SoilPicker.js";
import { UI_BB_MODE, UI_BB_SIZE, UI_BB_STRENGTH, UI_MODE_ROCK, UI_MODE_SOIL, UI_ROCK_COMPOSITION, UI_SOIL_COMPOSITION, UI_TOOL_BLUR, UI_TOOL_ERASE, UI_TOOL_MIX, UI_TOOL_MODE_LEFT } from "../UIData.js";


let padding = 10;
export class BlockBuildingComponent extends Component {
    constructor() {
        super();

        let leftSideContainer = new Container(this.window, UI_SOIL_COMPOSITION, 100, 100, padding, 1);
        this.window.addElement(leftSideContainer);

        leftSideContainer.addElement(new Radio(this.window, 200, 35, UI_BB_MODE, [UI_MODE_SOIL, UI_MODE_ROCK]));
        leftSideContainer.addElement(new Slider(this.window, UI_BB_SIZE, 200,  35, 1, 5));
        leftSideContainer.addElement(new Slider(this.window, UI_BB_STRENGTH, 200,  35, 0, 1));

        let leftSideConditionalContainer = new ConditionalContainer(this.window, UI_BB_MODE, 100, 100, padding, 1);
        leftSideContainer.addElement(leftSideConditionalContainer);
        leftSideConditionalContainer.addElement(UI_MODE_SOIL, new SoilPickerElement(window, UI_SOIL_COMPOSITION, 200, 100));
        leftSideConditionalContainer.addElement(UI_MODE_ROCK, new SoilPickerElement(window, UI_ROCK_COMPOSITION, 200, 100));
        
    }

}