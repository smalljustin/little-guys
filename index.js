var MAIN_CANVAS = document.getElementById("main");
var MAIN_CONTEXT = MAIN_CANVAS.getContext('2d');
var materialSelect = document.getElementById("materialSelect");
var fastTerrain = document.getElementById("fastTerrain");
var loadSlotA = document.getElementById("loadSlotA");
var saveSlotA = document.getElementById("saveSlotA");
var loadSlotB = document.getElementById("loadSlotB");
var saveSlotB = document.getElementById("saveSlotB");
var configSliders = document.getElementById("configSliders");
var configOuptput = document.getElementById("configOutput");

var selectedMaterial = "dirt";

materialSelect.addEventListener('change', (e) => selectedMaterial = e.target.value);
MAIN_CANVAS.addEventListener('mousemove', handleClick, false);

var mouseDown = 0;
var organismAddedThisClick = false;
var lastClickEvent = null;
var lastTick = Date.now();

document.body.onmousedown = function () {
    mouseDown = 1;
}
document.body.onmouseup = function () {
    mouseDown = 0;
    organismAddedThisClick = false;
}

// each square is 16x16
// 'little guys' may aquire multiple squares
const BASE_SIZE = 8;
var MILLIS_PER_TICK = 16;
var CANVAS_SQUARES_X = 80; // * 8; //6;
var CANVAS_SQUARES_Y = 80; // * 8; // 8;
var ERASE_RADIUS = 2;
var lastLastClickEvent = null;

MAIN_CANVAS.width = CANVAS_SQUARES_X * BASE_SIZE;
MAIN_CANVAS.height = CANVAS_SQUARES_Y * BASE_SIZE;

var stats = new Map();
var statsLastUpdatedTime = 0;
var NUM_GROUPS = 0;
var ALL_SQUARES = new Map();
var ALL_ORGANISMS = new Array();
var ALL_ORGANISM_SQUARES = new Map();

var WATERFLOW_TARGET_SQUARES = new Map();
var WATERFLOW_CANDIDATE_SQUARES = new Set();

var rightMouseClicked = false;

function displayConfigs() {
    if (!displayConfigDirty) {
        return;
    }
    configOuptput.innerText = "";
    for (let i = 0; i < all_configs.length; i++) {
        var cfg = all_configs[i];
        configOuptput.innerText += "var " + cfg.name + "={\n\tname: \"" + cfg.name + "\",\n\tvalue: " + cfg.value + "\n};\n";
    }
    displayConfigDirty = false;
}



setInterval(displayConfigs, 1);

var all_configs = [];

var displayConfigDirty = false;
var displayConfigText = "";

function addConfig(config) {
    all_configs.push(config);
    var newSlider = document.createElement("input");
    newSlider.type = "range";
    newSlider.class = "slider";
    newSlider.value = config.value;
    newSlider.min = config.value / 2;
    newSlider.max = config.value * 2;
    newSlider.step = config.value / 1000;
    newSlider.id = "slider_" + config.name;
    configSliders.appendChild(newSlider);
    var label = document.createElement("label");
    label.innerText = "slider_" + config.name + "\tvalue: " + config.value;
    label.htmlFor = "slider_" + config.name;
    configSliders.appendChild(label);
    configSliders.append(document.createElement("br"));
    newSlider.onchange = (e) => {
        config.value = e.target.value;
        displayConfigDirty = true;
        label.innerText = "slider_" + config.name + "\tvalue: " + e.target.value;
    };
}


var b_sq_waterContainmentMax = {
    name: "b_sq_waterContainmentMax",
    value: 0.2
};
var b_sq_nutrientValue = {
    name: "b_sq_nutrientValue", 
    value: 0
};
var static_sq_waterContainmentMax = {
    name: "static_sq_waterContainmentMax",
    value: 0.001
}
var static_sq_waterContainmentTransferRate = {
    name: "static_sq_waterContainmentTransferRate",
    value: 0
}

var drain_sq_waterContainmentMax = {
    name: "drain_sq_waterContainmentMax",
    value: 1.01
}

var drain_sq_waterTransferRate = {
    name: "drain_sq_waterTransferRate",
    value: 0.5
}

var wds_sq_waterContainmentMax = {
    name: "wds_sq_waterContainmentMax",
    value: 2
};

var wds_sq_waterContainmentTransferRate = {
    name: "waterContainmentTransferRate",
    value: 1
};

var b_sq_waterContainmentTransferRate = {
    name: "b_sq_waterContainmentTransferRate",
    value: 1
};
var b_sq_waterContainmentEvaporationRate = {
    name: "b_sq_waterContainmentEvaporationRate",
    value: 0.000005
};
var b_sq_darkeningStrength = {
    name: "b_sq_darkeningStrength",
    value: 0.3
};
var d_sq_nutrientValue = {
    name: "d_sq_nutrientValue",
    value: 0.1
};
var rain_dropChance = {
    name: "rain_dropChance",
    value: 0.001
};
var heavyrain_dropChance = {
    name: "heavyrain_dropChance",
    value: 0.02
};
var rain_dropHealth = {
    name: "rain_dropHealth", 
    value: 0.05
};
var water_evaporationRate = {
    name: "water_evaporationRate",
    value: 0
};
var water_viscocity = {
    name: "water_viscocity",
    value: 0.1
};
var water_darkeningStrength = {
    name: "water_darkeningStrength",
    value: 0.3
};
var po_airSuckFrac = {
    name: "po_airSuckFrac",
    value: 0.2
};
var po_waterSuckFrac = {
    name: "po_waterSuckFrac",
    value: 0.2
};
var po_rootSuckFrac = {
    name: "po_rootSuckFrac",
    value: 0.2
};
var po_perFrameCostFracPerSquare = {
    name: "po_perFrameCostFracPerSquare",
    value: 0.0002
};
var po_greenSquareSizeExponentCost = {
    name: "po_greenSquareSizeExponentCost",
    value: 1.5
};
var po_rootSquareSizeExponentCost = {
    name: "po_rootSquareSizeExponentCost",
    value: 1.5
};
var p_ls_airNutrientsPerExposedNeighborTick = {
    name: "p_ls_airNutrientsPerExposedNeighborTick",
    value: 0.05
};
var p_seed_ls_sproutGrowthRate = {
    name: "p_seed_ls_sproutGrowthRate",
    value: 0.01
};
var p_seed_ls_neighborWaterContainmentRequiredToGrow = {
    name: "p_seed_ls_neighborWaterContainmentRequiredToGrow",
    value: 0.3
};
var p_seed_ls_neighborWaterContainmentRequiredToDecay = {
    name: "p_seed_ls_neighborWaterContainmentRequiredToDecay",
    value: 0.05
};
var p_seed_ls_darkeningStrength = {
    name: "p_seed_ls_darkeningStrength",
    value: 0.3
};
var global_plantToRealWaterConversionFactor = {
    name: "global_plantToRealWaterConversionFactor",
    value: 20
}

addConfig(global_plantToRealWaterConversionFactor);
addConfig(b_sq_waterContainmentMax);
addConfig(b_sq_nutrientValue);
addConfig(static_sq_waterContainmentMax);
addConfig(static_sq_waterContainmentTransferRate);
addConfig(drain_sq_waterContainmentMax);
addConfig(drain_sq_waterTransferRate);
addConfig(wds_sq_waterContainmentMax);
addConfig(wds_sq_waterContainmentTransferRate);
addConfig(b_sq_waterContainmentTransferRate);
addConfig(b_sq_waterContainmentEvaporationRate);
addConfig(b_sq_darkeningStrength);
addConfig(d_sq_nutrientValue);
addConfig(rain_dropChance);
addConfig(heavyrain_dropChance);
addConfig(rain_dropHealth);
addConfig(water_evaporationRate);
addConfig(water_viscocity);
addConfig(water_darkeningStrength);
addConfig(po_airSuckFrac);
addConfig(po_waterSuckFrac);
addConfig(po_rootSuckFrac);
addConfig(po_perFrameCostFracPerSquare);
addConfig(po_greenSquareSizeExponentCost);
addConfig(po_rootSquareSizeExponentCost);
addConfig(p_ls_airNutrientsPerExposedNeighborTick);
addConfig(p_seed_ls_sproutGrowthRate);
addConfig(p_seed_ls_neighborWaterContainmentRequiredToGrow);
addConfig(p_seed_ls_neighborWaterContainmentRequiredToDecay);
addConfig(p_seed_ls_darkeningStrength);


