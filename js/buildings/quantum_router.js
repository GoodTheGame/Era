// js/buildings/quantum_router.js
const FILTER_OPTIONS = [null, 'u', 'd', 'g', 'e', 'p', 'n', 'H', 'He', 'energy'];

export const quantumRouterBuilding = {
    type: 'quantum_router',
    size: { w: 1, h: 1 },

    initGhost(ghost) {
        if (!ghost.routerMode) ghost.routerMode = 'split';
        if (ghost.filterType === undefined) ghost.filterType = null;
    },

    rotateGhost(ghost, game, reverse = false) {
        if (reverse) {
            let idx = FILTER_OPTIONS.indexOf(ghost.filterType);
            if (idx === -1) idx = 0;
            idx = (idx + 1) % FILTER_OPTIONS.length;
            ghost.filterType = FILTER_OPTIONS[idx];
        } else {
            const modes = ['split', 'priority_left', 'priority_right'];
            let idx = modes.indexOf(ghost.routerMode);
            if (idx === -1) idx = 0;
            idx = (idx + 1) % modes.length;
            ghost.routerMode = modes[idx];
        }
    },

    update(building, game, dt) {},

    getItemPorts() {
        return [
            { type: 'in', x: 0, y: 0.5 },
            { type: 'out', x: 1, y: 0.3 },
            { type: 'out', x: 1, y: 0.7 }
        ];
    },
    getEnergyPorts() {
        return [];
    },

    render(ctx, b, tileSize, isGhost, game) {
        const cx = b.tx * tileSize + tileSize / 2;
        const cy = b.ty * tileSize + tileSize / 2;
        const s = tileSize * 0.6;
        const mode = isGhost ? (b.routerMode || 'split') : (b.routerMode || 'split');
        const filter = isGhost ? b.filterType : (b.filterType || null);

        ctx.fillStyle = '#2a2a3a';
        ctx.fillRect(cx - s/2, cy - s/2, s, s);
        ctx.strokeStyle = '#5a5a7a';
        ctx.lineWidth = 2;
        ctx.strokeRect(cx - s/2, cy - s/2, s, s);

        ctx.fillStyle = '#ffffff';
        ctx.font = `bold ${s * 0.4}px "Segoe UI"`;
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        if (mode === 'split') {
            ctx.fillText('⇄', cx, cy);
        } else if (mode === 'priority_left') {
            ctx.fillText('⇐', cx, cy);
        } else if (mode === 'priority_right') {
            ctx.fillText('⇒', cx, cy);
        }

        if (filter) {
            ctx.font = `bold ${s * 0.3}px "Segoe UI"`;
            ctx.fillStyle = '#ffaa00';
            ctx.fillText(filter, cx, cy + s * 0.4);
        }
    }
};