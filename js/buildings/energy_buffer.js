// js/buildings/energy_buffer.js
const ENERGY_COLOR = '#ff8800';
const GLOW_COLOR = '#ffcc88';

export const energyBufferBuilding = {
    type: 'energy_buffer',
    size: { w: 2, h: 2 },

    rotateGhost(ghost) {}, // не вращается

    update(building, game, dt) {
        // Анимация заряда (вращающаяся точка)
        if (!building.animTimer) building.animTimer = 0;
        building.animTimer += dt;
    },

    render(ctx, b, tileSize, isGhost, game) {
        const x = b.tx * tileSize;
        const y = b.ty * tileSize;
        const w = 2 * tileSize;
        const h = 2 * tileSize;
        const cx = x + w / 2;
        const cy = y + h / 2;
        const radius = w * 0.4; // основной круг

        // Фон круга
        ctx.beginPath();
        ctx.arc(cx, cy, radius, 0, Math.PI * 2);
        ctx.fillStyle = '#2a1a0a';
        ctx.fill();
        ctx.strokeStyle = ENERGY_COLOR;
        ctx.lineWidth = 3;
        ctx.stroke();

        // Молния в центре (упрощённая иконка)
        const boltSize = radius * 0.6;
        ctx.beginPath();
        ctx.moveTo(cx + boltSize * 0.2, cy - boltSize * 0.8);
        ctx.lineTo(cx - boltSize * 0.2, cy - boltSize * 0.1);
        ctx.lineTo(cx + boltSize * 0.1, cy - boltSize * 0.1);
        ctx.lineTo(cx - boltSize * 0.2, cy + boltSize * 0.8);
        ctx.lineTo(cx + boltSize * 0.2, cy + boltSize * 0.1);
        ctx.lineTo(cx - boltSize * 0.1, cy + boltSize * 0.1);
        ctx.closePath();
        ctx.fillStyle = ENERGY_COLOR;
        ctx.fill();
        ctx.strokeStyle = '#fff';
        ctx.lineWidth = 1;
        ctx.stroke();

        // Бегающий заряд вокруг молнии (точка на орбите)
        if (!isGhost) {
            const phase = b.animTimer || 0;
            const chargeAngle = phase * 3; // скорость вращения
            const chargeDist = radius * 0.7;
            const chargeX = cx + Math.cos(chargeAngle) * chargeDist;
            const chargeY = cy + Math.sin(chargeAngle) * chargeDist;
            ctx.beginPath();
            ctx.arc(chargeX, chargeY, radius * 0.12, 0, Math.PI * 2);
            ctx.fillStyle = '#fff';
            ctx.fill();
            ctx.shadowColor = ENERGY_COLOR;
            ctx.shadowBlur = 6;
            ctx.fill();
            ctx.shadowBlur = 0;
        }

        // Количество накопленной энергии (если не призрак)
        if (!isGhost && b.resources) {
            const energyCount = b.resources['energy'] || 0;
            ctx.fillStyle = '#fff';
            ctx.font = `bold ${tileSize * 0.25}px "Segoe UI"`;
            ctx.textAlign = 'center';
            ctx.fillText(`⚡${energyCount}`, cx, y + h - 6);
        }
    }
};