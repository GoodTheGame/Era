// js/buildings/quantum_resonator.js
import { drawParticle } from '../ParticleRenderer.js';

const QUARK_COLORS = {
    u: '#e74c3c', d: '#3498db', c: '#2ecc71', s: '#f1c40f', t: '#9b59b6', b: '#e67e22'
};

export const quantumResonatorBuilding = {
    type: 'quantum_resonator',
    size: { w: 3, h: 3 },

    rotateGhost(ghost, game, reverse) {
    ghost.rotation = (ghost.rotation + (reverse ? -1 : 1) + 4) % 4;
},
    changeMode(ghost, game, reverse) {
    if (ghost.quarkType === undefined) ghost.quarkType = 0;
    ghost.quarkType = reverse
        ? (ghost.quarkType - 1 + 6) % 6
        : (ghost.quarkType + 1) % 6;
    // Сбрасываем накопленные ресурсы, чтобы старые кварки не ушли в сеть
    ghost.resources = {};
    if (game && game.network) {
        game.network.refreshOutgoingResourceTypes(ghost);
    }
},
    update(building, game, dt) {
        if (building.quarkType === undefined) building.quarkType = 0;
        if (!building.resources) building.resources = {};
        if (!building.timer) building.timer = 0;

        const quarkNames = ['u', 'd', 'c', 's', 't', 'b'];
        const quark = quarkNames[building.quarkType];
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
            { type: 'out', x: 0.5, y: 0 }   // верхняя граница по центру
        ];
    },
    getEnergyPorts() {
        return [
            { type: 'any', x: 0.5, y: 0.5 }  // центр
        ];
    },

    render(ctx, b, tileSize, isGhost, game) {
        const x = b.tx * tileSize, y = b.ty * tileSize;
        const w = 3 * tileSize, h = 3 * tileSize;
        const cx = x + w/2, cy = y + h/2;
        const maxR = Math.min(w, h) * 0.35;
        const quarkNames = ['u', 'd', 'c', 's', 't', 'b'];
        const quark = isGhost ? quarkNames[b.quarkType || 0] : quarkNames[b.quarkType || 0];
        const color = QUARK_COLORS[quark] || '#fff';
        const animTimer = game.globalAnimTime || 0;
        const zoom = game.camera.zoom;

        if (zoom < 0.5 && !isGhost) {
            ctx.fillStyle = color;
            ctx.fillRect(x + w*0.25, y + h*0.25, w*0.5, h*0.5);
            const count = b.resources?.[quark] || 0;
            if (count > 0) {
                ctx.fillStyle = '#fff';
                ctx.font = `${tileSize*0.3}px "Segoe UI"`;
                ctx.textAlign = 'center';
                ctx.fillText(count, cx, y + h - 10);
            }
            return;
        }

        ctx.strokeStyle = color;
        ctx.lineWidth = 1;
        for (let i = 1; i <= 3; i++) {
            const r = maxR * (0.2 + i * 0.25);
            const deformation = Math.sin(animTimer * 2 + i) * 5;
            ctx.beginPath();
            ctx.arc(cx, cy, r + deformation, 0, Math.PI * 2);
            ctx.stroke();
        }

        for (let j = 0; j < 8; j++) {
            const angle = animTimer * 0.5 + (j * Math.PI * 2) / 8;
            const dist = maxR * (0.9 + 0.3 * Math.sin(animTimer * 4 + j));
            const px = cx + Math.cos(angle) * dist;
            const py = cy + Math.sin(angle) * dist;
            ctx.beginPath();
            ctx.arc(px, py, 2.5, 0, Math.PI*2);
            ctx.fillStyle = color;
            ctx.fill();
        }

        drawParticle(ctx, cx, cy, maxR * 0.4, quark, animTimer);

        if (!isGhost) {
            const count = b.resources[quark] || 0;
            ctx.fillStyle = '#fff';
            ctx.font = `${tileSize*0.12}px "Segoe UI"`;
            ctx.textAlign = 'center';
            ctx.fillText(count, cx, y + h - 4);
        }
    }
};