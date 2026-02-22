"use strict";
/**
 * Basic implementation of storage sharing
 * Based on PowerGraph.java
 */

const MAX_CAPACITY = 100000;

let graphId = 0;
function StorageGraph(self) {
    this.queue = new Queue();
    this.closedSet = new IntSet();
    // this.buildings = new Seq(); // currently not used anywhere, remove?
    this.items = new ItemModule();
    this.itemCapacity = 0;
    this.graphId = graphId++;

    this.hasCore = false;
    this.coreCapacity = 0; // Cached cap
};
StorageGraph.prototype.getCapacity = () => {
    return Math.min(this.itemCapacity, MAX_CAPACITY);
};
StorageGraph.prototype.getTotalCapacity = () => {
    return Math.min(this.getCapacity() + this.coreCapacity, MAX_CAPACITY);
}
StorageGraph.prototype.add = (entity) => {
    if (entity.getGraph() != this) {
        if (entity.getGraph() == null) {
            this.items.add(entity.items)
        }

        entity.setGraph(this);
        entity.items = this.items;
        this.buildings.add(entity);
        this.itemCapacity += entity.block.itemCapacity
    }
};

StorageGraph.prototype.addGraph = (graph) => {
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
// StorageGraph.prototype.reflow = (entity) => {
//     this.queue.clear();
//     this.queue.addLast(entity)
//     this.closedSet.clear()
//     while(this.queue.size > 0){
//         var child = this.queue.removeFirst();
//         this.add(child);
//         for(let next in child.getStorageConnections()){
//             if(this.closedSet.add(next.pos())){
//                 this.queue.addLast(next);
//             }
//         }
//     }
// };
StorageGraph.prototype.remove = (entity) => {
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

        let graphCap = graph.getCapacity();
        let percent = graphCap / (this.getCapacity() - entity.block.itemCapacity);
        Vars.content.items().each(item => {
            if(this.items.has(item)){
                graph.items.add(item, Math.min(this.items.get(item) * percent, graphCap))
            }
        });
    });
};

// Centralized handling allows for clean core support
// TODO: consider if revealed when using fx
StorageGraph.prototype.handleItem = (source, item) => {
    this.items.add(item, 1);
};
StorageGraph.prototype.acceptItem = (source, item) => {
    return this.items.get(item) < this.getCapacity();
};
StorageGraph.prototype.acceptStack = (item, amount, source) => { 
    if(this.acceptItem(this, item) && source == null){
        return Math.min(this.getCapacity(item) - this.items.get(item), amount);
    }else{
        return 0;
    }
};
StorageGraph.prototype.removeStack = (item, amount) => {
    let amount = Math.min(amount, this.items.get(item));

    this.items.remove(item, amount);
    return amount;
};
StorageGraph.prototype.handleStack = (item, amount, source) => {
    this.items.add(item, amount)
};

module.exports = StorageGraph;
