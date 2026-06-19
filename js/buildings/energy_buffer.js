const ENERGY_COLOR = '#00ccff';
const GLOW_COLOR = '#00aaff';

export const energyBufferBuilding = {
    type: 'energy_buffer',
    size: { w: 2, h: 2 },

    rotateGhost(ghost, reverse = false) {},

    render(ctx, b, tileSize, isGhost, game) {
        const x = b.tx * tileSize;
        const y = b.ty * tileSize;
        const w = 2 * tileSize;
        const h = 2 * tileSize;
        const cx = x + w / 2;
        const cy = y + h / 2;
        const radius = w * 0.4;
        const animTimer = game.globalAnimTime || 0;
        const zoom = game.camera.zoom;

        if (zoom < 0.5 && !isGhost) {
            ctx.beginPath();
            ctx.arc(cx, cy, radius, 0, Math.PI * 2);
            ctx.fillStyle = ENERGY_COLOR;
            ctx.fill();
            const energyCount = b.resources?.['energy'] || 0;
            if (energyCount > 0) {
                ctx.fillStyle = '#fff';
                ctx.font = `bold ${tileSize * 0.3}px "Segoe UI"`;
                ctx.textAlign = 'center';
                ctx.fillText(`⚡${energyCount}`, cx, y + h - 6);
            }
            return;
        }

        // Медленная пульсация
        const pulse = 1 + Math.sin(animTimer * 1.5) * 0.08;

        // Внешняя аура
        const auraGradient = ctx.createRadialGradient(cx, cy, radius * 0.7, cx, cy, radius * 1.3);
        auraGradient.addColorStop(0, `rgba(0, 204, 255, ${0.15 + Math.sin(animTimer * 2) * 0.05})`);
        auraGradient.addColorStop(1, 'rgba(0, 150, 255, 0)');
        ctx.fillStyle = auraGradient;
        ctx.beginPath();
        ctx.arc(cx, cy, radius * 1.3 * pulse, 0, Math.PI * 2);
        ctx.fill();

        // Основной круг
        ctx.beginPath();
        ctx.arc(cx, cy, radius, 0, Math.PI * 2);
        ctx.fillStyle = '#0a1a2a';
        ctx.fill();
        ctx.strokeStyle = ENERGY_COLOR;
        ctx.lineWidth = 3;
        ctx.stroke();

        // Молния
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

        // Бегающий заряд
        if (!isGhost) {
            const chargeAngle = animTimer * 2.5;
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

            const energyCount = b.resources?.['energy'] || 0;
            ctx.fillStyle = '#fff';
            ctx.font = `bold ${tileSize * 0.25}px "Segoe UI"`;
            ctx.textAlign = 'center';
            ctx.fillText(`⚡${energyCount}`, cx, y + h - 6);
        }
    }
};