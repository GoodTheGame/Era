const QUARK_COLORS = {
    u: '#e74c3c', d: '#3498db', c: '#2ecc71', s: '#f1c40f', t: '#9b59b6', b: '#e67e22',
    g: '#ff44cc', e: '#ffff00', p: '#ffaa00', n: '#aa00ff', H: '#22aaff'
};

const FILTER_OPTIONS = [null, 'u', 'd', 'g', 'e', 'p', 'n', 'H'];

export const connectorBuilding = {
    type: 'connector',
    size: { w: 1, h: 1 },

    rotateGhost(ghost) {
        if (!ghost.filterType) ghost.filterType = null;
        const idx = FILTER_OPTIONS.indexOf(ghost.filterType);
        const nextIdx = (idx + 1) % FILTER_OPTIONS.length;
        ghost.filterType = FILTER_OPTIONS[nextIdx];
    },

    render(ctx, b, tileSize, isGhost, game) {
        const cx = b.tx * tileSize + tileSize/2;
        const cy = b.ty * tileSize + tileSize/2;
        const radius = tileSize * 0.125;

        ctx.beginPath();
        ctx.arc(cx, cy, radius, 0, Math.PI*2);
        ctx.fillStyle = '#663399';
        ctx.fill();
        ctx.strokeStyle = '#9966cc';
        ctx.lineWidth = 2;
        ctx.stroke();

        const filter = isGhost ? b.filterType : b.filterType;
        if (filter) {
            ctx.fillStyle = QUARK_COLORS[filter] || '#fff';
            ctx.font = `bold ${tileSize*0.2}px "Segoe UI"`;
            ctx.textAlign = 'center';
            ctx.textBaseline = 'middle';
            ctx.fillText(filter, cx, cy);
        }

        if (!isGhost && b.resources) {
            const keys = Object.keys(b.resources);
            const iconSize = tileSize * 0.15;
            const startX = b.tx * tileSize + 2;
            const startY = b.ty * tileSize + tileSize * 0.7;
            keys.forEach((key, i) => {
                const col = QUARK_COLORS[key] || '#fff';
                const rx = startX + i * iconSize * 1.5;
                ctx.fillStyle = col;
                ctx.fillRect(rx, startY, iconSize, iconSize);
                ctx.fillStyle = '#000';
                ctx.font = `${iconSize*0.7}px "Segoe UI"`;
                ctx.fillText(b.resources[key], rx+iconSize+1, startY+iconSize);
            });
        }
    }
};