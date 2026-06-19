const ENERGY_COLOR = '#00ffff';
const GLOW_COLOR = '#00ccff';

export const energyBufferBuilding = {
    type: 'energy_buffer',
    size: { w: 2, h: 2 },

    rotateGhost(ghost) {},

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
            ctx.fillStyle = ENERGY_COLOR;
            ctx.fillRect(x + w*0.25, y + h*0.25, w*0.5, h*0.5);
            const energyCount = b.resources?.['energy'] || 0;
            if (energyCount > 0) {
                ctx.fillStyle = '#fff';
                ctx.font = `bold ${tileSize*0.3}px "Segoe UI"`;
                ctx.textAlign = 'center';
                ctx.fillText(`⚡${energyCount}`, cx, y + h - 6);
            }
            return;
        }

        ctx.beginPath();
        ctx.arc(cx, cy, radius, 0, Math.PI * 2);
        ctx.fillStyle = '#0a1a2a';
        ctx.fill();
        ctx.strokeStyle = ENERGY_COLOR;
        ctx.lineWidth = 3;
        ctx.stroke();

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

        if (!isGhost) {
            const phase = animTimer;
            const chargeAngle = phase * 3;
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