import { getBaseUISize, getCanvasWidth } from "../../canvas.js";
import { COLOR_BLACK } from "../../colors.js";
import { MAIN_CONTEXT } from "../../index.js";
import {
    loadGD,
    UI_SPEED_1,
    UI_SPEED_2,
    UI_SPEED_3,
    UI_SPEED_4,
    UI_SPEED_5,
    UI_SPEED_6,
    UI_SPEED_7,
    UI_SPEED_8,
    UI_SPEED_9, UI_SPEED,
    UI_SPEED_0,
    UI_TOPBAR_MAINMENU,
    UI_BOOLEAN, UI_TOPBAR_BLOCK, UI_TOPBAR_VIEWMODE,
    UI_TOPBAR_SIMULATION, UI_TOPBAR_LIGHTING,
    UI_TOPBAR_TIME,
    UI_NAME,
    UI_TOPBAR_CLIMATE,
    UI_NULL
} from "../UIData.js";
import { TopBarToggle } from "./TopBarToggle.js";
import { getLastMoveOffset } from "../../mouse.js";
import { getCurDay, millis_per_day } from "../../climate/time.js";
import { TopBarText } from "./TopBarText.js";
import { getCurWeather } from "../../climate/weather/weatherManager.js";

export class TopBarComponent {
    constructor(key) {
        this.key = key;
        this.hovered = false;
        this.compact = false;

        this.elements = new Map();
        this.elementPositions = new Map();
        this.elements[1] = [
            new TopBarText(getBaseUISize() * 2, "left", () => this.textWorldName())
        ]
        
        this.elements[0] = [
            new TopBarToggle(getBaseUISize() * 2, "left", UI_TOPBAR_MAINMENU, UI_BOOLEAN, () => this.textMainMenu()),
            new TopBarToggle(getBaseUISize() * 2, "left", UI_TOPBAR_BLOCK, UI_BOOLEAN, () => this.textBlockMenu()),
            new TopBarToggle(getBaseUISize() * 2, "left", UI_TOPBAR_CLIMATE, UI_BOOLEAN, () => this.textClimateMenu()),
            new TopBarToggle(getBaseUISize() * 2, "left", UI_TOPBAR_VIEWMODE, UI_BOOLEAN, () => this.textViewMode()),
            new TopBarToggle(getBaseUISize() * 2, "left", UI_TOPBAR_LIGHTING, UI_BOOLEAN, () => this.textToggleLighting()),
            new TopBarToggle(getBaseUISize() * 2, "left", UI_TOPBAR_SIMULATION, UI_BOOLEAN, () => this.textDesignerMode()),
            new TopBarToggle(getBaseUISize() * 2,"left", UI_SPEED, UI_SPEED_0, () => "⏸"),
            new TopBarToggle(getBaseUISize() * 2,"left", UI_SPEED, UI_SPEED_1, () => "▶"),
            new TopBarToggle(getBaseUISize() * 2,"left", UI_SPEED, UI_SPEED_2, () => "▶"),
            new TopBarToggle(getBaseUISize() * 2,"left", UI_SPEED, UI_SPEED_3, () => "▶"),
            new TopBarToggle(getBaseUISize() * 2,"left", UI_SPEED, UI_SPEED_4, () => "▶"),
            new TopBarToggle(getBaseUISize() * 2,"left", UI_SPEED, UI_SPEED_5, () => "▶"),
            new TopBarToggle(getBaseUISize() * 2,"left", UI_SPEED, UI_SPEED_6, () => "▶"),
            new TopBarToggle(getBaseUISize() * 2,"left", UI_SPEED, UI_SPEED_7, () => "▶"),
            new TopBarToggle(getBaseUISize() * 2,"left", UI_SPEED, UI_SPEED_8, () => "▶"),
            new TopBarToggle(getBaseUISize() * 2,"left", UI_SPEED, UI_SPEED_9, () => "▶\t|\t"),
            new TopBarToggle(getBaseUISize() * 2, "left", UI_TOPBAR_TIME, UI_BOOLEAN,() => this.textDateTime() + " |"),
            new TopBarText(getBaseUISize() * 2, "left", () => " " + this.textWeather()),
            
        ];

        Object.keys(this.elements).forEach((key) => this.elementPositions[key] = new Array(this.elements[key].length));

        this.maxHeight = 0;
        this.padding = 4;
    }

