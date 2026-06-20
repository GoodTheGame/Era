// js/buildings/node.js
import { drawParticle } from '../ParticleRenderer.js';

export const nodeBuilding = {
    type: 'node',
    size: { w: 1, h: 1 },

    getItemPorts() {
        return [
            { type: 'any', x: 0.5, y: 0 },   // верх
            { type: 'any', x: 1, y: 0.5 },   // право
            { type: 'any', x: 0.5, y: 1 },   // низ
            { type: 'any', x: 0, y: 0.5 }    // лево
        ];
    },
    getEnergyPorts() {
        return [];
    },
    rotateGhost(ghost, game, reverse) {
        ghost.rotation = (ghost.rotation + (reverse ? -1 : 1) + 4) % 4;
    },

    render(ctx, b, tileSize, isGhost, game) {
    const x = b.tx * tileSize;
    const y = b.ty * tileSize;
    const w = tileSize;
    const h = tileSize;
    const cx = x + w / 2;
    const cy = y + h / 2;
    const radius = w * 0.375;
    const animTimer = game.globalAnimTime || 0;

    // Круг
    ctx.beginPath();
    ctx.arc(cx, cy, radius, 0, Math.PI * 2);
    ctx.fillStyle = '#336699';
    ctx.fill();
    ctx.strokeStyle = '#6699cc';
    ctx.lineWidth = 2;
    ctx.stroke();

    if (!isGhost && b.resources) {
        const keys = Object.keys(b.resources).filter(key => b.resources[key] > 0);
        const cols = Math.min(keys.length, 3);
        const rows = Math.ceil(keys.length / 3);
        const padding = 2;
        const maxIconSize = (radius * 2 - padding * (cols + 1)) / cols;
        const startX = cx - (cols * (maxIconSize + padding) - padding) / 2;
        const startY = cy - (rows * (maxIconSize + padding) - padding) / 2;

        keys.forEach((key, i) => {
            const col = i % 3;
            const row = Math.floor(i / 3);
            const ix = startX + col * (maxIconSize + padding);
            const iy = startY + row * (maxIconSize + padding);

            // Иконка ресурса
            drawParticle(ctx, ix + maxIconSize / 2, iy + maxIconSize / 2, maxIconSize * 0.35, key, animTimer);

            // Количество
            ctx.fillStyle = '#ffffff';
            ctx.font = `bold ${maxIconSize * 0.4}px "Segoe UI"`;
            ctx.textAlign = 'right';
            ctx.fillText(b.resources[key], ix + maxIconSize - 1, iy + maxIconSize - 1);
        });
    }
}
};