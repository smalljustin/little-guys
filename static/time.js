import { randNumber, randRange, rgbToRgba } from "./common.js";
import { CANVAS_SQUARES_X, CANVAS_SQUARES_Y, BASE_SIZE, MAIN_CONTEXT} from "./index.js";

var millis_per_day = 100000;
var curDay = 0;
var curTime = 0;

var prevTime = Date.now();

var starMap;
var starMapCenterX;
var starMapCenterY;

function initializeStarMap() {
    starMap = new Map();
    starMapCenterX = randNumber(0, CANVAS_SQUARES_X);
    starMapCenterY = randNumber(0, CANVAS_SQUARES_Y);

    var numStars = 1000;

    for (let i = 0; i < numStars; i++) {
        var starX = randNumber(-CANVAS_SQUARES_X * 2, CANVAS_SQUARES_X * 2);
        var starY = randNumber(-CANVAS_SQUARES_Y * 2, CANVAS_SQUARES_Y * 2);
        var starBrightness = Math.random();

        if (!(starX in starMap)) {
            starMap[starX] = new Map();
        }
        starMap[starX][starY] = starBrightness;
    }
}


function renderStarMap() {
    if (starMap == null) {
        initializeStarMap();
    }

    var xKeys = Array.from(Object.keys(starMap));
    for (let i = 0; i < xKeys.length; i++) {
        var yKeys = Array.from(Object.keys(starMap[xKeys[i]]));
        for (let j = 0; j < yKeys.length; j++) {
            var starX = xKeys[i];
            var starY = yKeys[j];
            var starbrightness = starMap[starX][starY];

            var starXRelOrigin = starX - starMapCenterX;
            var starYRelOrigin = starY - starMapCenterY;

            var dayTheta = (getCurDay() % 1) * 2 * Math.PI;

            var rotatedX = starXRelOrigin * Math.cos(dayTheta) - starYRelOrigin * Math.sin(dayTheta);
            var rotatedY = starYRelOrigin * Math.cos(dayTheta) + starXRelOrigin * Math.sin(dayTheta);


            var endX = rotatedX + starMapCenterX;
            var endY = rotatedY + starMapCenterX;

            MAIN_CONTEXT.fillStyle = rgbToRgba(255, 255, 255, starbrightness);
            MAIN_CONTEXT.fillRect(
                endX * BASE_SIZE,
                endY * BASE_SIZE,
                BASE_SIZE,
                BASE_SIZE
            );
        }
    }
}

function getCurDay() {
    return curDay;
}

function getCurTime() {
    return curTime;
}

function updateTime() {
    var dt = Date.now() - prevTime;
    if (dt > 100) {
        prevTime = Date.now();
    } else {
        curTime += dt; 
        curDay += dt / millis_per_day;
        prevTime = Date.now();
    }
}

function renderTime() {

    // 0.5 is noon, 0.25 is sunrise, 0.75 is sunset
    var daylightStrength = 0;
    var currentTime = getCurDay() % 1;
    if (currentTime > 0.25 && currentTime < 0.75) {
        daylightStrength = Math.sin(currentTime * 2 * Math.PI - (Math.PI / 2)) ** 0.35;
    }

    var myTemp = daylightStrength * 6600;
    var dc = calculateTempColor(myTemp);

    var resColor = {
        r: Math.floor(dc.r * daylightStrength),
        g: Math.floor(dc.g * daylightStrength),
        b: Math.floor(dc.b * daylightStrength),
    }

    MAIN_CONTEXT.fillStyle = rgbToRgba(resColor.r, resColor.g, resColor.b, 0.35);
    MAIN_CONTEXT.fillRect(
        0,
        0,
        CANVAS_SQUARES_X * BASE_SIZE,
        CANVAS_SQUARES_Y * BASE_SIZE
    );

    renderStarMap();
}

// https://www.researchgate.net/publication/328726901_Real-time_adaptable_and_coherent_rendering_for_outdoor_augmented_reality/download

function calculateTempColor(temperature) {
    temperature /= 100;
    temperature = Math.max(20, temperature);
    return {
        r: temp_red(temperature),
        g: temp_green(temperature),
        b: temp_blue(temperature)
    }
}

function temp_red(temperature) {
    var red;
    if (temperature < 66) {
        red = 255;
    } else {
        red = temperature - 60;
        red = 329.698727446 * (red ** (-0.1332047592))
    }
    red = Math.max(0, red);
    red = Math.min(255, red);
    return Math.floor(red);
}

function temp_green(temperature) {
    var green = 0;
    if (temperature < 66) {
        green = temperature;
        green = 99.4708 * Math.log(green) - 161.1195;
    } else {
        green = temperature - 60;
        green = 288.122169 * (green * (-.0755));
    }
    green = Math.max(0, green);
    green = Math.min(255, green);
    return Math.floor(green);
}

function temp_blue(temperature) {
    var blue = 0;
    if (temperature >= 66) {
        blue = 255;
    } else {
        blue = temperature -10;
    }
    blue = 138.517 * Math.log(blue) - 305.0447;
    blue = Math.max(0, blue);
    blue = Math.min(255, blue);
    return Math.floor(blue);
}


export { getCurDay, getCurTime, updateTime, renderTime }