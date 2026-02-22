let {chainContainerBuilding, chainCoreBuilding} = require("chain_buildings");

Blocks.container.buildType = chainContainerBuilding;
Blocks.vault.buildType = chainContainerBuilding;

Blocks.coreSharded.buildType = chainCoreBuilding;
Blocks.coreFoundation.buildType = chainCoreBuilding;
Blocks.coreNucleus.buildType = chainCoreBuilding;
