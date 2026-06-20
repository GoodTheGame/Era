const ENERGY_COLOR = '#00ccff';

export const energyBufferBuilding = {
    type: 'energy_buffer',
    size: { w: 1, h: 1 },

    getItemPorts() {
        return [];
    },
    getEnergyPorts() {
        return [
            { type: 'any', x: 0.5, y: 0 },
            { type: 'any', x: 1, y: 0.5 },
            { type: 'any', x: 0.5, y: 1 },
            { type: 'any', x: 0, y: 0.5 }
        ];
    },

    rotateGhost(ghost, reverse = false) {},

    render(ctx, b, tileSize, isGhost, game) {
        const x = b.tx * tileSize;
        const y = b.ty * tileSize;
        const w = tileSize;
        const h = tileSize;
        const cx = x + w / 2;
        const cy = y + h / 2;
        const radius = w * 0.35;
        const animTimer = game.globalAnimTime || 0;
        const zoom = game.camera.zoom;

        // Упрощённый режим при отдалении
        if (zoom < 0.5 && !isGhost) {
            ctx.beginPath();
            ctx.arc(cx, cy, radius, 0, Math.PI * 2);
            ctx.fillStyle = ENERGY_COLOR;
            ctx.fill();
            const count = b.resources?.['energy'] || 0;
            if (count > 0) {
                ctx.fillStyle = '#fff';
                ctx.font = `bold ${tileSize * 0.3}px "Segoe UI"`;
                ctx.textAlign = 'center';
                ctx.fillText(`⚡${count}`, cx, y + h - 2);
            }
            return;
        }

        // Пульсирующая аура
        const pulse = 1 + Math.sin(animTimer * 2) * 0.1;
        const auraGradient = ctx.createRadialGradient(cx, cy, radius * 0.6, cx, cy, radius * 1.4);
        auraGradient.addColorStop(0, `rgba(0, 204, 255, 0.2)`);
        auraGradient.addColorStop(1, 'rgba(0, 150, 255, 0)');
        ctx.fillStyle = auraGradient;
        ctx.beginPath();
        ctx.arc(cx, cy, radius * 1.4 * pulse, 0, Math.PI * 2);
        ctx.fill();

        // Основной круг
        ctx.beginPath();
        ctx.arc(cx, cy, radius, 0, Math.PI * 2);
        ctx.fillStyle = '#0a1a2a';
        ctx.fill();
        ctx.strokeStyle = ENERGY_COLOR;
        ctx.lineWidth = 2;
        ctx.stroke();

        // Маленькая молния в центре
        const boltSize = radius * 0.5;
        ctx.beginPath();
        ctx.moveTo(cx + boltSize * 0.2, cy - boltSize * 0.7);
        ctx.lineTo(cx - boltSize * 0.2, cy);
        ctx.lineTo(cx + boltSize * 0.1, cy);
        ctx.lineTo(cx - boltSize * 0.2, cy + boltSize * 0.7);
        ctx.lineTo(cx + boltSize * 0.2, cy + boltSize * 0.1);
        ctx.lineTo(cx - boltSize * 0.1, cy + boltSize * 0.1);
        ctx.closePath();
        ctx.fillStyle = ENERGY_COLOR;
        ctx.fill();

        // Бегающий заряд
        if (!isGhost) {
            const chargeAngle = animTimer * 2.5;
            const chargeDist = radius * 0.65;
            const chargeX = cx + Math.cos(chargeAngle) * chargeDist;
            const chargeY = cy + Math.sin(chargeAngle) * chargeDist;
            ctx.beginPath();
            ctx.arc(chargeX, chargeY, radius * 0.1, 0, Math.PI * 2);
            ctx.fillStyle = '#fff';
            ctx.fill();
            ctx.shadowColor = ENERGY_COLOR;
            ctx.shadowBlur = 5;
            ctx.fill();
            ctx.shadowBlur = 0;

            const count = b.resources?.['energy'] || 0;
            ctx.fillStyle = '#fff';
            ctx.font = `bold ${tileSize * 0.22}px "Segoe UI"`;
            ctx.textAlign = 'center';
            ctx.fillText(`⚡${count}`, cx, y + h - 3);
        }
    }
};