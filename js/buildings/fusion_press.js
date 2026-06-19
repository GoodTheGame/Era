import { drawParticle } from '../ParticleRenderer.js';
export const FUSION_PRESS_ACCEPTED = ['H'];
const COLORS = {
    H: '#22aaff',
    He: '#ffdd44',
    energy: '#ff8800'
};

export const fusionPressBuilding = {
    type: 'fusion_press',
    size: { w: 2, h: 2 },

    rotateGhost(ghost) {},

    update(building, game, dt) {
        if (!building.inputResources) building.inputResources = {};
        if (!building.outputResources) building.outputResources = {};
        if (!building.craftTimer) building.craftTimer = 0;
        if (!building.animTimer) building.animTimer = 0;
        building.animTimer += dt;

        const needH = 2;
        const hasH = building.inputResources['H'] || 0;

        if (hasH >= needH) {
            building.craftTimer += dt;
            if (building.craftTimer >= 2.0) {
                building.craftTimer -= 2.0;
                building.inputResources['H'] -= needH;
                building.outputResources['He'] = (building.outputResources['He'] || 0) + 1;
                building.outputResources['energy'] = (building.outputResources['energy'] || 0) + 5;
            }
        } else {
            building.craftTimer = 0;
        }
    },

    render(ctx, b, tileSize, isGhost, game) {
        const x = b.tx * tileSize;
        const y = b.ty * tileSize;
        const size = b.getSize();
        const w = size.w * tileSize;
        const h = size.h * tileSize;
        const cx = x + w / 2;
        const cy = y + h / 2;
        const maxR = Math.min(w, h) * 0.3;
        const animTimer = isGhost ? 0 : (b.animTimer || 0);

        // Фон
        ctx.fillStyle = '#0a0a1a';
        ctx.fillRect(x, y, w, h);
        ctx.strokeStyle = '#ff8800';
        ctx.lineWidth = 2;
        ctx.strokeRect(x + 1, y + 1, w - 2, h - 2);

        if (!isGhost) {
            const progress = b.craftTimer ? Math.min(b.craftTimer / 2.0, 1.0) : 0;
            const dist = maxR * (1 - progress);
            const angle = animTimer * 2;

            // Два атома водорода
            const x1 = cx + Math.cos(angle) * dist;
            const y1 = cy + Math.sin(angle) * dist;
            drawParticle(ctx, x1, y1, maxR * 0.6, 'H', animTimer);

            const x2 = cx + Math.cos(angle + Math.PI) * dist;
            const y2 = cy + Math.sin(angle + Math.PI) * dist;
            drawParticle(ctx, x2, y2, maxR * 0.6, 'H', animTimer);

            // Вспышка и гелий
            if (progress > 0.8) {
                const flashAlpha = (progress - 0.8) * 5;
                ctx.beginPath();
                ctx.arc(cx, cy, maxR * 0.2, 0, Math.PI * 2);
                ctx.fillStyle = `rgba(255, 255, 255, ${flashAlpha})`;
                ctx.fill();
                ctx.shadowColor = '#ffffff';
                ctx.shadowBlur = 15 * flashAlpha;
                ctx.fill();
                ctx.shadowBlur = 0;
            }

            if (!progress && (b.outputResources['He'] || 0) > 0) {
                drawParticle(ctx, cx, cy, maxR * 0.8, 'He', animTimer);
            }

            // Прогресс-бар
            if (progress > 0) {
                ctx.fillStyle = '#ff8800';
                ctx.fillRect(x + 2, y + h - 6, (w - 4) * progress, 4);
            }

            // Счётчик энергии
            const energyCount = b.outputResources['energy'] || 0;
            if (energyCount > 0) {
                ctx.fillStyle = COLORS.energy;
                ctx.font = `bold ${tileSize * 0.2}px "Segoe UI"`;
                ctx.textAlign = 'right';
                ctx.fillText(`⚡${energyCount}`, x + w - 4, y + h - 10);
            }
        } else {
            // Призрак
            drawParticle(ctx, cx, cy, maxR * 0.8, 'He', 0);
        }
    }
};