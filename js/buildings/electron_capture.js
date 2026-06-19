// electron_capture.js
import { drawParticle } from '../ParticleRenderer.js';

export const electronCaptureBuilding = {
    type: 'electron_capture',
    size: { w: 2, h: 1 },
    recipe: { inputs: { p: 1, e: 1 }, output: 'H', time: 1.0 },

    rotateGhost(ghost) {
        ghost.recipe = 'hydrogen';
    },

    update(building, game, dt) {
        const recipe = this.recipe;
        if (!building.recipe) building.recipe = 'hydrogen';
        if (!building.inputResources) building.inputResources = {};
        if (!building.outputResources) building.outputResources = {};
        if (!building.craftTimer) building.craftTimer = 0;
        if (!building.animTimer) building.animTimer = 0;
        building.animTimer += dt;

        let canCraft = true;
        for (const [res, amount] of Object.entries(recipe.inputs)) {
            if ((building.inputResources[res] || 0) < amount) {
                canCraft = false;
                break;
            }
        }
        if (!canCraft) {
            building.craftTimer = 0;
            return;
        }

        building.craftTimer += dt;
        if (building.craftTimer >= recipe.time) {
            building.craftTimer = 0;
            for (const [res, amount] of Object.entries(recipe.inputs)) {
                building.inputResources[res] -= amount;
            }
            building.outputResources['H'] = (building.outputResources['H'] || 0) + 1;
        }
    },

    render(ctx, b, tileSize, isGhost, game) {
        const x = b.tx * tileSize, y = b.ty * tileSize;
        const size = b.getSize();
        const w = size.w * tileSize, h = size.h * tileSize;
        const cx = x + w/2, cy = y + h/2;
        const maxR = Math.min(w, h) * 0.35;
        const animTimer = isGhost ? 0 : (b.animTimer || 0);
        const progress = b.craftTimer ? Math.min(b.craftTimer / this.recipe.time, 1.0) : 0;

        ctx.fillStyle = '#0a0a1a';
        ctx.fillRect(x, y, w, h);
        ctx.strokeStyle = '#22aaff';
        ctx.lineWidth = 2;
        ctx.strokeRect(x+1, y+1, w-2, h-2);

        if (!isGhost) {
            // Если крафт не идёт и нет продукта — показываем протон и орбиту электрона
            if (!progress && (b.outputResources['H'] || 0) === 0) {
                drawParticle(ctx, cx, cy, maxR * 0.6, 'p', animTimer);
                const eAngle = animTimer * 3;
                const orbitR = maxR * 1.2;
                const ex = cx + Math.cos(eAngle) * orbitR;
                const ey = cy + Math.sin(eAngle) * orbitR;
                drawParticle(ctx, ex, ey, maxR * 0.4, 'e', animTimer);
            }

            // Если крафт завершён, показываем водород
            if ((b.outputResources['H'] || 0) > 0) {
                drawParticle(ctx, cx, cy, maxR * 0.8, 'H', animTimer);
            }

            // Полоска прогресса
            if (progress > 0) {
                const alpha = progress;
                ctx.globalAlpha = alpha;
                ctx.beginPath();
                ctx.arc(cx, cy, maxR * 0.3, 0, Math.PI*2);
                ctx.fillStyle = '#ffffff';
                ctx.fill();
                ctx.globalAlpha = 1;

                ctx.fillStyle = '#22aaff';
                ctx.fillRect(x + 2, y + h - 6, (w - 4) * progress, 4);
            }
        } else {
            drawParticle(ctx, cx, cy, maxR * 0.8, 'H', 0);
        }

        // Входные ресурсы
        if (!isGhost && b.inputResources) {
            const inputs = this.recipe.inputs;
            const keys = Object.keys(inputs);
            const iconSize = tileSize * 0.15;
            const startX = x + 2;
            const startY = y + h - 12;
            keys.forEach((key, i) => {
                const rx = startX + i * 20;
                ctx.fillStyle = { p: '#ffaa00', e: '#ffff00' }[key] || '#fff';
                ctx.fillRect(rx, startY, iconSize, iconSize);
                ctx.fillStyle = '#000';
                ctx.font = `${iconSize * 0.7}px "Segoe UI"`;
                ctx.fillText((b.inputResources[key] || 0).toString(), rx + 2, startY + iconSize - 2);
            });
        }
    }
};