loadSlotA.onclick = (e) => loadSlot("A");
saveSlotA.onclick = (e) => saveSlot("A");
loadSlotB.onclick = (e) => loadSlot("B");
saveSlotB.onclick = (e) => saveSlot("B");

function loadSlot(slotName) {
    var sqLoad = localStorage.getItem("ALL_SQUARES_" + slotName);
    if (sqLoad == null) {
        alert("no data to load!!! beep boop :(")
        return null;
    }
    // These are not our 'real' objects - they are JSON objects.
    // So they don't have functions and such. 
    var loaded_ALL_SQUARES = JSON.parse(localStorage.getItem("ALL_SQUARES_" + slotName));
    var loaded_ALL_ORGANISMS = JSON.parse(localStorage.getItem("ALL_ORGANISMS_" + slotName));
    var loaded_ALL_ORGANISM_SQUARES = JSON.parse(localStorage.getItem("ALL_ORGANISM_SQUARES_" + slotName));

    // bippity boppity do something like this 
    // Object.setPrototypeOf(sq, DirtSquare.prototype)

    ALL_SQUARES = new Map();
    ALL_ORGANISMS = new Array();
    ALL_ORGANISM_SQUARES = new Map();

    var rootKeys = Object.keys(loaded_ALL_SQUARES);
    for (let i = 0; i < rootKeys.length; i++) {
        var subKeys = Object.keys(loaded_ALL_SQUARES[rootKeys[i]]);
        for (let j = 0; j < subKeys.length; j++) {
            var sq = loaded_ALL_SQUARES[rootKeys[i]][subKeys[j]];
            if (sq != null) {
                addSquare(Object.setPrototypeOf(sq, ProtoMap[sq.proto]));
            }
        }
    }

    rootKeys = Object.keys(loaded_ALL_ORGANISM_SQUARES);
    for (let i = 0; i < rootKeys.length; i++) {
        var subKeys = Object.keys(loaded_ALL_ORGANISM_SQUARES[rootKeys[i]]);
        for (let j = 0; j < subKeys.length; j++) {
            var squares = loaded_ALL_ORGANISM_SQUARES[rootKeys[i]][subKeys[j]];
            for (let k = 0; k < squares.length; k++) {
                var sq = squares[k];
                if (sq != null) {
                    addOrganismSquare(Object.setPrototypeOf(sq, ProtoMap[sq.proto]));
                }
            }
        }
    }

    for (let i = 0; i < loaded_ALL_ORGANISMS.length; i++) {
        var org = loaded_ALL_ORGANISMS[i];
        Object.setPrototypeOf(org, ProtoMap[org.proto]);
        var orgAssociatedSquares = new Array();
        Object.setPrototypeOf(org.law, Law.prototype);
        org.associatedSquares.forEach(
            (orgSq) => orgAssociatedSquares.push(
                getOrganismSquaresAtSquareOfProto(orgSq.posX, orgSq.posY, orgSq.proto)
            ));
        org.associatedSquares = Array.from(orgAssociatedSquares.filter((x) => x != null));
        addOrganism(org);
    }
}

function saveSlot(slotName) {
    localStorage.setItem("ALL_SQUARES_" + slotName, JSON.stringify(ALL_SQUARES));
    localStorage.setItem("ALL_ORGANISMS_" + slotName, JSON.stringify(ALL_ORGANISMS));
    localStorage.setItem("ALL_ORGANISM_SQUARES_" + slotName, JSON.stringify(ALL_ORGANISM_SQUARES));
}


function handleMouseDown(e) {
    //e.button describes the mouse button that was clicked
    // 0 is left, 1 is middle, 2 is right
    if (e.button === 2) {
        rightMouseClicked = true;
    } else if (e.button === 0) {
        //Do something if left button was clicked and right button is still pressed
        if (rightMouseClicked) {
            console.log('hello');
            //code
        }
    }
}

function handleMouseUp(e) {
    if (e.button === 2) {
        rightMouseClicked = false;
    }
}

document.addEventListener('mousedown', handleMouseDown);
document.addEventListener('mouseup', handleMouseUp);
document.addEventListener('contextmenu', function (e) {
    e.preventDefault();
});

class Law {
    // Each organism will have its own instance of 'Law'. 
    // This means each one can have its own statistics tracked. 
    constructor() {
        this.airAccepted = 0;
        this.waterAccepted = 0; 
        this.dirtAccepted = 0;
        this.energyGiven = 0; 
    }

    photosynthesis(air, water, root) {
        var energyOut = Math.min(Math.min(air, water), root);
        this.energyGiven += energyOut;
        this.airAccepted += energyOut;
        this.waterAccepted += energyOut;
        this.dirtAccepted += energyOut;
        return energyOut;
    }
}


class BaseSquare {
    constructor(posX, posY) {
        this.proto = "BaseSquare";
        this.posX = Math.floor(posX);
        this.posY = Math.floor(posY);
        this.colorBase = "#A1A6B4";
        this.solid = true;
        // block properties - overridden by block type
        this.physicsEnabled = true;
        this.blockHealth = 1; // when reaches zero, delete
        // water flow parameters
        this.waterContainment = 0;
        this.waterContainmentMax = b_sq_waterContainmentMax;
        this.waterContainmentTransferRate = b_sq_waterContainmentTransferRate; // what fraction of ticks does it trigger percolate on
        this.waterContainmentEvaporationRate = b_sq_waterContainmentEvaporationRate; // what fraction of contained water will get reduced per tick
        this.speedX = 0;
        this.speedY = 0;
        this.nutrientValue = b_sq_nutrientValue;
        this.rootable = false;
        this.group = -1;
        this.organic = false;
    };
    reset() {
        if (this.blockHealth <= 0) {
            removeSquare(this);
        }
        this.group = -1;
        this.speedY += 1;
    }
    render() {
        MAIN_CONTEXT.fillStyle = this.calculateColor();
        MAIN_CONTEXT.fillRect(
            this.posX * BASE_SIZE,
            this.posY * BASE_SIZE,
            BASE_SIZE,
            BASE_SIZE
        );
    };

    calculateColor() {
        var baseColorRGB = hexToRgb(this.colorBase);
        var darkeningStrength = b_sq_darkeningStrength.value;
        // Water Saturation Calculation
        // Apply this effect for 20% of the block's visual value. 
        // As a fraction of 0 to 255, create either perfect white or perfect grey.
        var waterColor255 = (1 - (this.waterContainment / this.waterContainmentMax.value)) * 255;
        var darkeningColorRGB = { r: waterColor255, b: waterColor255, g: waterColor255 };

        ['r', 'g', 'b'].forEach((p) => {
            darkeningColorRGB[p] *= darkeningStrength;
            baseColorRGB[p] *= (1 - darkeningStrength);
        });

        var resColor = {
            r: darkeningColorRGB.r + baseColorRGB.r,
            g: darkeningColorRGB.g + baseColorRGB.g,
            b: darkeningColorRGB.b + baseColorRGB.b
        }

        return rgbToHex(Math.floor(resColor.r), Math.floor(resColor.g), Math.floor(resColor.b));

    }
    updatePosition(newPosX, newPosY) {
        if (newPosX == this.posX && newPosY == this.posY) {
            return;
        }
        newPosX = Math.floor(newPosX);
        newPosY = Math.floor(newPosY);
        var existingSq = getSquare(newPosX, newPosY);
        if (existingSq) {
            // console.warn("Trying to move a square to an already populated square. This: ", this, ", other square, ", existingSq);
            return false;
        }
        
        var existingLifeSquares = getOrganismSquaresAtSquare(this.posX, this.posY);
        var newLifeSquares = [];
        existingLifeSquares.forEach((sq) => {
            removeOrganismSquare(sq);
            sq.posX = newPosX;
            sq.posY = newPosY;
            newLifeSquares.push(sq);
        });

        getOrganismsAtSquare(this.posX, this.posY).forEach((org) => {org.posX = newPosX; org.posY = newPosY});
    

        ALL_SQUARES[this.posX][this.posY] = null;
        ALL_SQUARES[newPosX][newPosY] = this;

        this.posX = newPosX;
        this.posY = newPosY;

        newLifeSquares.forEach((sq) => {
            addOrganismSquare(sq);
        });

        return true;
    }

