import { BaseSquare } from "./squares/BaseSqaure.js";
import { PlantSquare } from "./squares/PlantSquare.js";
import { RainSquare } from "./squares/parameterized/RainSquare.js";
import { HeavyRainSquare } from "./squares/parameterized/RainSquare.js";
import { WaterSquare } from "./squares/WaterSquare.js";
import { BaseLifeSquare } from "./lifeSquares/BaseLifeSquare.js";
import { BaseOrganism } from "./organisms/BaseOrganism.js";
import { SeedLifeSquare } from "./lifeSquares/SeedLifeSquare.js";
import { SeedSquare } from "./squares/SeedSquare.js";
import { AquiferSquare } from "./squares/parameterized/RainSquare.js";
import { SoilSquare } from "./squares/parameterized/SoilSquare.js";
import { RockSquare } from "./squares/parameterized/RockSquare.js";
import { WheatGreenSquare } from "./lifeSquares/parameterized/agriculture/grasses/WheatGreenSquare.js";
import { GenericParameterizedRootSquare } from "./lifeSquares/parameterized/GenericParameterizedRootSquare.js";
import { WheatOrganism } from "./organisms/parameterized/agriculture/grasses/WheatOrganism.js";


var ProtoMap = {
    "BaseSquare": BaseSquare.prototype,
    "PlantSquare": PlantSquare.prototype,
    "RainSquare": RainSquare.prototype,
    "HeavyRainSquare": HeavyRainSquare.prototype,
    "SoilSquare": SoilSquare.prototype,
    "RockSquare": RockSquare.prototype,
    "SoilSquare": SoilSquare.prototype,
    "WaterSquare": WaterSquare.prototype,
    "BaseLifeSquare": BaseLifeSquare.prototype,
    "BaseOrganism": BaseOrganism.prototype,
    "SeedLifeSquare": SeedLifeSquare.prototype,
    "SeedSquare": SeedSquare.prototype,
    "AquiferSquare": AquiferSquare.prototype,
    "WheatGreenSquare": WheatGreenSquare.prototype,
    "GenericParameterizedRootSquare": GenericParameterizedRootSquare.prototype,
    "WheatOrganism": WheatOrganism.prototype
}

var TypeMap = {
    [GenericParameterizedRootSquare.name]: GenericParameterizedRootSquare,
    [WheatGreenSquare.name] : WheatGreenSquare
}

var TypeNameMap = {
    GenericParameterizedRootSquare: GenericParameterizedRootSquare.name,
    WheatGreenSquare: WheatGreenSquare.name
}

export { ProtoMap, TypeMap, TypeNameMap}