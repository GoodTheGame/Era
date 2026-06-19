export const starBuilding = {
    type: 'star',
    size: { w: 5, h: 5 },

    rotateGhost(ghost, reverse = false) {},

    update(building, game, dt) {
        if (!building.resources) building.resources = {};
        if (!building.inputResources) building.inputResources = {};
        building.timer = building.timer || 0;
        building.timer += dt;

        const protonNeed = 10;
        const neutronNeed = 10;
        const energyNeed = 50;

        if (!building.isActive) {
            const p = building.inputResources['p'] || 0;
            const n = building.inputResources['n'] || 0;
            const e = building.resources['energy'] || 0;
            if (p >= protonNeed && n >= neutronNeed && e >= energyNeed) {
                building.inputResources['p'] -= protonNeed;
                building.inputResources['n'] -= neutronNeed;
                building.resources['energy'] -= energyNeed;
                building.isActive = true;
            }
        } else {
            building.resources['energy'] = (building.resources['energy'] || 0) - dt;
            if (building.resources['energy'] < 0) {
                building.resources['energy'] = 0;
                building.isActive = false;
            }
        }
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

        if (zoom < 0.5 && !isGhost) {
            const pulse = isActive ? (Math.sin(phase * 1.5) * 0.2 + 0.6) : (Math.sin(phase * 1.5) * 0.05 + 0.15);
            ctx.fillStyle = isActive ? `rgba(0, 200, 255, ${pulse})` : `rgba(255, 150, 50, ${pulse})`;
            ctx.beginPath();
            ctx.arc(cx, cy, maxR, 0, Math.PI * 2);
            ctx.fill();
            ctx.fillStyle = '#fff';
            ctx.font = `${tileSize*0.3}px "Segoe UI"`;
            ctx.textAlign = 'center';
            ctx.fillText(isActive ? 'АКТИВНА' : 'ЗВЕЗДА', cx, y + h - 10);
            return;
        }

        const bgGradient = ctx.createRadialGradient(cx, cy, 0, cx, cy, maxR * 2);
        bgGradient.addColorStop(0, '#0a0a1a');
        bgGradient.addColorStop(1, '#050510');
        ctx.fillStyle = bgGradient;
        ctx.fillRect(x, y, w, h);

        if (isActive) {
            // ... (оставь активную анимацию, которая была)
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