    calculateGroup() {
        if (this.group != -1) {
            return;
        }
        var groupNeighbors = new Set(getNeighbors(this.posX, this.posY).filter((sq) => sq != null && this.proto == sq.proto));
        groupNeighbors.add(this);
        while (true) {
            var startGroupNeighborsSize = groupNeighbors.size;
            groupNeighbors.forEach((neighbor) => {
                var neighborGroupNeighbors = new Set(getNeighbors(neighbor.posX, neighbor.posY).filter((sq) => sq != null && this.proto == sq.proto));
                neighborGroupNeighbors.forEach((neighborGroupNeighbor) => groupNeighbors.add(neighborGroupNeighbor))
            })
            var endGroupNeighborsSize = groupNeighbors.size;
            if (startGroupNeighborsSize == endGroupNeighborsSize) {
                break;
            }
        }

        var group = Array.from(groupNeighbors).map((x) => x.group).find((x) => x != -1);
        if (group != null) {
            // then we have already set this group, somehow
            // probably some physics shenanigans
            groupNeighbors.forEach((x) => x.group = group);
            this.group = group;
            return;
        }

        var nextGroupId = getNextGroupId();
        groupNeighbors.forEach((x) => x.group = nextGroupId);

    }

    physics() {
        this.evaporateInnerMoisture();
        this.percolateInnerMoisture();

        if (!this.physicsEnabled || getCountOfOrganismsSquaresOfTypeAtPosition(this.posX, this.posY, "root") > 0) {
            return false;
        }
        var finalXPos = this.posX;
        var finalYPos = this.posY;
        var bonked = false;

        for (let i = 1; i < this.speedY + 1; i++) {
            for (let j = 0; j < Math.abs(this.speedX) + 1; j++) {
                var jSigned = (this.speedX > 0) ? j : -j;
                var jSignedMinusOne = (this.speedX == 0 ? 0 : (this.speedX > 0) ? (j - 1) : -(j - 1));
                if (getSquare(this.posX + jSigned, this.posY + i)) {
                    finalYPos = this.posY + (i - 1);
                    finalXPos = this.posX + jSignedMinusOne; 
                    this.speedX = 0;
                    this.speedY = 0;
                    bonked = true;
                    break;
                }
            } if (bonked) {
                break;
            }
        }
        if (!bonked) {
            finalXPos = this.posX + this.speedX;
            finalYPos = this.posY + this.speedY;
        }
        this.updatePosition(finalXPos, finalYPos);
        return true;
    }

    /* Called before physics(), with blocks in strict order from top left to bottom right. */
    physicsBefore() {
        this.calculateGroup();
    }

    /* god i fucking hate water physics */
    physicsBefore2() { }

    percolateFromBlock(otherBlockMoisture) {
        var moistureDiff = otherBlockMoisture - this.waterContainment;
        if (moistureDiff < 0) {
            return 0; // wet things get other things wet; dry things do not get other things dry 
        }

        if (Math.random() > (1 - this.waterContainmentTransferRate.value)) {
            var nextWaterContainment = Math.min(this.waterContainmentMax.value, this.waterContainment + moistureDiff / 2);
            var dw = nextWaterContainment - this.waterContainment;
            this.waterContainment = nextWaterContainment;
            return dw;
        }
        return 0;
    }

    percolateInnerMoisture() {
        if (this.waterContainment <= 0) {
            return 0;
        }
        var directNeighbors = getDirectNeighbors(this.posX, this.posY).filter((sq) => sq != null && sq.solid);

        directNeighbors.forEach((sq) => {
            var percolateProbability = (this.waterContainment / this.waterContainmentMax.value) * this.waterContainmentTransferRate.value;
            if (Math.random() > (1 - (percolateProbability / 2))) {
                this.waterContainment -= sq.percolateFromBlock(this.waterContainment);
            }
        });
    }

    evaporateInnerMoisture() {
        if (this.waterContainment == 0) {
            return;
        }

        var airCounter = getDirectNeighbors(this.posX, this.posY).map((sq) => (sq == null ? 1 : 0)).reduce(
            (accumulator, currentValue) => accumulator + currentValue,
            0,
        );

        for (let i = 0; i < airCounter; i++) {
            if (Math.random() > (1 - this.waterContainmentTransferRate.value)) {
                this.waterContainment = Math.max(0, this.waterContainment - this.waterContainmentEvaporationRate.value);
            }
        }
    }

    suckWater(rootWaterSaturation) {
        if (rootWaterSaturation > this.waterContainment) {
            return 0;
        }
        var diff = this.waterContainment - rootWaterSaturation;
        var ret = Math.min(this.waterContainmentTransferRate.value, diff / 2);
        this.waterContainment -= (ret / global_plantToRealWaterConversionFactor.value);
        return ret;
    }
}

class DirtSquare extends BaseSquare {
    constructor(posX, posY) {
        super(posX, posY);
        this.proto = "DirtSquare";
        this.colorBase = "#B06C49";
        this.nutrientValue = d_sq_nutrientValue;
        this.rootable = true;
    }
}

class SeedSquare extends BaseSquare {
    constructor(posX, posY) {
        super(posX, posY);
        this.proto = "SeedSquare";
        this.colorBase = "#B06C49";
        this.nutrientValue = d_sq_nutrientValue;
        this.rootable = true;
        this.organic = true;
    }
    physics() {
        super.physics();
        var sqBelow = getSquare(this.posX, this.posY + 1);
        if (sqBelow != null && sqBelow.rootable) {
            var orgBelow = getOrganismsAtSquare(sqBelow.posX, sqBelow.posY);
            if (orgBelow.length > 0) {
                removeSquare(this); // then do nothing with our seeds
            } else {
                getOrganismsAtSquare(this.posX, this.posY).forEach((org) => {
                    org.posY += 1;
                    org.associatedSquares.forEach((sq) => sq.posY += 1);
                });
            }
        }
    }
}

class StaticSquare extends BaseSquare {
    constructor(posX, posY) {
        super(posX, posY);
        this.proto = "StaticSquare";
        this.colorBase = "#000100";
        this.physicsEnabled = false;
        this.waterContainmentMax = static_sq_waterContainmentMax; 
        this.waterContainmentTransferRate = static_sq_waterContainmentTransferRate;
    }
}

class PlantSquare extends BaseSquare {
    constructor(posX, posY) {
        super(posX, posY);
        this.proto = "PlantSquare";
        this.colorBase = "#4CB963";
        this.waterContainmentMax = static_sq_waterContainmentMax; 
        this.waterContainmentTransferRate = static_sq_waterContainmentTransferRate;
        this.organic = true;
    }
}

class DrainSquare extends BaseSquare {
    constructor(posX, posY) {
        super(posX, posY);
        this.proto = "DrainSquare";
        this.colorBase = "#555555";
        this.physicsEnabled = false;
        this.waterContainmentMax = drain_sq_waterContainmentMax;
        this.waterContainmentTransferRate = drain_sq_waterTransferRate;
    }

    percolateInnerMoisture() {
        if (this.waterContainment <= 0) {
            return 0;
        }

        for (var i = -1; i < 2; i++) {
            for (var j = -1; j < 2; j++) {
                if (i == 0 && j == 0) {
                    continue;
                }
                if (abs(i) == abs(j)) {
                    continue;
                }
                if (this.waterContainment >= 1) {
                    if (addSquare(new WaterSquare(this.posX + i, this.posY + j))) {
                        this.waterContainment -= 1;
                    }
                }
            }
        }
    }

    calculateColor() {
        var baseColorRGB = hexToRgb(this.colorBase);
        return rgbToHex(Math.floor(baseColorRGB.r), Math.floor(baseColorRGB.g), Math.floor(baseColorRGB.b));
    }
}

class WaterDistributionSquare extends BaseSquare {
    constructor(posX, posY) {
        super(posX, posY);
        this.proto = "WaterDistributionSquare";
        this.colorBase = "#000500";
        this.physicsEnabled = false;
        this.waterContainmentMax = wds_sq_waterContainmentMax;
        this.waterContainmentTransferRate = wds_sq_waterContainmentTransferRate;
    }
    percolateInnerMoisture() {
        if (this.waterContainment <= 0) {
            return 0;
        }
        var neighbors = getNeighbors(this.posX, this.posY).filter((sq) => sq != null && sq.solid);

        neighbors.forEach((sq) => {
            this.waterContainment -= sq.percolateFromBlock(this.waterContainment);
        });
    }


    percolateFromBlock(otherBlockMoisture) {
        var moistureDiff = otherBlockMoisture - this.waterContainment;
        if (moistureDiff < 0) {
            return 0; // wet things get other things wet; dry things do not get other things dry 
        }

        var nextWaterContainment = Math.min(this.waterContainmentMax.value, this.waterContainment + moistureDiff / 2);
        var dw = nextWaterContainment - this.waterContainment;
        this.waterContainment = nextWaterContainment;
        return dw;
    }

}

