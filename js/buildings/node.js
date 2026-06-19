import { drawParticle } from '../ParticleRenderer.js';

export const nodeBuilding = {
    type: 'node',
    size: { w: 2, h: 2 },

    render(ctx, b, tileSize, isGhost, game) {
        const x = b.tx * tileSize, y = b.ty * tileSize;
        const w = 2 * tileSize, h = 2 * tileSize;
        const cx = x + w / 2, cy = y + h / 2;
        const radius = w * 0.375;

        ctx.beginPath();
        ctx.arc(cx, cy, radius, 0, Math.PI * 2);
        ctx.fillStyle = '#336699';
        ctx.fill();
        ctx.strokeStyle = '#6699cc';
        ctx.lineWidth = 3;
        ctx.stroke();

        if (!isGhost && b.resources) {
            const keys = Object.keys(b.resources);
            const iconSize = tileSize * 0.2;
            const startX = x + w * 0.15;
            const startY = y + h * 0.2;
            keys.forEach((key, i) => {
                const rx = startX + (i % 3) * w * 0.3 + iconSize / 2;
                const ry = startY + Math.floor(i / 3) * h * 0.35 + iconSize / 2;
                drawParticle(ctx, rx, ry, iconSize / 2, key, 0);
                ctx.fillStyle = '#fff';
                ctx.font = `${iconSize * 0.4}px "Segoe UI"`;
                ctx.textAlign = 'center';
                ctx.fillText(b.resources[key], rx, ry + iconSize / 2 + 2);
            });
        }
    }
};