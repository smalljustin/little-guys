import { getCanvasSquaresX } from "../../canvas.js";
import { randRange } from "../../common.js";
import { addUIFunctionMap, UI_CLIMATE_WEATHER_SUNNY, UI_CLIMATE_WEATHER_LIGHTRAIN, UI_CLIMATE_WEATHER_HEAVYRAIN, loadUI, saveUI, UI_CLIMATE_WEATHER_PARTLY_CLOUDY, UI_CLIMATE_WEATHER_MOSTLY_CLOUDY, UI_CLIMATE_WEATHER_FOGGY, UI_CLIMATE_WEATHER_DURATION, UI_CLIMATE_WEATHER_ACTIVE } from "../../ui/UIData.js";
import { getActiveClimate } from "../climateManager.js";
import { cloudRainThresh, setRestingGradientStrength, setRestingHumidityGradient, setRestingTemperatureGradient } from "../temperatureHumidity.js";
import { getCurDay } from "../time.js";
import { getWindSquaresX, getWindSquaresY } from "../wind.js";
import { Cloud } from "./cloud.js";
import { Weather } from "./weather.js";

var weatherSunny, weatherPartlyCloudy, weatherMostlyCloudy, weatherFoggy, weatherLightRain, weatherHeavyRain;
var ui_weatherMap = new Map();

var curRainFallAmount = 0;
var curWeatherStartTime = 0;
var curWeatherInterval = 1;
var curWeather = null;
var curClimate = null;

export function getCurWeather() {
    return curWeather;
}
export function getCurWeatherInterval() {
    return Math.round((curWeatherInterval - (getCurDay() - curWeatherStartTime)) / 0.000694444);
}

var curClouds = [];
var curWinds = [];

function spawnFogCloud() {
    let wsx = getWindSquaresX();
    let wsy = getWindSquaresY();
    curClouds.push(new Cloud(
        randRange(0, wsx),
        randRange(0, wsy),
        randRange(0.4, 0.9) * wsx, randRange(0.2, 0.35) * wsy,
        getCurDay(), Math.min(0.5, curWeatherInterval) * randRange(0.1, 0.5),
        randRange(1, 1.003), randRange(0, .3)));
}

function spawnCumulusCloud() {
    let wsx = getWindSquaresX();
    let wsy = getWindSquaresY();
    curClouds.push(new Cloud(
        randRange(0, wsx),
        randRange(0, wsy / 8),
        randRange(0.4, 0.9) * wsy, randRange(0.2, 0.35) * wsy,
        getCurDay(), Math.min(0.5, curWeatherInterval) * randRange(0.1, 0.5),
        randRange(1.001, cloudRainThresh), 0.8 * randRange(1, 2)));
}

function spawnNimbusCloud(rainFactor) {
    let wsx = getWindSquaresX();
    let wsy = getWindSquaresY();
    curClouds.push(new Cloud(
        randRange(0, wsx),
        randRange(0, wsy / 8),
        randRange(0.4, 0.9) * wsy, randRange(0.15, 0.25) * wsy,
        getCurDay(), Math.min(0.5, curWeatherInterval) * randRange(0.1, 0.5),
        1 + 0.05 * rainFactor, 0.8));
}

function spawnWindGust() {
    let wsx = getWindSquaresX();
    let wsy = getWindSquaresY();
    curClouds.push(new Cloud(
        randRange(-wsx, wsx),
        randRange(-wsy, wsy),
        randRange(0, 0.2) * wsx, randRange(0.05, 0.1) * wsy,
        getCurDay(), Math.min(0.5, curWeatherInterval) * randRange(0.01, 0.1),
        -1, 0.8));
}

// UI_CLIMATE_WEATHER_SUNNY
var sunnyHg = [
    [0, 0.2],
    [0.15, 0.3],
    [0.25, 0.3],
    [1, 0.4]
]
var sunnyTg = [
    [0, 273 + 30],
    [0.5, 273 + 35],
    [1, 273 + 40]
]

function sunnyWeather() {
    curClouds = new Array();
}

weatherSunny = new Weather(UI_CLIMATE_WEATHER_SUNNY, sunnyHg, sunnyTg, 100, sunnyWeather);

var cloudyHg = [
    [0, 0.999],
    [0.15, 0.999],
    [0.25, 0.98],
    [1, 0.75]
]
var cloudyTg = [
    [0, 273 + 30],
    [0.5, 273 + 35],
    [1, 273 + 40]
]


var foggyHg = [
    [0, 1],
    [0.15, 1],
    [0.25, 1],
    [1, 0.99]
]
var foggyTg = [
    [0, 273 + 30],
    [0.5, 273 + 35],
    [1, 273 + 40]
]
var rainyHumidityGradient = [
    [0, 1],
    [0.25, 1],
    [0.5, 0.85],
    [1, .7]
]
var rainyTemperatureGradient = [
    [0, 273 + 30],
    [0.5, 273 + 35],
    [1, 273 + 40]
]