class RainSquare extends StaticSquare {
    constructor(posX, posY) {
        super(posX, posY);
        this.proto = "RainSquare";
        this.colorBase = "#59546C";
    }
    physics() {
        if (Math.random() > (1 - rain_dropChance.value)) {
            var newSq = addSquare(new WaterSquare(this.posX, this.posY + 1));
            if (newSq) {
                newSq.blockHealth = rain_dropHealth.value;
            };
        }
    }
}
class HeavyRainSquare extends StaticSquare {
    constructor(posX, posY) {
        super(posX, posY);
        this.proto = "HeavyRainSquare";
        this.colorBase = "#38405F";
    }
    physics() {
        if (Math.random() > (1 - heavyrain_dropChance.value)) {
            var newSq = addSquare(new WaterSquare(this.posX, this.posY + 1));
            if (newSq) {
                newSq.blockHealth = rain_dropHealth.value;
            };
        }
    }
}

class AquiferSquare extends BaseSquare {
    constructor(posX, posY) {
        super(posX, posY);
        this.physicsEnabled = false;
        this.proto = "RainSquare";
        this.colorBase = "#0E131F";
    }
    physics() {
        addSquare(new WaterSquare(this.posX, this.posY + 1));
    }
}

class WaterSquare extends BaseSquare {
    constructor(posX, posY) {
        super(posX, posY);
        this.proto = "WaterSquare";
        this.boundedTop = false;
        this.colorBase = "#79beee";
        this.solid = false;
        this.viscocity = water_viscocity;
        this.currentPressureDirect = -1;
        this.currentPressureIndirect = -1;
    }

    reset() {
        super.reset();
        this.currentPressureDirect = -1;
        this.currentPressureIndirect = -1;
    }

    physics() {
        super.physics();
        this.calculateCandidateFlows();
        this.doNeighborPercolation();
    }

    calculateColor() {
        var baseColorRGB = hexToRgb(this.colorBase);
        var darkeningStrength = water_darkeningStrength.value;
        // Water Saturation Calculation
        // Apply this effect for 20% of the block's visual value. 
        // As a fraction of 0 to 255, create either perfect white or perfect grey.

        var num = this.currentPressureIndirect;
        var numMax = getGlobalStatistic("pressure") + 1;

        var featureColor255 = (1 - (num / numMax)) * 255;
        var darkeningColorRGB = { r: featureColor255, b: featureColor255, g: featureColor255 };

        ['r', 'g', 'b'].forEach((p) => {
            darkeningColorRGB[p] *= darkeningStrength;
            baseColorRGB[p] *= (1 - darkeningStrength);
        });

        var resColor = {
            r: darkeningColorRGB.r + baseColorRGB.r,
            g: darkeningColorRGB.g + baseColorRGB.g,
            b: darkeningColorRGB.b + baseColorRGB.b
        }

        return rgbToHex(Math.floor(resColor.r), Math.floor(resColor.g), Math.floor(resColor.b));
    }

    physicsBefore() {
        super.physicsBefore();
        this.calculateDirectPressure();
    }

    physicsBefore2() {
        super.physicsBefore2();
        this.calculateIndirectPressure(0);
        updateGlobalStatistic("pressure", this.currentPressureIndirect);
    }

    calculateCandidateFlows() {
        if (this.currentPressureIndirect == 0) {
            WATERFLOW_CANDIDATE_SQUARES.add(this);
        }
        if (this.currentPressureIndirect >= this.currentPressureDirect) {
            for (var i = -1; i < 2; i++) {
                for (var j = (this.currentPressureIndirect > 2 ? -1 : 0); j < 2; j++) {
                    if (Math.abs(i) == Math.abs(j)) {
                        continue;
                    }
                    if (getSquare(this.posX + i, this.posY + j) == null) {
                        if (!(this.currentPressureIndirect in WATERFLOW_TARGET_SQUARES)) {
                            WATERFLOW_TARGET_SQUARES[this.currentPressureIndirect] = new Array();
                        }
                        WATERFLOW_TARGET_SQUARES[this.currentPressureIndirect].push([this.posX + i, this.posY + j, this.group]);
                    }
                }
            }
        }
    }

    /**
     * Direct pressure is how many blocks of water are directly above us. 
     */
    calculateDirectPressure() {
        this.currentPressureDirect = 0;
        var curY = this.posY - 1;
        while (true) {
            var sq = getSquare(this.posX, curY);
            if (sq == null) {
                break;
            }
            if (sq.solid) {
                break;
            }
            curY -= 1;
            this.currentPressureDirect += 1;
        }
    }
    calculateIndirectPressure(startingPressure) {
        // we are looking for neighbors *of the same group*. 
        // we will only do this calculation *once* per group. 
        // starting on the top left member of that group.
        if (this.currentPressureIndirect != -1) {
            return;
        }
        var myNeighbors = Array.from(getNeighbors(this.posX, this.posY)
            .filter((sq) => sq != null && sq.group == this.group));

        this.currentPressureIndirect = Math.max(this.currentPressureDirect, startingPressure);
        for (let i = 0; i < myNeighbors.length; i++) {
            var myNeighbor = myNeighbors[i];
            var dy = myNeighbor.posY - this.posY;
            myNeighbor.calculateIndirectPressure(startingPressure + dy);
        }
    }

    doNeighborPercolation() {
        getDirectNeighbors(this.posX, this.posY).forEach((sq) => {
            if (sq == null) {
                return;
            }
            if (sq.solid) {
                this.blockHealth -= sq.percolateFromBlock(sq.waterContainmentMax.value);
            } else if (sq.proto == this.proto) {
                if (sq.blockHealth <= this.blockHealth) {
                    var diff = 1 - this.blockHealth;
                    if (diff > sq.blockHealth) {
                        this.blockHealth += sq.blockHealth;
                        removeSquare(sq);
                    } else {
                        this.blockHealth += diff;
                        sq.blockHealth -= diff;
                    }
                }
            }
        });
    }
}

class BaseLifeSquare {
    constructor(posX, posY) {
        this.proto = "BaseLifeSquare";
        this.posX = posX;
        this.posY = posY;
        this.type = "base";
        this.colorBase = "#1D263B";
        this.lastUpdateTime = Date.now();
    }

    tick() { 
        this.lastUpdateTime = Date.now();
    }

    render() {
        MAIN_CONTEXT.fillStyle = this.calculateColor();
        MAIN_CONTEXT.fillRect(
            this.posX * BASE_SIZE,
            this.posY * BASE_SIZE,
            BASE_SIZE,
            BASE_SIZE
        );
    };

    calculateColor() {
        var baseColorRGB = hexToRgb(this.colorBase);
        return rgbToHex(Math.floor(baseColorRGB.r), Math.floor(baseColorRGB.g), Math.floor(baseColorRGB.b));
    }

}

class BaseOrganism {
    constructor(posX, posY) {
        this.proto = "BaseOrganism";
        this.posX = Math.floor(posX);
        this.posY = Math.floor(posY);
        this.associatedSquares = new Array();
        this.type = "base";
        this.law = new Law();
        
        this.spawnTime = Date.now();
        this.currentEnergy = 0; 
        this.totalEnergy = 0;
        
        // life cycle properties
        this.maxLifeTime = 1000 * 30 * 1;
        this.reproductionEnergy = 100;
        this.reproductionEnergyUnit = 50;
    }

    spawnSeed() {
        var seedSquare = this.getSeedSquare();
        if (seedSquare != null) {
            seedSquare.speedX = Math.floor(randNumber(-3, 3));
            seedSquare.speedY = Math.floor(randNumber(-3, -1));
        }
    }

    getSeedSquare() {
        return null; // should be a SeedSquare with a contained PlantSeedOrganism or similar
    }

    getCountOfAssociatedSquaresOfProto(proto) {
        return Array.from(this.associatedSquares.filter((org) => org.proto == proto)).length;
    }
    getCountOfAssociatedSquaresOfType(type) {
        return Array.from(this.associatedSquares.filter((org) => org.type == type)).length;
    }

    growInitialSquares() { return new Array(); }

    render() {
        this.associatedSquares.forEach((sp) => sp.render())
    }

    destroy() {
        this.associatedSquares.forEach((asq) => {
            var sq = getSquare(asq.posX, asq.posY);
            if (sq != null && sq.organic) {
                removeSquare(sq);
            }
            removeOrganismSquare(asq);
        });
        ALL_ORGANISMS = Array.from(ALL_ORGANISMS.filter((org) => org != this));
    }

