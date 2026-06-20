// js/buildings/fusion_press.js
import { drawParticle } from '../ParticleRenderer.js';

export const fusionPressBuilding = {
    type: 'fusion_press',
    size: { w: 2, h: 2 },
    recipe: { inputs: { H: 2 }, output: 'He', time: 2.0 },

    rotateGhost(ghost, game, reverse) {
        ghost.rotation = (ghost.rotation + (reverse ? -1 : 1) + 4) % 4;
    },
    update(building, game, dt) {
        if (!building.recipe) building.recipe = 'fusion';
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
            for (const [r, amt] of Object.entries(recipe.inputs)) building.inputResources[r] -= amt;
            building.outputResources['He'] = (building.outputResources['He'] || 0) + 1;
            building.outputResources['energy'] = (building.outputResources['energy'] || 0) + 5;
        }
    },

    getItemPorts() {
        return [
            { type: 'in', x: 0, y: 0.5, accepts: ['H'] },
            { type: 'out', x: 1, y: 0.5, produces: 'He' }
        ];
    },
    getEnergyPorts() {
        return [
            { type: 'out', x: 0.5, y: 0.5 }  // энерговыход
        ];
    },

    render(ctx, b, tileSize, isGhost, game) {
        const x = b.tx * tileSize, y = b.ty * tileSize;
        const size = b.getSize();
        const w = size.w * tileSize, h = size.h * tileSize;
        const cx = x + w / 2, cy = y + h / 2;
        const maxR = Math.min(w, h) * 0.3;
        const animTimer = game.globalAnimTime || 0;
        const zoom = game.camera.zoom;

        if (zoom < 0.5 && !isGhost) {
            ctx.fillStyle = '#ff8800';
            ctx.fillRect(x + w * 0.25, y + h * 0.25, w * 0.5, h * 0.5);
            return;
        }

        const progress = b.craftTimer ? Math.min(b.craftTimer / 2.0, 1.0) : 0;
        const hasOutput = (b.outputResources?.['He'] || 0) > 0;

        ctx.fillStyle = '#0a0a1a';
        ctx.fillRect(x, y, w, h);
        ctx.strokeStyle = '#ff8800';
        ctx.lineWidth = 2;
        ctx.strokeRect(x + 1, y + 1, w - 2, h - 2);

        if (isGhost) {
            const dist = maxR;
            const angle = animTimer * 2;
            drawParticle(ctx, cx + Math.cos(angle) * dist, cy + Math.sin(angle) * dist, maxR * 0.6, 'H', animTimer);
            drawParticle(ctx, cx + Math.cos(angle + Math.PI) * dist, cy + Math.sin(angle + Math.PI) * dist, maxR * 0.6, 'H', animTimer);
            return;
        }

        if (hasOutput && progress === 0) {
            drawParticle(ctx, cx, cy, maxR * 0.8, 'He', animTimer);
        } else {
            const dist = maxR * (1 - progress);
            const angle = animTimer * 2;
            drawParticle(ctx, cx + Math.cos(angle) * dist, cy + Math.sin(angle) * dist, maxR * 0.6, 'H', animTimer);
            drawParticle(ctx, cx + Math.cos(angle + Math.PI) * dist, cy + Math.sin(angle + Math.PI) * dist, maxR * 0.6, 'H', animTimer);

            if (progress > 0.8) {
                const flashAlpha = (progress - 0.8) * 5;
                ctx.beginPath();
                ctx.arc(cx, cy, maxR * 0.2, 0, Math.PI * 2);
                ctx.fillStyle = `rgba(255, 255, 255, ${flashAlpha})`;
                ctx.fill();
                ctx.shadowColor = '#fff';
                ctx.shadowBlur = 15 * flashAlpha;
                ctx.fill();
                ctx.shadowBlur = 0;
            }

            if (progress > 0) {
                ctx.fillStyle = '#ff8800';
                ctx.fillRect(x + 2, y + h - 6, (w - 4) * progress, 4);
            }
        }

        const eCount = b.outputResources?.['energy'] || 0;
        if (eCount > 0) {
            ctx.fillStyle = '#ff8800';
            ctx.font = `bold ${tileSize * 0.2}px "Segoe UI"`;
            ctx.textAlign = 'right';
            ctx.fillText(`⚡${eCount}`, x + w - 4, y + h - 10);
        }

    }
};