function spawnRateThrottle() {
    return Math.random() > 0.9
}

function windyWeather(windAmount) {
    return () => {
        if (curWinds.length > windAmount) {
            return;
        }
        if (spawnRateThrottle())
            spawnWindGust();
    }
}

function cloudyWeather(cloudCount) {
    return () => {
        if (curClouds.length > cloudCount) {
            return;
        }
        if (spawnRateThrottle()) {
            spawnCumulusCloud();
        }
        windyWeather(10);
    }
}

function foggyWeather() {
    if (curClouds.length > 10) {
        return;
    }
    if (spawnRateThrottle()) {
        spawnFogCloud();
    }
}

weatherPartlyCloudy = new Weather(UI_CLIMATE_WEATHER_PARTLY_CLOUDY, cloudyHg, cloudyTg, 100, cloudyWeather(6));
weatherMostlyCloudy = new Weather(UI_CLIMATE_WEATHER_MOSTLY_CLOUDY, cloudyHg, cloudyTg, 100, cloudyWeather(10));
weatherFoggy = new Weather(UI_CLIMATE_WEATHER_FOGGY, foggyHg, foggyTg, 100, foggyWeather);

export function logRainFall(amount) {
    curRainFallAmount += amount;
}


function generalRainyWeather(rainFactor) {
    return () => {
        if (curClouds.length > 10) {
            return;
        }
        if (spawnRateThrottle()) {
            spawnNimbusCloud(rainFactor);
        }
        windyWeather(10);
    }
}

weatherLightRain = new Weather(UI_CLIMATE_WEATHER_LIGHTRAIN, rainyHumidityGradient, rainyTemperatureGradient, 100, generalRainyWeather(0.25));
weatherHeavyRain = new Weather(UI_CLIMATE_WEATHER_HEAVYRAIN, rainyHumidityGradient, rainyTemperatureGradient, 100, generalRainyWeather(1));

ui_weatherMap.set(UI_CLIMATE_WEATHER_SUNNY, weatherSunny)
ui_weatherMap.set(UI_CLIMATE_WEATHER_PARTLY_CLOUDY, weatherPartlyCloudy)
ui_weatherMap.set(UI_CLIMATE_WEATHER_MOSTLY_CLOUDY, weatherMostlyCloudy)
ui_weatherMap.set(UI_CLIMATE_WEATHER_FOGGY, weatherFoggy)
ui_weatherMap.set(UI_CLIMATE_WEATHER_LIGHTRAIN, weatherLightRain)
ui_weatherMap.set(UI_CLIMATE_WEATHER_HEAVYRAIN, weatherHeavyRain)

function weatherChange() {
    if (getCurDay() < curWeatherStartTime + curWeatherInterval) {
        return;
    }
    let curWeatherPatternMap = getActiveClimate().weatherPatternMap;
    var sum = curWeatherPatternMap.values().reduce(
        (accumulator, currentValue) => accumulator + currentValue,
        0,
    );
    var target = Math.floor(Math.random() * sum);
    var cur = 0;
    var nextWeather = curWeatherPatternMap.keys().find((key) => {
        if (target <= cur) {
            return true;
        };
        cur += curWeatherPatternMap.get(key);
        if (target <= cur) {
            return true;
        };
        return false;
    });
    saveUI(UI_CLIMATE_WEATHER_ACTIVE, nextWeather);
}


export function weather() {
    curClouds.forEach((cloud) => cloud.tick());
    curWinds.forEach((wind) => wind.tick());
    if (curClouds.some((cloud) => getCurDay() > cloud.startDay + cloud.duration)) {
        curClouds = Array.from(curClouds.filter((cloud) => getCurDay() < cloud.startDay + cloud.duration));
    }
    if (curWinds.some((wind) => getCurDay() > wind.startDay + wind.duration)) {
        curWinds = Array.from(curWinds.filter((wind) => getCurDay() < wind.startDay + wind.duration));
    }

    weatherChange();
    curWeather.weather();
}

export function initWeather() {
    weatherChange();
    curWeather = weatherSunny;
    curWeather.setRestingValues();
}

function applyUIWeatherChange() {
    curWeather = ui_weatherMap.get(loadUI(UI_CLIMATE_WEATHER_ACTIVE));
    curWeatherInterval = randRange(	loadUI(UI_CLIMATE_WEATHER_DURATION) / 4, loadUI(UI_CLIMATE_WEATHER_DURATION));
    curWeatherStartTime = getCurDay();
    console.log("Next weather: ", curWeather.type + ", for " + Math.round(curWeatherInterval / 0.000694444) + " minutes")
}

addUIFunctionMap(UI_CLIMATE_WEATHER_ACTIVE, applyUIWeatherChange);
addUIFunctionMap(UI_CLIMATE_WEATHER_DURATION, applyUIWeatherChange);