    process() {
        this.tick();
        this.postTick();
    }

    tick() {
        this.associatedSquares.forEach((sp) => sp.tick())
    }

    postTick() { }
}


// Organic processing life cycle

/* 

A 'TypeOrganism' has a collection of 'TypeSquares' that are 
its members. 

These can be a variety of subtypes for different functions.

Computationally, organic life does the following: 

* Call 'tick' on all member squares.
* Then, call 'postTick' on itself. 

Inside 'postTick', we make decisions about what to do 
next, such as where to grow or where to die. 

*/

class PlantOrganism extends BaseOrganism {
    constructor(posX, posY) {
        super(posX, posY);
        this.proto = "PlantOrganism";
        this.type = "plant";

        this.rootNutrients = 1;
        this.airNutrients = 1;
        this.waterNutrients = 1;

        this.throttleInterval = 1000; 

        this.plantLastGrown = Date.now();
        this.waterLastGrown = Date.now(); 
        this.rootLastGrown = Date.now();
        
        this.growInitialSquares();
    }

    getSeedSquare() {
        var topGreen = this.getHighestGreen();
        var seedSquare = new SeedSquare(topGreen.posX, topGreen.posY - 1);
        if (addSquare(seedSquare)) {
            addOrganism(new PlantSeedOrganism(seedSquare.posX, seedSquare.posY));
        } else {
            return null;
        }
        return seedSquare;
    }

    growInitialSquares() {
        var ret = new Array();
        // a plant needs to grow a PlantSquare above ground 
        // and grow a RootOrganism into existing Dirt
        var topSquare = getSquare(this.posX, this.posY - 1);
        if (topSquare != null && topSquare.proto == "WaterSquare") {
            var topTop = getSquare(this.posX, this.posY - 2);
            if (topTop == null) {
                removeSquare(topSquare); // fuck them kids!!!!
            } else {
                return;
            }
        }
        if (addSquare(new PlantSquare(this.posX, this.posY - 1))) {
            var orgSq = addOrganismSquare(new PlantLifeSquare(this.posX, this.posY - 1));
            if (orgSq) {
                ret.push(orgSq);
            }
        };

        // root time
        var rootTargetSq = getSquare(this.posX, this.posY);
        if (rootTargetSq != null && rootTargetSq.rootable) {
            var rootSq = addOrganismSquare(new RootLifeSquare(this.posX, this.posY));
            if (rootSq) {
                ret.push(rootSq);
            }
        }

        if (ret.length == 2) {
            ret.forEach(addOrganismSquare);
            this.associatedSquares.push(...ret);
            return ret;
        } else {
            ret.forEach(removeOrganismSquare);
        }
    }
    render() {
        this.associatedSquares.forEach((sp) => sp.render())
    }

    postTick() {
        var airSuckFrac = po_airSuckFrac.value;
        var waterSuckFrac = po_waterSuckFrac.value;
        var rootSuckFrac = po_rootSuckFrac.value;

        var airNutrientsGained = 0;
        var waterNutrientsGained = 0;
        var rootNutrientsGained = 0;

        for (let i = 0; i < this.associatedSquares.length; i++) {
            let lifeSquare = this.associatedSquares[i];
            if (lifeSquare.type == "root") {
                rootNutrientsGained = lifeSquare.rootNutrients * rootSuckFrac;
                waterNutrientsGained = lifeSquare.waterNutrients * waterSuckFrac;

                this.rootNutrients += rootNutrientsGained;
                lifeSquare.rootNutrients -= rootNutrientsGained;

                this.waterNutrients += waterNutrientsGained;
                lifeSquare.waterNutrients -= waterNutrientsGained;
            }
            if (lifeSquare.type == "green") {
                airNutrientsGained = lifeSquare.airNutrients * airSuckFrac;

                this.airNutrients += airNutrientsGained;
                lifeSquare.airNutrients -= airNutrientsGained;
            }
        }

        var energyGained = this.law.photosynthesis(this.airNutrients, this.waterNutrients, this.rootNutrients);
        
        this.currentEnergy += energyGained;
        this.totalEnergy += energyGained;
        
        this.airNutrients -= energyGained;
        this.waterNutrients -= energyGained;
        this.rootNutrients -= energyGained;

        // our goal is to get enough energy to hit the 'reproductionEnergy', then spurt
        
        var lifeCyclePercentage = (Date.now() - this.spawnTime) / this.maxLifeTime;
        if (lifeCyclePercentage > 1) {
            this.destroy();
        }
        var currentEnergyPercentage = this.currentEnergy / this.reproductionEnergy;

        var totalEnergyLifeCycleRate = this.totalEnergy / this.maxLifeTime; 

        if (currentEnergyPercentage > 1) {
            this.spawnSeed();
            this.currentEnergy -= this.reproductionEnergyUnit;
            return;
        }

        var projectedEnergyAtEOL = this.currentEnergy + (totalEnergyLifeCycleRate * (1 - lifeCyclePercentage) * this.maxLifeTime);
        if (projectedEnergyAtEOL < this.reproductionEnergy * 2) {
            this.grow(); 
            return;
        } else {
            // we are growing fast enough it shoudl be fine
            console.log("Not growing - we will hit reproduction energy")
            return;
        }
    }

    getLowestGreen() {
        return Array.from(this.associatedSquares
            .filter((sq) => sq.type == "green")).sort((a, b) => b.posY - a.posY)[0];
    }

    getHighestGreen() {
        return Array.from(this.associatedSquares
            .filter((sq) => sq.type == "green")).sort((a, b) => a.posY - b.posY)[0];
    }

    getExteriorRoots() {
        var lowestGreen = Array.from(this.associatedSquares
            .filter((sq) => sq.type == "green")).sort((a, b) => b.posY - a.posY)[0];

        var visitedSquares = new Set();
        var exteriorRoots = new Set();
        var squaresToExplore = new Array();
        squaresToExplore.push(lowestGreen); // LifeSquare 
        visitedSquares.add(getSquare(lowestGreen.posX, lowestGreen.posY)); // TerrainSquares
        var curIdx = 0;
        do {
            var activeSquare = squaresToExplore[curIdx];
            var myNeighbors = getDirectNeighbors(activeSquare.posX, activeSquare.posY);
            for (let i = 0; i < myNeighbors.length; i++) {
                var neighbor = myNeighbors[i];
                var isExteriorRoot = true;
                if (neighbor == null) {
                    continue;
                }
                if (getCountOfOrganismsSquaresOfTypeAtPosition(neighbor.posX, neighbor.posY, "root") > 0 && (Array.from(visitedSquares).indexOf(neighbor) == -1)) {
                    squaresToExplore.push(neighbor)
                    visitedSquares.add(neighbor);
                    isExteriorRoot = false;

                }
                if (isExteriorRoot) {
                    exteriorRoots.add(activeSquare);
                }
            }
            curIdx += 1;
        } while (curIdx < squaresToExplore.length);

        return Array.from(exteriorRoots);
    }

    grow() {
        // make a decision on how to grow based on which of our needs we need the most
        let minNutrient = Math.min(Math.min(this.airNutrients, this.rootNutrients), this.waterNutrients);
        if (this.currentEnergy < 0) {
            console.log("Want to grow...but the effort is too much")
            return;
        }

        if (this.airNutrients == minNutrient) {
            this.currentEnergy -= this.growNewPlant();
            return;
        }

        if (this.rootNutrients == minNutrient) {
            this.currentEnergy -= this.growDirtRoot();
            return;
        }

        if (this.waterNutrients == minNutrient) {
            this.currentEnergy -= this.growWaterRoot();
            return;
        }
    }

    growNewPlant() {
        if (Date.now() > this.plantLastGrown + this.throttleInterval) {
            this.plantLastGrown = Date.now();
            var highestPlantSquare = Array.from(this.associatedSquares.filter((sq) => sq.type == "green").sort((a, b) => a.posY - b.posY))[0];
            if (highestPlantSquare == null) {
                // then we take highest root square;
                highestPlantSquare = Array.from(this.associatedSquares.filter((sq) => sq.type == "root").sort((a, b) => a.posY - b.posY))[0];
            }
            if (addSquare(new PlantSquare(highestPlantSquare.posX, highestPlantSquare.posY - 1))) {
                var orgSq = addOrganismSquare(new PlantLifeSquare(highestPlantSquare.posX, highestPlantSquare.posY - 1));
                if (orgSq) {
                    this.associatedSquares.push(orgSq);
                    return 1;
                }
            };
        }
        return 0;
    }

