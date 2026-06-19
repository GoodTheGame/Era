// fusion_press.js
import { drawParticle } from '../ParticleRenderer.js';

export const fusionPressBuilding = {
    type: 'fusion_press',
    size: { w: 2, h: 2 },
    recipe: { inputs: { H: 2 }, output: 'He', time: 2.0 },

    rotateGhost(ghost) {
        ghost.recipe = 'fusion';
    },

    update(building, game, dt) {
        const recipe = this.recipe;
        if (!building.recipe) building.recipe = 'fusion';
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
            building.outputResources['He'] = (building.outputResources['He'] || 0) + 1;
            building.outputResources['energy'] = (building.outputResources['energy'] || 0) + 5;
        }
    },

    render(ctx, b, tileSize, isGhost, game) {
        const x = b.tx * tileSize, y = b.ty * tileSize;
        const size = b.getSize();
        const w = size.w * tileSize, h = size.h * tileSize;
        const cx = x + w/2, cy = y + h/2;
        const maxR = Math.min(w, h) * 0.3;
        const animTimer = isGhost ? 0 : (b.animTimer || 0);

        ctx.fillStyle = '#0a0a1a';
        ctx.fillRect(x, y, w, h);
        ctx.strokeStyle = '#ff8800';
        ctx.lineWidth = 2;
        ctx.strokeRect(x+1, y+1, w-2, h-2);

        if (!isGhost) {
            const progress = b.craftTimer ? Math.min(b.craftTimer / this.recipe.time, 1.0) : 0;

            // Если крафт идёт или нет продукта — показываем два атома водорода
            if (progress > 0 || (b.outputResources['He'] || 0) === 0) {
                const dist = maxR * (1 - progress);
                const angle = animTimer * 2;
                const x1 = cx + Math.cos(angle) * dist;
                const y1 = cy + Math.sin(angle) * dist;
                const x2 = cx + Math.cos(angle + Math.PI) * dist;
                const y2 = cy + Math.sin(angle + Math.PI) * dist;
                drawParticle(ctx, x1, y1, maxR * 0.6, 'H', animTimer);
                drawParticle(ctx, x2, y2, maxR * 0.6, 'H', animTimer);
            }

            // Вспышка
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

            // Если крафт завершён, показываем гелий
            if (progress === 0 && (b.outputResources['He'] || 0) > 0) {
                drawParticle(ctx, cx, cy, maxR * 0.8, 'He', animTimer);
            }

            // Прогресс-бар
            if (progress > 0) {
                ctx.fillStyle = '#ff8800';
                ctx.fillRect(x + 2, y + h - 6, (w - 4) * progress, 4);
            }

            // Энергия
            const energyCount = b.outputResources['energy'] || 0;
            if (energyCount > 0) {
                ctx.fillStyle = '#ff8800';
                ctx.font = `bold ${tileSize * 0.2}px "Segoe UI"`;
                ctx.textAlign = 'right';
                ctx.fillText(`⚡${energyCount}`, x + w - 4, y + h - 10);
            }
        } else {
            drawParticle(ctx, cx, cy, maxR * 0.8, 'He', 0);
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
                ctx.fillStyle = { H: '#22aaff' }[key] || '#fff';
                ctx.fillRect(rx, startY, iconSize, iconSize);
                ctx.fillStyle = '#000';
                ctx.font = `${iconSize * 0.7}px "Segoe UI"`;
                ctx.fillText((b.inputResources[key] || 0).toString(), rx + 2, startY + iconSize - 2);
            });
        }
    }
};