// js/buildings/electron_capture.js
import { drawParticle } from '../ParticleRenderer.js';

export const electronCaptureBuilding = {
    type: 'electron_capture',
    size: { w: 2, h: 1 },
    recipe: { inputs: { p: 1, e: 1 }, output: 'H', time: 1.0 },

    rotateGhost(ghost, game, reverse) {
        ghost.rotation = (ghost.rotation + (reverse ? -1 : 1) + 4) % 4;
    },
    update(building, game, dt) {
        if (!building.recipe) building.recipe = 'hydrogen';
        if (!building.inputResources) building.inputResources = {};
        if (!building.outputResources) building.outputResources = {};
        if (!building.craftTimer) building.craftTimer = 0;

        const recipe = this.recipe;
        let can = true;
        for (const [r, amt] of Object.entries(recipe.inputs)) {
            if ((building.inputResources[r] || 0) < amt) { can = false; break; }
        }
        if (!can) { building.craftTimer = 0; return; }

        building.craftTimer += dt;
        if (building.craftTimer >= recipe.time) {
            building.craftTimer = 0;
            for (const [r, amt] of Object.entries(recipe.inputs)) {
                building.inputResources[r] -= amt;
            }
            building.outputResources['H'] = (building.outputResources['H'] || 0) + 1;
        }
    },

    getItemPorts() {
        return [
            { type: 'in', x: 0, y: 0.3, accepts: ['p'] },
            { type: 'in', x: 0, y: 0.7, accepts: ['e'] },
            { type: 'out', x: 1, y: 0.5, produces: 'H' }
        ];
    },
    getEnergyPorts() {
        return [];
    },

    render(ctx, b, tileSize, isGhost, game) {
        const x = b.tx * tileSize, y = b.ty * tileSize;
        const size = b.getSize();
        const w = size.w * tileSize, h = size.h * tileSize;
        const cx = x + w / 2, cy = y + h / 2;
        const maxR = Math.min(w, h) * 0.35;
        const animTimer = game.globalAnimTime || 0;
        const zoom = game.camera.zoom;

        if (zoom < 0.5 && !isGhost) {
            ctx.fillStyle = '#22aaff';
            ctx.fillRect(x + w * 0.25, y + h * 0.25, w * 0.5, h * 0.5);
            return;
        }

        const progress = b.craftTimer ? Math.min(b.craftTimer / this.recipe.time, 1.0) : 0;
        const hasOutput = (b.outputResources?.['H'] || 0) > 0;

        ctx.fillStyle = '#0a0a1a';
        ctx.fillRect(x, y, w, h);
        ctx.strokeStyle = '#22aaff';
        ctx.lineWidth = 2;
        ctx.strokeRect(x + 1, y + 1, w - 2, h - 2);

        if (isGhost) {
            drawParticle(ctx, cx, cy, maxR * 0.6, 'p', animTimer);
            const eAngle = animTimer * 3;
            const orbitR = maxR * 1.2;
            drawParticle(ctx, cx + Math.cos(eAngle) * orbitR, cy + Math.sin(eAngle) * orbitR, maxR * 0.4, 'e', animTimer);
            return;
        }

        if (hasOutput && progress === 0) {
            drawParticle(ctx, cx, cy, maxR * 0.8, 'H', animTimer);
        } else {
            drawParticle(ctx, cx, cy, maxR * 0.6, 'p', animTimer);
            if (progress < 0.8) {
                const eAngle = animTimer * 3;
                const orbitR = maxR * 1.2;
                drawParticle(ctx, cx + Math.cos(eAngle) * orbitR, cy + Math.sin(eAngle) * orbitR, maxR * 0.4, 'e', animTimer);
            }
            if (progress > 0) {
                const alpha = progress;
                ctx.globalAlpha = alpha;
                ctx.beginPath();
                ctx.arc(cx, cy, maxR * 0.3, 0, Math.PI * 2);
                ctx.fillStyle = '#ffffff';
                ctx.fill();
                ctx.globalAlpha = 1;
                ctx.fillStyle = '#22aaff';
                ctx.fillRect(x + 2, y + h - 6, (w - 4) * progress, 4);
            }
        }

    }
};