    getNumRootNeighborsAtSquare(square) {
        return getNeighbors(square.posX, square.posY)
            .filter((sq) => sq != null)
            .filter((sq) => sq.rootable)
            .map((sq) => getCountOfOrganismsSquaresOfTypeAtPosition(sq.posX, sq.posY, "root"))
            .reduce((accumulator, currentValue) => accumulator + currentValue, 0);
    }

    growWaterRoot() {
        if (Date.now() > this.waterLastGrown + this.throttleInterval) {
            this.waterLastGrown = Date.now();
            var wettestSquare = null;
            for (let i = 0; i < this.associatedSquares.length; i++) {
                var sq = this.associatedSquares[i];
                if (sq.type != "root") {
                    continue;
                }
                var sqNeighbors = getDirectNeighbors(sq.posX, sq.posY);
                for (let j = 0; j < sqNeighbors.length; j++) {
                    var compSquare = sqNeighbors[j];
                    if (compSquare == null 
                        || !compSquare.rootable 
                        || getCountOfOrganismsSquaresOfTypeAtPosition(compSquare.posX, compSquare.posY, "root") > 0) 
                    {
                        continue;
                    }
                    if (
                        // (this.getNumRootNeighborsAtSquare(compSquare) < 3) && 
                        (wettestSquare == null || (wettestSquare.waterContainment < compSquare.waterContainment))) {
                        wettestSquare = compSquare;
                    }
                }
            }
            if (wettestSquare != null) {
                var rootSquare = addOrganismSquare(new RootLifeSquare(wettestSquare.posX, wettestSquare.posY));
                if (rootSquare) {
                    this.associatedSquares.push(rootSquare);
                    return 1;
                }
            }
        }
        return 0;
    }

    growDirtRoot() {
        if (Date.now() > this.rootLastGrown + this.throttleInterval) {
            this.rootLastGrown = Date.now();
            var dirtiestSquare = null;
            var dirtiestSquareDirtResourceAvailable = 0;

            this.associatedSquares.filter((iterSquare) => iterSquare.type == "root").forEach((iterSquare) => {
                getDirectNeighbors(iterSquare.posX, iterSquare.posY)
                .filter((compSquare) => compSquare != null)
                .filter((compSquare) => compSquare.rootable)
                .filter((compSquare) => getOrganismSquaresAtSquare(compSquare.posX, compSquare.posY).length == 0)
                .forEach((compSquare) => {
                    var compSquareResourceAvailable = getDirectNeighbors(compSquare.posX, compSquare.posY)
                        .filter((sq) => sq != null && sq.solid && sq.nutrientValue.value > 0)
                        .map((sq) => {
                            var sqNeighbors = getDirectNeighbors(sq.posX, sq.posY);
                            var sqNeighborsRooted = Array.from(sqNeighbors.filter((ssq) => ssq != null).filter((ssq) => getCountOfOrganismsSquaresOfTypeAtPosition(ssq.posX, ssq.posY, "root")));
                            return sq.nutrientValue.value / (sqNeighborsRooted.length + 1);
                        })
                        .reduce(
                        (accumulator, currentValue) => accumulator + currentValue,
                        0,
                    );

                    if (compSquareResourceAvailable > dirtiestSquareDirtResourceAvailable || 
                            (compSquareResourceAvailable == dirtiestSquareDirtResourceAvailable && compSquare.posY < dirtiestSquare.posY)
                        ) {
                        dirtiestSquare = compSquare;
                        dirtiestSquareDirtResourceAvailable = compSquareResourceAvailable;
                    }
                });
            });
            if (dirtiestSquare != null) {
                var rootSquare = addOrganismSquare(new RootLifeSquare(dirtiestSquare.posX, dirtiestSquare.posY));
                if (rootSquare) {
                    this.associatedSquares.push(rootSquare);
                    return 1;
                }
            }
        }
        return 0;
    }
}

class PlantLifeSquare extends BaseLifeSquare {
    constructor(posX, posY) {
        super(posX, posY);
        this.proto = "PlantLifeSquare";
        this.colorBase = "#157F1F";
        this.type = "green";
        this.airNutrients = 0;
    }

    tick() {
        this.airNutrients = 0;
        getDirectNeighbors(this.posX, this.posY).filter((nb) => nb == null).forEach((sq) => this.airNutrients += p_ls_airNutrientsPerExposedNeighborTick.value);
    }
}

class RootLifeSquare extends BaseLifeSquare {
    constructor(posX, posY) {
        super(posX, posY);
        this.proto = "RootLifeSquare";
        this.colorBase = "#554640";
        this.type = "root";
        this.rootNutrients = 0;
        this.waterNutrients = 0;
    }
    tick() {
        this.rootNutrients = 0;
        getDirectNeighbors(this.posX, this.posY)
            .filter((n) => n != null && n.solid)
            .forEach((neighbor) => {
                this.rootNutrients += neighbor.nutrientValue.value;
                this.waterNutrients += neighbor.suckWater(this.waterNutrients);
        });
    }
}

class PlantSeedOrganism extends BaseOrganism {
    constructor(posX, posY) {
        super(posX, posY);
        this.proto = "PlantSeedOrganism";
        this.growInitialSquares();
    }
    growInitialSquares() {
        var sq = getSquare(this.posX, this.posY);
        if (sq != null && sq.rootable) {
            var newLifeSquare = new PlantSeedLifeSquare(this.posX, this.posY);
            if (addOrganismSquare(newLifeSquare)) {
                this.associatedSquares.push(newLifeSquare);
            }
        }
    }

    postTick() {
        if (this.associatedSquares[0].sproutStatus >= 1) {
            // now we need to convert ourself into a 'plant organism'
            var squareBottom = getSquare(this.posX, this.posY + 1); 
            if (squareBottom != null && squareBottom.organic) {
                this.destroy();
                return;
            } else {
                if (squareBottom.physicsEnabled) {
                    addOrganism(new PlantOrganism(this.posX, this.posY));
                    this.destroy();
                } else {
                    this.destroy();
                }
            }
        }
    }
}

class PlantSeedLifeSquare extends BaseLifeSquare {
    constructor(posX, posY) {
        super(posX, posY);
        this.proto = "PlantSeedLifeSquare";
        this.type = "seed";
        this.sproutStatus = 0;
        this.sproutGrowthRate = p_seed_ls_sproutGrowthRate;
        this.p_seed_ls_neighborWaterContainmentRequiredToGrow = p_seed_ls_neighborWaterContainmentRequiredToGrow;
        this.neighborWaterContainmentRequiredToDecay = p_seed_ls_neighborWaterContainmentRequiredToDecay;
        this.colorBase = "#EABDA8";
    }

    tick() {
        var hostSquare = getSquare(this.posX, this.posY);
        if (hostSquare == null) {
            console.error("Host squarre is null!");
            return;
        }
        var directNeighbors = getNeighbors(this.posX, this.posY);

        var totalSurroundingWater = hostSquare.waterContainment;
        for (var i = 0; i < directNeighbors.length; i++) {
            var neighbor = directNeighbors[i];
            if (neighbor == null) {
                continue;
            }
            if (!neighbor.solid) { // basically if it's a water type?? idk maybe this is unclear
                totalSurroundingWater += 1;
                continue;
            }
            totalSurroundingWater += neighbor.waterContainment;
        }

        if (totalSurroundingWater < this.neighborWaterContainmentRequiredToDecay.value) {
            this.sproutStatus -= this.sproutGrowthRate.value;
        }
        if (totalSurroundingWater > this.p_seed_ls_neighborWaterContainmentRequiredToGrow.value) {
            this.sproutStatus += this.sproutGrowthRate.value;
        }

        this.sproutStatus = Math.max(0, this.sproutStatus);
    }

    calculateColor() {
        var baseColorRGB = hexToRgb(this.colorBase);
        var darkeningStrength = p_seed_ls_darkeningStrength.value;
        // Water Saturation Calculation
        // Apply this effect for 20% of the block's visual value. 
        // As a fraction of 0 to 255, create either perfect white or perfect grey.

        var num = this.sproutStatus;
        var numMax = 1;

        var featureColor255 = (1 - (num / numMax)) * 255;
        var darkeningColorRGB = { r: featureColor255, b: featureColor255, g: featureColor255 };

        ['r', 'g', 'b'].forEach((p) => {
            darkeningColorRGB[p] *= darkeningStrength;
            baseColorRGB[p] *= (1 - darkeningStrength);
        });

        var resColor = {
            r: darkeningColorRGB.r + baseColorRGB.r,
            g: darkeningColorRGB.g + baseColorRGB.g,
            b: darkeningColorRGB.b + baseColorRGB.b
        }

        return rgbToHex(Math.floor(resColor.r), Math.floor(resColor.g), Math.floor(resColor.b));
    }


}


