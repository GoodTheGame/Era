// js/EnergyGrid.js
export class EnergyGrid {
    constructor(game) {
        this.game = game;
        this.cache = [];
        this.dirty = true;
        this.tickTimer = 0;
        this.tickInterval = 0.5;
    }

    markDirty() { this.dirty = true; }

    _rebuildCache() {
        this.cache = [];
        for (const b of this.game.buildingManager.buildings) {
            if (b.type === 'energy_buffer' || b.type === 'connector_energy' ||
                b.type === 'star' || b.type === 'fusion_press') {
                this.cache.push(b);
            }
        }
        this.dirty = false;
    }

    update(dt) {
        this.tickTimer += dt;
        if (this.tickTimer < this.tickInterval) return;
        this.tickTimer -= this.tickInterval;

        if (this.dirty) this._rebuildCache();
        if (this.cache.length === 0) return;

        // Собираем энергию со всех узлов, кроме пресса (он только производит)
        let totalEnergy = 0;
        const consumers = [];
        for (const b of this.cache) {
            if (b.type === 'fusion_press') continue; // пресс не участвует в общем пуле
            const e = b.resources?.['energy'] || 0;
            totalEnergy += e;
            consumers.push(b);
        }

        if (consumers.length === 0) return;

        // Равномерно распределяем энергию
        const perNode = Math.floor(totalEnergy / consumers.length);
        let remainder = totalEnergy % consumers.length;
        for (const b of consumers) {
            const cap = b.type === 'star' ? 50 : (b.type === 'energy_buffer' ? 1000 : 100);
            let give = perNode + (remainder > 0 ? 1 : 0);
            if (remainder > 0) remainder--;
            if (give > cap) give = cap;
            if (!b.resources) b.resources = {};
            b.resources['energy'] = give;
        }
    }
}