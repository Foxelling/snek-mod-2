let {chainContainerBuilding, chainCoreBuilding} = require("chain_buildings");

Blocks.container.buildType = chainContainerBuilding(Blocks.container);
Blocks.vault.buildType = chainContainerBuilding(Blocks.vault);

Blocks.coreShard.buildType = chainCoreBuilding(Blocks.coreShard);
Blocks.coreFoundation.buildType = chainCoreBuilding(Blocks.coreFoundation);
Blocks.coreNucleus.buildType = chainCoreBuilding(Blocks.coreNucleus);
