export const starBuilding = {
    type: 'star',
    size: { w: 5, h: 5 },

    rotateGhost(ghost) {},

    update(building, game, dt) {
        // глобальное время в game.globalAnimTime
    },

    render(ctx, b, tileSize, isGhost, game) {
        const x = b.tx * tileSize;
        const y = b.ty * tileSize;
        const w = 5 * tileSize;
        const h = 5 * tileSize;
        const cx = x + w / 2;
        const cy = y + h / 2;
        const maxR = Math.min(w, h) * 0.4;
        const isActive = b.isActive || false;
        const phase = game.globalAnimTime || 0;
        const zoom = game.camera.zoom;

        // При сильном отдалении рисуем простой круг
        if (zoom < 0.5 && !isGhost) {
            const pulse = Math.sin(phase * 1.5) * 0.05 + 0.15;
            ctx.fillStyle = `rgba(255, 150, 50, ${pulse})`;
            ctx.beginPath();
            ctx.arc(cx, cy, maxR, 0, Math.PI * 2);
            ctx.fill();
            ctx.fillStyle = '#fff';
            ctx.font = `${tileSize*0.3}px "Segoe UI"`;
            ctx.textAlign = 'center';
            ctx.fillText('ЗВЕЗДА', cx, y + h - 10);
            return;
        }

        // Фон
        const bgGradient = ctx.createRadialGradient(cx, cy, 0, cx, cy, maxR * 2);
        bgGradient.addColorStop(0, '#0a0a1a');
        bgGradient.addColorStop(1, '#050510');
        ctx.fillStyle = bgGradient;
        ctx.fillRect(x, y, w, h);

        if (isActive) {
            // ... активная звезда (оставляем как было)
        } else {
            const pulse = Math.sin(phase * 1.5) * 0.05 + 0.15;

            const outerGlow = ctx.createRadialGradient(cx, cy, maxR * 0.6, cx, cy, maxR * 1.3);
            outerGlow.addColorStop(0, `rgba(255, 150, 50, ${pulse * 0.6})`);
            outerGlow.addColorStop(1, 'rgba(255, 150, 50, 0)');
            ctx.fillStyle = outerGlow;
            ctx.beginPath();
            ctx.arc(cx, cy, maxR * 1.3, 0, Math.PI * 2);
            ctx.fill();

            const coreGradient = ctx.createRadialGradient(cx, cy, 0, cx, cy, maxR);
            coreGradient.addColorStop(0, '#3a3a4a');
            coreGradient.addColorStop(0.7, '#1a1a2e');
            coreGradient.addColorStop(1, '#0a0a14');
            ctx.fillStyle = coreGradient;
            ctx.beginPath();
            ctx.arc(cx, cy, maxR, 0, Math.PI * 2);
            ctx.fill();

            const innerPulse = ctx.createRadialGradient(cx, cy, 0, cx, cy, maxR * 0.6);
            innerPulse.addColorStop(0, `rgba(255, 180, 80, ${pulse})`);
            innerPulse.addColorStop(1, 'rgba(255, 150, 50, 0)');
            ctx.fillStyle = innerPulse;
            ctx.beginPath();
            ctx.arc(cx, cy, maxR * 0.6, 0, Math.PI * 2);
            ctx.fill();
        }
    }
};