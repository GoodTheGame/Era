// js/buildings/quantum_router.js
const FILTER_OPTIONS = [null, 'u', 'd', 'g', 'e', 'p', 'n', 'H', 'He', 'energy'];

export const quantumRouterBuilding = {
    type: 'quantum_router',
    size: { w: 1, h: 1 },

    initGhost(ghost) {
        if (!ghost.routerMode) ghost.routerMode = 'split';
        if (ghost.filterType === undefined) ghost.filterType = null;
    },

    rotateGhost(ghost, game, reverse) {
        ghost.rotation = (ghost.rotation + (reverse ? -1 : 1) + 4) % 4;
    },
    changeMode(ghost, game, reverse) {
        // смена фильтра (Shift+R теперь не используется, фильтр меняется по F/Shift+F)
        const FILTER_OPTIONS = [null, 'u','d','g','e','p','n','H','He','energy'];
        let idx = FILTER_OPTIONS.indexOf(ghost.filterType);
        if (idx === -1) idx = 0;
        idx = reverse ? (idx - 1 + FILTER_OPTIONS.length) % FILTER_OPTIONS.length : (idx + 1) % FILTER_OPTIONS.length;
        ghost.filterType = FILTER_OPTIONS[idx];
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