// Returns all neighbors (including corners)
function getNeighbors(x, y) {
    var out = [];
    for (var i = -1; i < 2; i++) {
        for (var j = -1; j < 2; j++) {
            if (i == 0 && j == 0) {
                continue;
            }
            out.push(getSquare(x + i, y + j));
        }
    }
    return out;
}

function getDirectNeighbors(x, y) {
    var out = [];
    for (var i = -1; i < 2; i++) {
        for (var j = -1; j < 2; j++) {
            if (i == 0 && j == 0) {
                continue;
            }
            if (abs(i) == abs(j)) {
                continue;
            }
            out.push(getSquare(x + i, y + j));
        }
    }
    return out;
}


function addSquare(square) {
    if (getSquare(square.posX, square.posY) != null) {
        console.warn("Square not added; coordinates occupied.");
        return false;
    }
    if (!square.posX in ALL_SQUARES) {
        ALL_SQUARES[square.posX] = new Map();
    }
    ALL_SQUARES[square.posX][square.posY] = square;
    return square;
}

function addSquareOverride(square) {
    var existingSquare = getSquare(square.posX, square.posY);
    if (existingSquare != null) {
        if (existingSquare.physicsEnabled == true && square.solid) {
            removeSquare(existingSquare);
        } else {
            return false;
        }
    }
    if (!square.posX in ALL_SQUARES) {
        ALL_SQUARES[square.posX] = new Map();
    }
    ALL_SQUARES[square.posX][square.posY] = square;
    return square;
}

function addOrganism(organism) {
    if (getSquare(organism.posX, organism.posY) == null) {
        console.warn("Invalid organism placement; no squares to bind to.")
        return false;
    }

    if (getCountOfOrganismsOfTypeAtPosition(organism.posX, organism.posY, organism.proto) > 0) {
        return;
    }

    if (organism.associatedSquares.length > 0) {
        ALL_ORGANISMS.push(organism);
    } else {
        console.log("Organism is fucked up in some way; please reconsider")
        organism.destroy();
    }

}

function addOrganismSquare(organismSqaure) {
    if (getSquare(organismSqaure.posX, organismSqaure.posY) == null) {
        console.warn("Invalid organism placement; no squares to bind to.")
        return false;
    }

    if (getCountOfOrganismsSquaresOfProtoAtPosition(organismSqaure.posX, organismSqaure.posY, organismSqaure.proto) > 0) {
        console.warn("Invalid organism placement; already found an organism of this type here.")
        return false;
    }

    if (!(organismSqaure.posX in ALL_ORGANISM_SQUARES)) {
        ALL_ORGANISM_SQUARES[organismSqaure.posX] = new Map();
    }
    if (!(organismSqaure.posY in ALL_ORGANISM_SQUARES[organismSqaure.posX])) {
        ALL_ORGANISM_SQUARES[organismSqaure.posX][organismSqaure.posY] = new Array();
    }
    ALL_ORGANISM_SQUARES[organismSqaure.posX][organismSqaure.posY].push(organismSqaure);
    return organismSqaure;
}

function getSquare(posX, posY) {
    if (!(posX in ALL_SQUARES)) {
        ALL_SQUARES[posX] = new Map();
    }
    return ALL_SQUARES[posX][posY];
}


function getOrganismSquaresAtSquare(posX, posY) {
    if (!(posX in ALL_ORGANISM_SQUARES)) {
        ALL_ORGANISM_SQUARES[posX] = new Map();
    }
    if (!(posY in ALL_ORGANISM_SQUARES[posX])) {
        ALL_ORGANISM_SQUARES[posX][posY] = new Array();
    }

    return ALL_ORGANISM_SQUARES[posX][posY];
}

// SLOW 
function getOrganismsAtSquare(posX, posY) {
    var arr = Array.from(ALL_ORGANISMS.filter((org) => org.posX == posX && org.posY == posY));
    if (arr.length == 0) {
        return [];
    }
    return arr;
}

function getOrganismSquaresAtSquareOfProto(posX, posY, proto) {
    if (!(posX in ALL_ORGANISM_SQUARES)) {
        ALL_ORGANISM_SQUARES[posX] = new Map();
    }
    if (!(posY in ALL_ORGANISM_SQUARES[posX])) {
        ALL_ORGANISM_SQUARES[posX][posY] = new Array();
    }
    for (let i = 0; i < ALL_ORGANISM_SQUARES[posX][posY].length; i++) {
        if (ALL_ORGANISM_SQUARES[posX][posY][i].proto == proto) {
            return ALL_ORGANISM_SQUARES[posX][posY][i];
        }
    }
    return null;
}

function removeOrganismSquare(organismSquare) {
    var posX = organismSquare.posX;
    var posY = organismSquare.posY;

    if (!(posX in ALL_ORGANISM_SQUARES)) {
        ALL_ORGANISM_SQUARES[posX] = new Map();
    }
    if (!(posY in ALL_ORGANISM_SQUARES[posX])) {
        ALL_ORGANISM_SQUARES[posX][posY] = new Array();
    }
    removeItemAll(ALL_ORGANISM_SQUARES[posX][posY], organismSquare);
}

function removeSquarePos(x, y) {
    x = Math.floor(x);
    y = Math.floor(y);
    if (getSquare(x, y) != null) {
        removeSquare(getSquare(x, y));

    }
}
function removeSquare(square) {
    getOrganismSquaresAtSquare(square.posX, square.posY)
        .forEach(removeOrganismSquare);
    ALL_ORGANISM_SQUARES[square.posX][square.posY]
    ALL_SQUARES[square.posX][square.posY] = null;
}

function reset() {
    iterateOnSquares((sq) => sq.reset(), 0);
    visitedBlockCount = {};
    stats["pressure"] = 0;
    WATERFLOW_TARGET_SQUARES = new Map();
    WATERFLOW_CANDIDATE_SQUARES = new Set();
}

function render() {
    iterateOnSquares((sq) => sq.render(), 0);
}
function physics() {
    iterateOnSquares((sq) => sq.physics(), 0.1);
}
function physicsBefore() {
    iterateOnSquares((sq) => sq.physicsBefore(), 0);
    iterateOnSquares((sq) => sq.physicsBefore2(), 0);
}

function processOrganisms() {
    iterateOnOrganisms((org) => org.process(), 0);
}

function renderOrganisms() {
    iterateOnOrganisms((org) => org.render(), 0);
}

/**
 * @param {function} func - function with an argumnet of the square it should do the operation on  
 */
function iterateOnSquares(func, sortRandomness) {
    var rootKeys = Object.keys(ALL_SQUARES);
    var squareOrder = [];
    for (let i = 0; i < rootKeys.length; i++) {
        var subKeys = Object.keys(ALL_SQUARES[rootKeys[i]]);
        for (let j = 0; j < subKeys.length; j++) {
            var sq = ALL_SQUARES[rootKeys[i]][subKeys[j]];
            if (sq != null) {
                squareOrder.push(sq);
                // func(sq);
            }
        }
    }
    squareOrder.sort((a, b) => (Math.random() > sortRandomness ? (a.posX + a.posY * 10) - (b.posX + b.posY * 10) : (a.posX + a.posY * 10 - b.posX + b.posY * 10)));
    squareOrder.forEach(func);
}

function iterateOnOrganisms(func, sortRandomness) {
    var organismOrder = ALL_ORGANISMS;
    organismOrder.sort((a, b) => (Math.random() > sortRandomness ? (a.posX + a.posY * 10) - (b.posX + b.posY * 10) : (a.posX + a.posY * 10 - b.posX + b.posY * 10)));
    organismOrder.forEach(func);
}

function purge() {
    iterateOnSquares((sq) => {
        var ret = true;
        ret &= sq.posX > 0;
        ret &= sq.posX < CANVAS_SQUARES_X;
        ret &= sq.posY > 0;
        ret &= sq.posY < CANVAS_SQUARES_Y;
        if (!ret) {
            removeSquare(sq);
        }
    });
}

function getCountOfOrganismsSquaresOfProtoAtPosition(posX, posY, proto) {
    var existingOrganismSquares = getOrganismSquaresAtSquare(posX, posY);
    var existingOrganismSquaresOfSameProtoArray = Array.from(existingOrganismSquares.filter((org) => org.proto == proto));
    return existingOrganismSquaresOfSameProtoArray.length;
}

