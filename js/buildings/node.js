const QUARK_COLORS = {
    u: '#e74c3c', d: '#3498db', c: '#2ecc71', s: '#f1c40f', t: '#9b59b6', b: '#e67e22',
    g: '#ff44cc', e: '#ffff00', p: '#ffaa00', n: '#aa00ff', H: '#22aaff'
};

const FILTER_OPTIONS = [null, 'u', 'd', 'g', 'e', 'p', 'n', 'H']; // null = все

export const nodeBuilding = {
    type: 'node',
    size: { w: 2, h: 2 },

    rotateGhost(ghost) {
        if (!ghost.filterType) ghost.filterType = null;
        const idx = FILTER_OPTIONS.indexOf(ghost.filterType);
        const nextIdx = (idx + 1) % FILTER_OPTIONS.length;
        ghost.filterType = FILTER_OPTIONS[nextIdx];
    },

    render(ctx, b, tileSize, isGhost, game) {
        const x = b.tx * tileSize, y = b.ty * tileSize;
        const w = 2 * tileSize, h = 2 * tileSize;
        const cx = x + w/2, cy = y + h/2, radius = w * 0.375;

        ctx.beginPath();
        ctx.arc(cx, cy, radius, 0, Math.PI*2);
        ctx.fillStyle = '#336699';
        ctx.fill();
        ctx.strokeStyle = '#6699cc';
        ctx.lineWidth = 3;
        ctx.stroke();

        // Отображение фильтра
        const filter = isGhost ? b.filterType : b.filterType;
        if (filter) {
            ctx.fillStyle = QUARK_COLORS[filter] || '#fff';
            ctx.font = `bold ${tileSize*0.4}px "Segoe UI"`;
            ctx.textAlign = 'center';
            ctx.textBaseline = 'middle';
            ctx.fillText(filter, cx, cy);
        }

        // Ресурсы (только если не призрак)
        if (!isGhost && b.resources) {
            const keys = Object.keys(b.resources);
            const iconSize = tileSize * 0.2;
            const startX = x + w * 0.15, startY = y + h * 0.2;
            keys.forEach((key, i) => {
                const col = QUARK_COLORS[key] || '#fff';
                const rx = startX + (i % 3) * w * 0.3;
                const ry = startY + Math.floor(i / 3) * h * 0.35;
                ctx.fillStyle = col;
                ctx.fillRect(rx, ry, iconSize, iconSize);
                ctx.fillStyle = '#000';
                ctx.font = `${iconSize*0.7}px "Segoe UI"`;
                ctx.fillText(key.toUpperCase(), rx+2, ry+iconSize-2);
                ctx.fillText(b.resources[key], rx+iconSize+2, ry+iconSize-2);
            });
        }
    }
};