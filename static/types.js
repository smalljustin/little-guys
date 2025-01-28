import { BaseSquare } from "./squares/BaseSqaure.js";
import { DirtSquare } from "./squares/DirtSquare.js";
import { RockSquare } from "./squares/RockSquare.js";
import { PlantSquare } from "./squares/PlantSquare.js";
import { DrainSquare } from "./squares/DrainSquare.js";
import { RainSquare } from "./squares/RainSquare.js";
import { HeavyRainSquare } from "./squares/RainSquare.js";
import { WaterSquare } from "./squares/WaterSquare.js";
import { BaseLifeSquare } from "./lifeSquares/BaseLifeSquare.js";
import { BaseOrganism } from "./organisms/BaseOrganism.js";
import { PopGrassOrganism } from "./organisms/PopGrassOrganism.js";
import { PopGrassGreenLifeSquare } from "./lifeSquares/PopGrassGreenLifeSquare.js";
import { PopGrassRootLifeSquare } from "./lifeSquares/PopGrassRootLifeSquare.js";
import { PopGrassSeedOrganism } from "./organisms/PopGrassSeedOrganism.js";
import { SeedLifeSquare } from "./lifeSquares/SeedLifeSquare.js";
import { SeedSquare } from "./squares/SeedSquare.js";
import { Law } from "./Law.js";
import { AquiferSquare } from "./squares/RainSquare.js";
import { GravelSquare } from "./squares/GravelSquare.js";
import { SoilSquare } from "./squares/parameterized/SoilSquare.js";


var ProtoMap = {
    "BaseSquare": BaseSquare.prototype,
    "DirtSquare": DirtSquare.prototype,
    "RockSquare": RockSquare.prototype,
    "PlantSquare": PlantSquare.prototype,
    "DrainSquare": DrainSquare.prototype,
    "RainSquare": RainSquare.prototype,
    "HeavyRainSquare": HeavyRainSquare.prototype,
    "SoilSquare": SoilSquare.prototype,
    "WaterSquare": WaterSquare.prototype,
    "BaseLifeSquare": BaseLifeSquare.prototype,
    "BaseOrganism": BaseOrganism.prototype,
    "PopGrassOrganism": PopGrassOrganism.prototype,
    "PopGrassGreenLifeSquare": PopGrassGreenLifeSquare.prototype,
    "PopGrassRootLifeSquare": PopGrassRootLifeSquare.prototype,
    "PopGrassSeedOrganism": PopGrassSeedOrganism.prototype,
    "SeedLifeSquare": SeedLifeSquare.prototype,
    "SeedSquare": SeedSquare.prototype,
    "Law": Law.prototype,
    "AquiferSquare": AquiferSquare.prototype,
    "GravelSquare": GravelSquare.prototype
}

export {ProtoMap}