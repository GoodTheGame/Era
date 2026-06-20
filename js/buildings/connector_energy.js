// js/buildings/connector_energy.js
import { drawParticle } from '../ParticleRenderer.js';

export const connectorEnergyBuilding = {
    type: 'connector_energy',
    size: { w: 1, h: 1 },

    initGhost(ghost) {},
    rotateGhost(ghost, game, reverse = false) {},

    // Только два энергетических порта (any)
    getItemPorts() {
        return [];
    },
    getEnergyPorts() {
        return [
            { type: 'any', x: 0.5, y: 0 },
            { type: 'any', x: 0.5, y: 1 }
        ];
    },

    render(ctx, b, tileSize, isGhost, game) {
        const cx = b.tx * tileSize + tileSize / 2;
        const cy = b.ty * tileSize + tileSize / 2;
        const radius = tileSize * 0.125;
        const animTimer = game.globalAnimTime || 0;

        ctx.beginPath();
        ctx.arc(cx, cy, radius, 0, Math.PI * 2);
        ctx.fillStyle = '#006699';
        ctx.fill();

        const auraRadius = radius * (1.3 + Math.sin(animTimer * 0.8) * 0.15);
        ctx.beginPath();
        ctx.arc(cx, cy, auraRadius, 0, Math.PI * 2);
        ctx.strokeStyle = `rgba(0, 204, 255, ${0.3 + Math.sin(animTimer * 2) * 0.1})`;
        ctx.lineWidth = 2;
        ctx.stroke();

        drawParticle(ctx, cx, cy, radius * 0.8, 'energy', animTimer);
    }
};