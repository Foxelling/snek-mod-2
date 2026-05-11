"use strict";
let StorageGraph = require("storage_graph");

let chainMethods = {
    _storageGraph: null,
    getGraph() {
        return this._storageGraph;
    },
    setGraph(value) {
        this._storageGraph = value;
    },

    handleItem(source, item){
        if(this._storageGraph == null) {
            this.super$handleItem(source, item);
            return;
        }
        
        this._storageGraph.handleItem(source, item);
    },
    acceptItem(source, item){
        if(this._storageGraph == null) {
            return this.super$acceptItem(source, item);
        }

        return this._storageGraph.acceptItem(source, item);
    },
    acceptStack(item, amount, source){
        if(this._storageGraph == null) {
            return this.super$acceptStack(item, amount, source);
        }

        return this._storageGraph.acceptStack(item, amount, source);
    },
    removeStack(item, amount){
        if(this._storageGraph == null) {
            return this.super$removeStack(item, amount);
        }

        this.noSleep();
        return this._storageGraph.removeStack(item, amount);
    },
    handleStack(item, amount, source){
        if(this._storageGraph == null) {
            return this.super$handleStack(item, amount, source);
        }

        return this._storageGraph.handleStack(item, amount, source);
    },

    onProximityAdded() {
        this.updateStorageGraph();
    },
    onProximityRemoved() {
        if(this._storageGraph == null) return;

        this._storageGraph.remove(this);
    },
    updateStorageGraph() {
        let con = this.getStorageConnections();

        con.each(other => {
            if (this._storageGraph == null) {
                let graph = new StorageGraph();
                graph.add(this);
            }
            if (other.getGraph() == null) {
                this._storageGraph.add(other);
            } else {
                this._storageGraph.addGraph(other.getGraph());
            }
        });
    },

    // TODO: do not create a new seq every time
    getStorageConnections() {
        return this.proximity.select(boolf(other => other != null && other.team == this.team && this.connectsStorageTo(other)));
    },
    // Assume all cores have StorageGraph
    connectsStorageTo(other) {
        return other.block.coreMerge || other.block instanceof CoreBlock;
    },
    // hack
    writeBase(write){
        let writeVisibility = Vars.state.rules.fog && this.visibleFlags != 0;

        write.f(this.health);
        write.b(this.rotation | 0b10000000);
        write.b(this.team.id);
        write.b(this.writeVisibility ? 4 : 3);
        write.b(this.enabled ? 1 : 0);

        write.b(this.moduleBitmask());

        // relevant code here
        let percent = 1;
        if(this._storageGraph != null){
            // let storageCapacity = this instanceof CoreBlock.CoreBuild ? this._storageGraph.coreCapacity : this.block.itemCapacity;
            let storageCapacity = this.block.itemCapacity; // THIS MIGHT AND PROBABLY WILL LOSE ITEMS SOMETIMES WHEN LOADING MAPS WITH MULTIPLE CORES
            percent = storageCapacity / this._storageGraph.getTotalCapacity();
        }
        let items = new ItemModule();
        Vars.content.items().each(item => {
            if(this.items.has(item)){
                items.add(item, this.items.get(item) * percent);
            }
        });
        items.write(write);

        // if(this.timeScale != 1){
        //     write.f(timeScale);
        //     write.f(timeScaleDuration);
        // }

        if(this.lastDisabler != null && this.lastDisabler.isValid()){
            write.i(this.lastDisabler.pos());
        }

        write.b(Mathf.clamp(this.efficiency) * 255);
        write.b(Mathf.clamp(this.optionalEfficiency) * 255);

        if(this.writeVisibility){
            write.l(this.visibleFlags);
        }
    },
};

/**
 * The extendable storage buildtype, extending building disallows connecting to core behavior (see https://github.com/Anuken/Mindustry/blob/2ad41a904753a47f6fb1a7b64dbea46204ce207e/core/src/mindustry/world/blocks/storage/CoreBlock.java#L788C1-L788C85 )
 */
let chainContainerBuilding = (block) => () => {
    let build = extend(Building, Object.assign({}, chainMethods, {
        // TODO
        // pickedUp(){

        // },
        moduleBitmask() {
            return 1;
        },
        canPickup() {
            return false;
        },
        // big boom
        // explosionItemCap(){
        //     return this._storageGraph != null ? Math.min(this.itemCapacity/60, 6) : this.itemCapacity
        // },
        onDestroyed(){
            this.super$onDestroyed();

            if(this._storageGraph == null) return;

            let percent = this.block.itemCapacity / this._storageGraph.getCapacity();
            
            Vars.content.items().each(item => {
                if(this.items.has(item)){
                    let amount = this.items.get(item) * percent;

                    if(this.team == Vars.state.rules.defaultTeam && Vars.state.isCampaign()){
                        Vars.state.rules.sector.info.handleCoreItem(item, -amount);
                    }
                    this.items.remove(item, amount);
                }
            });
        },

        getMaximumAccepted() {
            if(this._storageGraph != null) return this._storageGraph.getMaximumAccepted();

            return this.itemCapacity;
        },
    }));
    build.block = block;
    return build;
};


/**
 * Currently very hacky, storageCapacity should be a shared resource
 */
let chainCoreBuilding = (block) => () => extend(CoreBlock.CoreBuild, block, Object.assign({}, chainMethods, {
    // created(){
    //     this.super$created();

    // },

    onProximityUpdate(){
        // this.noSleep();
        
        // Vars.state.teams.registerCore(this);

        // if(this._storageGraph == null) {
        //     let cap = 0;
        //     Vars.state.teams.cores(this.team).each(core => {
        //         core.items = this.items;
        //         cap += core.block.itemCapacity;
        //     });
        //     this.storageCapacity = cap;
        // }

        this.super$onProximityUpdate(); // TODO: loop through cores once

        // superclass fucks up the storageCapacity
        if(this._storageGraph != null) {
            Vars.state.teams.cores(this.team).each(core => {
                core.storageCapacity = this._storageGraph.getTotalCapacity();
            });
            return;
        }

        // only one graph for cores must exist

        let graphCore = Vars.state.teams.cores(this.team).find(c => c != this && c.getGraph() != null);
        if(graphCore != null){
            let graph = new StorageGraph();
            graph.add(this);
            
            graphCore.getGraph().addGraph(graph);
        }
        // if nothing is connected, then superclass did it properly
    },

    getMaximumAccepted() { // TODO: consider core incineration
        if(this._storageGraph != null) return this._storageGraph.getMaximumAccepted();

        return this.storageCapacity;
    }
}));

module.exports = {
    chainContainerBuilding: chainContainerBuilding,
    chainCoreBuilding: chainCoreBuilding,
}