function getCountOfOrganismsSquaresOfTypeAtPosition(posX, posY, type) {
    var existingOrganismSquares = getOrganismSquaresAtSquare(posX, posY);
    var existingOrganismSquaresOfSameTypeArray = Array.from(existingOrganismSquares.filter((org) => org.type == type));
    return existingOrganismSquaresOfSameTypeArray.length;
}

function getCountOfOrganismsOfTypeAtPosition(posX, posY, type) {
    return existingOrganismSquaresOfSameTypeArray = Array.from(ALL_ORGANISMS
        .filter((org) => org.posX == posX && org.posY == posY)
        .filter((org) => org.proto == type)
    ).length;
}

function doWaterFlow() {
    for (let curWaterflowPressure = 0; curWaterflowPressure < getGlobalStatistic("pressure"); curWaterflowPressure++) {
        if (WATERFLOW_CANDIDATE_SQUARES.size > 0) {
            // we need to do some water-mcflowin!
            var candidate_squares_as_list = Array.from(WATERFLOW_CANDIDATE_SQUARES);
            var target_squares = WATERFLOW_TARGET_SQUARES[curWaterflowPressure];
            if (target_squares == null) {
                continue;
            }

            for (let j = 0; j < Math.max(candidate_squares_as_list.length, target_squares.length); j++) {
                var candidate = candidate_squares_as_list[j % candidate_squares_as_list.length];
                var target = target_squares[j % target_squares.length];
                if (candidate.group == target[2]) {
                    if (Math.random() > ((1 - candidate.viscocity.value) ** (curWaterflowPressure + 1))) {
                        var dx = target[0] - candidate.posX;
                        var dy = target[1] - candidate.posY;
                        if (Math.abs(dy) == 0 && Math.abs(dx) < 5) {
                            continue;
                        }
                        candidate.updatePosition(target[0], target[1]);
                    }
                }
            }
        }
    }
}

function main() {
    if (Date.now() - lastTick > MILLIS_PER_TICK) {
        MAIN_CONTEXT.clearRect(0, 0, CANVAS_SQUARES_X * BASE_SIZE, CANVAS_SQUARES_Y * BASE_SIZE);

        render();
        doClickAdd();
        // square life cycle
        reset();
        physicsBefore();
        physics();
        doWaterFlow();
        purge();

        // organism life cycle;
        processOrganisms();
        renderOrganisms();
        lastTick = Date.now();
    }
}


function randNumber(min, max) {
    return Math.floor(Math.random() * (max - min) + min);
}

function handleClick(event) {
    lastClickEvent = event;
    if (!rightMouseClicked && mouseDown <= 0) {
        lastLastClickEvent = event;
    }
}

function doClickAdd() {
    if (lastClickEvent == null) {
        return;
    }
    if (mouseDown > 0) {
        var offsetX = lastClickEvent.offsetX / BASE_SIZE;
        var offsetY = lastClickEvent.offsetY / BASE_SIZE;
        var prevOffsetX = (lastLastClickEvent == null ? lastClickEvent : lastLastClickEvent).offsetX / BASE_SIZE;
        var prevOffsetY = (lastLastClickEvent == null ? lastClickEvent : lastLastClickEvent).offsetY / BASE_SIZE;

        // point slope motherfuckers 

        var x1 = prevOffsetX;
        var x2 = offsetX;
        var y1 = prevOffsetY;
        var y2 = offsetY;

        var dx = x2 - x1;
        var dy = y2 - y1;
        var dz = Math.pow(dx ** 2 + dy ** 2, 0.5);

        var totalCount = Math.max(1, Math.round(dz));
        var ddx = dx / totalCount;
        var ddy = dy / totalCount;
        for (let i = 0; i < totalCount; i += 0.5) {
            var px = x1 + ddx * i;
            var py = y1 + ddy * i;
            for (let i = 0; i < (CANVAS_SQUARES_Y - offsetY); i++) {
                var curY = py + i;
                if (rightMouseClicked) {
                    doErase(px, curY);
                    break;
                } else {
                    switch (selectedMaterial) {
                        case "static":
                            addSquareOverride(new StaticSquare(px, curY));
                            break;
                        case "dirt":
                            addSquareOverride(new DirtSquare(px, curY));
                            break;
                        case "water":
                            addSquareOverride(new WaterSquare(px, curY));
                            break;
                        case "rain":
                            addSquareOverride(new RainSquare(px, curY));
                            break;
                        case "heavy rain":
                            addSquareOverride(new HeavyRainSquare(px, curY));
                            break;
                        case "water distribution":
                            addSquareOverride(new WaterDistributionSquare(px, curY));
                            break;
                        case "drain":
                            addSquareOverride(new DrainSquare(px, curY));
                            break;
                        case "aquifer":
                            addSquareOverride(new AquiferSquare(px, curY));
                            break;

                        // organism sections
                        // in this case we only want to add one per click
                        case "plant":
                            if (organismAddedThisClick) {
                                break;
                            }
                            var sq = addSquare(new SeedSquare(px, curY));
                            if (sq != null) {
                                organismAddedThisClick = true;
                                addOrganism(new PlantSeedOrganism(px, curY));
                            }
                            break;
                    }
                }
                if (!fastTerrain.checked || selectedMaterial.indexOf("rain") >= 0) {
                    break;
                }
            }
        }
        lastLastClickEvent = lastClickEvent;
    }
}

function doErase(x, y) {
    var workingEraseRadius = ERASE_RADIUS * 2 + 1;
    // it has to be an odd number
    // we make a cross like thing
    var start = (workingEraseRadius + 1) / 2;
    for (var i = -start; i < start; i++) {
        for (var j = -start; j < start; j++) {
            removeSquarePos(x + i, y + j);
        }
    }
}

function getNextGroupId() {
    NUM_GROUPS += 1;
    return NUM_GROUPS;
}

// thanks https://stackoverflow.com/questions/5623838/rgb-to-hex-and-hex-to-rgb
function hexToRgb(hex) {
    var result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
    return result ? {
        r: parseInt(result[1], 16),
        g: parseInt(result[2], 16),
        b: parseInt(result[3], 16)
    } : null;
}
function rgbToHex(r, g, b) {
    return "#" + (1 << 24 | r << 16 | g << 8 | b).toString(16).slice(1);
}

function updateGlobalStatistic(name, value) {
    if (name in stats) {
        if (value > (stats[name])) {
            stats[name] = value;
        }
    }
}
function getGlobalStatistic(name) {
    if (!name in stats) {
        console.warn("getGlobalStatistic miss for ", name)
        return -1;
    }
    return stats[name];
}

function removeItemAll(arr, value) {
    var i = 0;
    while (i < arr.length) {
      if (arr[i] === value) {
        arr.splice(i, 1);
      } else {
        ++i;
      }
    }
    return arr;
  }


for (let i = 0; i < CANVAS_SQUARES_X; i++) {
    addSquare(new DrainSquare(i, CANVAS_SQUARES_Y - 1));
}


for (let i = 0; i < CANVAS_SQUARES_Y; i++) {
    addSquare(new StaticSquare(CANVAS_SQUARES_X - 1, i));
    addSquare(new StaticSquare(1, i));
}

setInterval(main, 1);

// setTimeout(() => window.location.reload(), 3000);
window.oncontextmenu = function () {
    return false;     // cancel default menu
}

var abs = Math.abs;

var ProtoMap = {
    "BaseSquare": BaseSquare.prototype,
    "DirtSquare": DirtSquare.prototype,
    "StaticSquare": StaticSquare.prototype,
    "PlantSquare": PlantSquare.prototype,
    "DrainSquare": DrainSquare.prototype,
    "WaterDistributionSquare": WaterDistributionSquare.prototype,
    "RainSquare": RainSquare.prototype,
    "HeavyRainSquare": HeavyRainSquare.prototype,
    "WaterSquare": WaterSquare.prototype,
    "BaseLifeSquare": BaseLifeSquare.prototype,
    "BaseOrganism": BaseOrganism.prototype,
    "PlantOrganism": PlantOrganism.prototype,
    "PlantLifeSquare": PlantLifeSquare.prototype,
    "RootLifeSquare": RootLifeSquare.prototype,
    "PlantSeedOrganism": PlantSeedOrganism.prototype,
    "PlantSeedLifeSquare": PlantSeedLifeSquare.prototype,
    "SeedSquare": SeedSquare.prototype,
    "Law": Law.prototype
}
