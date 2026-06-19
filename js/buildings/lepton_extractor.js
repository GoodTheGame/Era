import { drawParticle } from '../ParticleRenderer.js';

export const leptonExtractorBuilding = {
    type: 'lepton_extractor',
    size: { w: 1, h: 1 },

    rotateGhost(ghost) {},

    update(building, game, dt) {
        if (!building.resources) building.resources = {};
        if (!building.timer) building.timer = 0;
        if (!building.animTimer) building.animTimer = 0;
        building.animTimer += dt;

        const quark = 'e';
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
        const phase = animTimer * 2; // медленное вращение тарелки

        // Фоновое свечение
        ctx.fillStyle = '#ffff0020';
        ctx.fillRect(x, y, s, s);
        ctx.strokeStyle = '#ffff00';
        ctx.lineWidth = 2;
        ctx.strokeRect(x + 1, y + 1, s - 2, s - 2);

        // Тарелка (основное блюдце)
        ctx.save();
        ctx.translate(cx, cy);
        ctx.rotate(phase);

        // Внешнее кольцо
        ctx.beginPath();
        ctx.arc(0, 0, s * 0.28, 0, Math.PI * 2);
        ctx.strokeStyle = '#ccc';
        ctx.lineWidth = 1.5;
        ctx.stroke();

        // Спицы
        for (let i = 0; i < 6; i++) {
            const angle = (i / 6) * Math.PI * 2;
            const innerX = Math.cos(angle) * s * 0.08;
            const innerY = Math.sin(angle) * s * 0.08;
            const outerX = Math.cos(angle) * s * 0.25;
            const outerY = Math.sin(angle) * s * 0.25;
            ctx.beginPath();
            ctx.moveTo(innerX, innerY);
            ctx.lineTo(outerX, outerY);
            ctx.strokeStyle = '#aaa';
            ctx.lineWidth = 1;
            ctx.stroke();
        }

        // Центральный приёмник
        ctx.beginPath();
        ctx.arc(0, 0, s * 0.1, 0, Math.PI * 2);
        ctx.fillStyle = '#888';
        ctx.fill();
        ctx.strokeStyle = '#fff';
        ctx.lineWidth = 1;
        ctx.stroke();

        ctx.restore();

        // Электронное облачко, которое ловится тарелкой (движется по спирали к центру)
        const catchAngle = phase * 0.7; // медленное движение облачка
        const catchDist = s * 0.28 + Math.sin(phase * 5) * s * 0.05; // расстояние от центра
        const eX = cx + Math.cos(catchAngle) * catchDist;
        const eY = cy + Math.sin(catchAngle) * catchDist;
        drawParticle(ctx, eX, eY, s * 0.15, 'e', animTimer);

        // Луч захвата (импульсный)
        if (Math.sin(phase * 3) > 0.5) {
            ctx.beginPath();
            ctx.moveTo(cx, cy);
            ctx.lineTo(eX, eY);
            ctx.strokeStyle = 'rgba(255, 255, 0, 0.5)';
            ctx.lineWidth = 1;
            ctx.stroke();
        }

        // Счётчик ресурса
        if (!isGhost) {
            const count = b.resources['e'] || 0;
            ctx.fillStyle = '#000';
            ctx.font = `${s * 0.2}px "Segoe UI"`;
            ctx.textAlign = 'center';
            ctx.fillText(count, cx, y + s - 2);
        }
    }
};