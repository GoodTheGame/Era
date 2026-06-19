import { drawParticle } from '../ParticleRenderer.js';

export const gluonExtractorBuilding = {
    type: 'gluon_extractor',
    size: { w: 1, h: 1 },

    rotateGhost(ghost) {},

    update(building, game, dt) {
        if (!building.resources) building.resources = {};
        if (!building.timer) building.timer = 0;
        if (!building.animTimer) building.animTimer = 0;
        building.animTimer += dt;

        const quark = 'g';
        building.timer += dt;
        const interval = 0.2;
        while (building.timer >= interval) {
            building.timer -= interval;
            const cur = building.resources[quark] || 0;
            if (cur < 500) building.resources[quark] = cur + 1;
        }
    },

    render(ctx, b, tileSize, isGhost, game) {
        const x = b.tx * tileSize;
        const y = b.ty * tileSize;
        const s = tileSize;
        const cx = x + s / 2;
        const cy = y + s / 2;
        const animTimer = isGhost ? 0 : (b.animTimer || 0);
        const phase = animTimer * 6; // частота пульсации мембраны

        // Фоновое свечение
        ctx.fillStyle = '#ff44cc20';
        ctx.fillRect(x, y, s, s);
        ctx.strokeStyle = '#ff44cc';
        ctx.lineWidth = 2;
        ctx.strokeRect(x + 1, y + 1, s - 2, s - 2);

        // Мембрана
        const membraneY = cy;
        const membraneRadius = s * 0.28;
        const pulse = 1 + 0.15 * Math.sin(phase);
        const currentRadius = membraneRadius * pulse;

        // Внешняя оболочка мембраны
        ctx.beginPath();
        ctx.arc(cx, membraneY, currentRadius, 0, Math.PI * 2);
        ctx.fillStyle = '#ff44cc40';
        ctx.fill();
        ctx.strokeStyle = '#ff44cc';
        ctx.lineWidth = 2;
        ctx.stroke();

        // Сгусток глюонов в центре мембраны
        drawParticle(ctx, cx, membraneY, currentRadius * 0.7, 'g', animTimer);

        // Импульсные волны, расходящиеся при выбросе
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
            // Маленькая вспышка
            ctx.beginPath();
            ctx.arc(cx, membraneY, currentRadius * 1.2, 0, Math.PI * 2);
            ctx.fillStyle = 'rgba(255, 255, 255, 0.3)';
            ctx.fill();
        }

        // Счётчик ресурса
        if (!isGhost) {
            const count = b.resources['g'] || 0;
            ctx.fillStyle = '#fff';
            ctx.font = `${s * 0.2}px "Segoe UI"`;
            ctx.textAlign = 'center';
            ctx.fillText(count, cx, y + s - 2);
        }
    }
};