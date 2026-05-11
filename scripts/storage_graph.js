"use strict";
/**
 * Basic implementation of storage sharing
 * Based on PowerGraph.java
 */

const MAX_CAPACITY = 100000;

let graphId = 0;
function StorageGraph() {
    this.queue = new Queue();
    this.closedSet = new IntSet();
    this.buildings = new Seq();
    this.items = new ItemModule();
    this.itemCapacity = 0;
    this.graphId = graphId++;

    this.hasCore = false;
    this.coreCapacity = 0; // Cached cap

    // this.coreWritten = false; // For writing
};
StorageGraph.prototype.getCapacity = function() {
    return Math.min(this.itemCapacity, MAX_CAPACITY);
};
StorageGraph.prototype.getTotalCapacity = function() {
    return Math.min(this.getCapacity() + this.coreCapacity, MAX_CAPACITY);
};
StorageGraph.prototype.add = function(entity) {
    if (entity.getGraph() != this) {
        this.buildings.add(entity);

        if (entity.getGraph() == null) {
            this.items.add(entity.items);
        }
        entity.setGraph(this);
        entity.items = this.items;

        if (entity instanceof CoreBlock.CoreBuild){
            if(!this.hasCore){ // If graph already has a core, then all cores have already been accounted for
                // TODO: cleanup
                this.hasCore = true;
                this.coreCapacity += entity.block.itemCapacity;
                
                // very laggy
                Vars.state.teams.cores(entity.team).each(core => {
                    if(entity == core) return;

                    this.coreCapacity += core.block.itemCapacity;
                    this.reflow(core);
                });
            }
        } else {
            this.itemCapacity += entity.block.itemCapacity;
        }
        if(this.hasCore){
            Vars.state.teams.cores(entity.team).each(core => {
                core.storageCapacity = this.getTotalCapacity();
            });
        }
    }
};

StorageGraph.prototype.addGraph = function(graph) {
    if (graph == this) return;

    if (this.buildings.size < graph.buildings.size) {
        graph.addGraph(this);
        return;
    }

    this.items.add(graph.items);
    graph.buildings.each(b => {
        this.add(b);
    });
};
// Currently nothing using this, use when removing?
StorageGraph.prototype.reflow = function(entity) {
    this.queue.clear();
    this.queue.addLast(entity)
    this.closedSet.clear()
    while(this.queue.size > 0){
        var child = this.queue.removeFirst();
        this.add(child);
        child.getStorageConnections().each(next => {
            if(this.closedSet.add(next.pos())){
                this.queue.addLast(next);
            }
        });
    }
};
StorageGraph.prototype.remove = function(entity) {
    entity.getStorageConnections().each(other => {
        if(other.getGraph() != this) return;

        let graph = new StorageGraph();
        graph.add(other);

        this.queue.clear();
        this.queue.addLast(other);
        while(this.queue.size > 0){
            var child = this.queue.removeFirst();
            graph.add(child);
            child.getStorageConnections().each(next => {
                if(next != entity && next.getGraph() != graph){
                    graph.add(next)
                    this.queue.addLast(next);
                }
            });
        }

        // if(graph.hasCore){
        //     Vars.state.teams.cores(other.team).each(core => {
        //         core.storageCapacity = this.getTotalCapacity();
        //     });
        // }
        
        let graphCap = graph.getTotalCapacity();
        let percent = graphCap / (this.getTotalCapacity() - entity.block.itemCapacity);
        Vars.content.items().each(item => {
            if(this.items.has(item)){
                graph.items.add(item, Math.min(this.items.get(item) * percent, graphCap))
            }
        });
    });
};

// Centralized handling allows for clean core support
// TODO: consider if revealed when using fx
StorageGraph.prototype.handleItem = function(source, item) {
    this.items.add(item, 1);
};
StorageGraph.prototype.acceptItem = function(source, item) {
    return this.items.get(item) < this.getTotalCapacity();
};
StorageGraph.prototype.acceptStack = function(item, amount, source) { 
    if(this.acceptItem(this, item) && source == null){
        return Math.min(this.getTotalCapacity(item) - this.items.get(item), amount);
    }else{
        return 0;
    }
};
StorageGraph.prototype.removeStack = function(item, amount) {
    let a = Math.min(amount, this.items.get(item));

    this.items.remove(item, a);
    return a;
};
StorageGraph.prototype.handleStack = function(item, amount, source) {
    this.items.add(item, amount)
};
StorageGraph.prototype.getMaximumAccepted = function() { // TODO: consider core incineration
    return this.getTotalCapacity();
}

module.exports = StorageGraph;
