// js/buildings/gluon_extractor.js
import { drawParticle } from '../ParticleRenderer.js';

export const gluonExtractorBuilding = {
    type: 'gluon_extractor',
    size: { w: 1, h: 1 },
    rotateGhost(ghost, game, reverse) {
    ghost.rotation = (ghost.rotation + (reverse ? -1 : 1) + 4) % 4;
},
       update(building, game, dt) {
        if (!building.resources) building.resources = {};
        if (!building.timer) building.timer = 0;
        const quark = 'g';
        building.timer += dt;
        const interval = 0.2;
        while (building.timer >= interval) {
            building.timer -= interval;
            const cur = building.resources[quark] || 0;
            if (cur < 500) building.resources[quark] = cur + 1;
        }
    },
    getItemPorts() {
        return [
            { type: 'out', x: 1, y: 0.5 }
        ];
    },
    getEnergyPorts() {
        return [];
    },
    render(ctx, b, tileSize, isGhost, game) {
        const x = b.tx * tileSize, y = b.ty * tileSize, s = tileSize;
        const cx = x + s/2, cy = y + s/2;
        const animTimer = game.globalAnimTime || 0;
        const zoom = game.camera.zoom;
        if (zoom < 0.5 && !isGhost) {
            ctx.fillStyle = '#ff44cc';
            ctx.fillRect(x + s*0.25, y + s*0.25, s*0.5, s*0.5);
            const count = b.resources?.['g'] || 0;
            if (count > 0) {
                ctx.fillStyle = '#fff';
                ctx.font = `${s*0.3}px "Segoe UI"`;
                ctx.textAlign = 'center';
                ctx.fillText(count, cx, y + s - 2);
            }
            return;
        }
        const phase = animTimer * 6;
        const membraneY = cy;
        const membraneRadius = s * 0.28;
        const pulse = 1 + 0.15 * Math.sin(phase);
        const currentRadius = membraneRadius * pulse;
        ctx.beginPath();
        ctx.arc(cx, membraneY, currentRadius, 0, Math.PI * 2);
        ctx.fillStyle = '#ff44cc40';
        ctx.fill();
        ctx.strokeStyle = '#ff44cc';
        ctx.lineWidth = 2;
        ctx.stroke();
        drawParticle(ctx, cx, membraneY, currentRadius * 0.7, 'g', animTimer);
        if (Math.sin(phase) > 0.9) {
            for (let i = 1; i <= 2; i++) {
                const waveRadius = currentRadius * (1 + i * 0.3);
                const alpha = 0.3 - i * 0.1;
                ctx.beginPath();
                ctx.arc(cx, membraneY, waveRadius, 0, Math.PI * 2);
                ctx.strokeStyle = `rgba(255, 68, 204, ${alpha})`;
                ctx.lineWidth = 1;
                ctx.stroke();
            }
            ctx.beginPath();
            ctx.arc(cx, membraneY, currentRadius * 1.2, 0, Math.PI * 2);
            ctx.fillStyle = 'rgba(255, 255, 255, 0.3)';
            ctx.fill();
        }
        if (!isGhost) {
            const count = b.resources['g'] || 0;
            ctx.fillStyle = '#fff';
            ctx.font = `${s * 0.2}px "Segoe UI"`;
            ctx.textAlign = 'center';
            ctx.fillText(count, cx, y + s - 2);
        }
    }
};