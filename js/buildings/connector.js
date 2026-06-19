import { drawParticle } from '../ParticleRenderer.js';

const FILTER_OPTIONS = ['energy', 'u', 'd', 'g', 'e', 'p', 'n', 'H'];

export const connectorBuilding = {
    type: 'connector',
    size: { w: 1, h: 1 },

    rotateGhost(ghost, game) {
        if (!ghost.filterType) ghost.filterType = 'energy';
        const idx = FILTER_OPTIONS.indexOf(ghost.filterType);
        const nextIdx = (idx + 1) % FILTER_OPTIONS.length;
        ghost.filterType = FILTER_OPTIONS[nextIdx];
        if (game && game.network) {
            game.network.updateDownstreamFilters(ghost);
        }
    },

    render(ctx, b, tileSize, isGhost, game) {
        const cx = b.tx * tileSize + tileSize / 2;
        const cy = b.ty * tileSize + tileSize / 2;
        const radius = tileSize * 0.125;
        const animTimer = game.globalAnimTime || 0;

        ctx.beginPath();
        ctx.arc(cx, cy, radius, 0, Math.PI * 2);
        ctx.fillStyle = '#663399';
        ctx.fill();
        ctx.strokeStyle = '#9966cc';
        ctx.lineWidth = 2;
        ctx.stroke();

        const filter = isGhost ? b.filterType : (b.filterType || 'energy');
        drawParticle(ctx, cx, cy, radius * 1.2, filter, animTimer);

        ctx.fillStyle = '#fff';
        ctx.font = `bold ${radius * 1.5}px "Segoe UI"`;
        ctx.textAlign = 'center';
        ctx.fillText(filter === 'energy' ? '⚡' : filter, cx, cy + radius * 2.5);
    }
};