    textMainMenu() {
        return " main |"
    }

    textBlockMenu() {
        return " place |"
    }
    textClimateMenu() {
        return " climate |"
    }
    textViewMode() {
        return " viewmode |"
    }
    textToggleLighting() {
        return " lighting |" 
    }
    textDesignerMode() {
        return " simulation |"
    }
    textWorldName() {
        if (this.compact)
            return "" + loadGD(UI_NAME);
        return "world: " + loadGD(UI_NAME);
    }

    textWeather() {
        if (this.compact) {
            return getCurWeather().weatherStringShort();
        } else {
            return getCurWeather().weatherStringLong();
        }
    }

    textDateTime() {
        let curDay = getCurDay();
        let curDate = new Date(curDay * millis_per_day);
        if (this.compact) {
            return curDate.toLocaleTimeString("en-US", {timeZone: 'UTC'});
        } else {
            return curDate.toLocaleString("en-US", {timeZone: 'UTC'});
        }
    }


    ySize() {
        return this.maxHeight + 3 * this.padding;
    }
    render() {
        if (!loadGD(this.key)) {
            return;
        }

        MAIN_CONTEXT.fillStyle = COLOR_BLACK;
        MAIN_CONTEXT.fillRect(0, 0, getCanvasWidth() + 10, this.ySize());

        let order = Array.from(Object.keys(this.elements).map(parseFloat)).sort()
        let curEndX = 0;

        order.forEach((key) => {
            let elements = this.elements[key];
            let startX = getCanvasWidth() * key;
            let totalElementsSizeX = elements.map((element) => element.measure()).map((measurements) => measurements[0] + this.padding).reduce(
                (accumulator, currentValue) => accumulator + currentValue,
                0,
            );

            if (key >= 0.5) {
                startX -= totalElementsSizeX;
            }

            if (startX < curEndX) {
                this.compact = true;
                return;
            }
                
            for (let i = 0; i < elements.length; i++) {
                let element = elements[i];
                let measurements = element.measure();
                element.render(startX, this.padding + measurements[1]);
                this.elementPositions[key][i] = startX;
                startX += measurements[0] + this.padding;
                curEndX = startX;
                this.maxHeight = Math.max(measurements[1], this.maxHeight);
            }
        })
    }

    // yeah i'm pretty sorry about this one
    getElementXPositionFunc(elementKey, elementIdx) {
        if (elementIdx == 0) {
            return 0;
        }
        return this.elementPositions[elementKey][elementIdx] - getBaseUISize() * 0.8;
    }

    update() {
        if (!loadGD(this.key)) {
            return;
        }
        
        let curMouseLocation = getLastMoveOffset();
        if (curMouseLocation == null) {
            return;
        }
        
        let x = curMouseLocation.x;
        let y = curMouseLocation.y;

        if (y > this.maxHeight + (getBaseUISize())) {
            return;
        }

        let keys = Object.keys(this.elements);
        keys.map(parseFloat).forEach((key) => {
            let elements = this.elements[key];
            let startX = getCanvasWidth() * key;
            let totalElementsSizeX = elements.map((element) => element.measure()).map((measurements) => measurements[0] + this.padding).reduce(
                (accumulator, currentValue) => accumulator + currentValue,
                0,
            );

            if (key >= 0.5) {
                startX -= totalElementsSizeX;
            } else {
                startX += this.padding * 2;
            }
            elements.forEach((element) => {
                let measurements = element.measure();
                let width = measurements[0] + this.padding;

                if (x > startX && x < startX + measurements[0]) {
                    element.hover(x - startX, y);
                    this.hovered = true;
                }
                startX += width;
            });
        })

    }

}
