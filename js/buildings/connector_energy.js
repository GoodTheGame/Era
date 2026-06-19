import { drawParticle } from '../ParticleRenderer.js';

export const connectorEnergyBuilding = {
    type: 'connector_energy',
    size: { w: 1, h: 1 },

    initGhost(ghost) {},

    rotateGhost(ghost, game, reverse = false) {},

    render(ctx, b, tileSize, isGhost, game) {
        const cx = b.tx * tileSize + tileSize / 2;
        const cy = b.ty * tileSize + tileSize / 2;
        const radius = tileSize * 0.125;
        const animTimer = game.globalAnimTime || 0;

        // Медленная голубая аура (частота снижена)
        const auraPhase = animTimer * 0.8;

        // Внешняя оболочка
        ctx.beginPath();
        ctx.arc(cx, cy, radius, 0, Math.PI * 2);
        ctx.fillStyle = '#006699';
        ctx.fill();

        // Аура (пульсирующее кольцо)
        const auraRadius = radius * (1.3 + Math.sin(auraPhase) * 0.15);
        ctx.beginPath();
        ctx.arc(cx, cy, auraRadius, 0, Math.PI * 2);
        ctx.strokeStyle = `rgba(0, 204, 255, ${0.3 + Math.sin(auraPhase * 2) * 0.1})`;
        ctx.lineWidth = 2;
        ctx.stroke();

        // Внутренняя иконка энергии (без оранжевого)
        drawParticle(ctx, cx, cy, radius * 0.8, 'energy', animTimer);
    }
};