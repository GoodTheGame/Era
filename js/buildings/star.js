// js/buildings/star.js
export const starBuilding = {
    type: 'star',
    size: { w: 5, h: 5 },

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
                building.shutdownTimer = 0;
            }
        } else {
            while (building.timer >= 1.0) {
                building.timer -= 1.0;
                const current = building.resources['energy'] || 0;
                building.resources['energy'] = Math.max(0, current - 1);
            }

            if ((building.resources['energy'] || 0) > 0) {
                building.shutdownTimer = 0;
            } else {
                building.shutdownTimer = (building.shutdownTimer || 0) + dt;
                if (building.shutdownTimer >= 10) {
                    building.isActive = false;
                    building.shutdownTimer = 0;
                }
            }
        }
    },

    rotateGhost(ghost, game, reverse) {
        ghost.rotation = (ghost.rotation + (reverse ? -1 : 1) + 4) % 4;
    },

    getItemPorts() {
        return [
            { type: 'in', x: 0, y: 0.5, accepts: ['p'] },   // левый порт – только протоны
            { type: 'in', x: 1, y: 0.5, accepts: ['n'] }    // правый порт – только нейтроны
        ];
    },
    getEnergyPorts() {
        return [
            { type: 'in', x: 0.5, y: 0.5 }   // центральный порт – энергия
        ];
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
        const shutdownProgress = b.shutdownTimer ? Math.min(b.shutdownTimer / 10, 1) : 0;

        if (zoom < 0.5 && !isGhost) {
            const pulse = isActive
                ? (Math.sin(phase * 1.5) * 0.2 + 0.6) * (1 - shutdownProgress * 0.8)
                : (Math.sin(phase * 1.5) * 0.05 + 0.15);
            ctx.fillStyle = isActive
                ? `rgba(0, 200, 255, ${pulse})`
                : `rgba(255, 150, 50, ${pulse})`;
            ctx.beginPath();
            ctx.arc(cx, cy, maxR, 0, Math.PI * 2);
            ctx.fill();
            if (!isActive) {
                const pCount = b.inputResources?.['p'] || 0;
                const nCount = b.inputResources?.['n'] || 0;
                const eCount = b.resources?.['energy'] || 0;
                ctx.fillStyle = '#fff';
                ctx.font = `bold ${tileSize * 0.35}px "Segoe UI"`;
                ctx.textAlign = 'center';
                ctx.fillText(`p:${pCount}/10  n:${nCount}/10  ⚡${Math.floor(eCount)}/50`, cx, y + h - 12);
            }
            return;
        }

        const bgGradient = ctx.createRadialGradient(cx, cy, 0, cx, cy, maxR * 2);
        bgGradient.addColorStop(0, '#0a0a1a');
        bgGradient.addColorStop(1, '#050510');
        ctx.fillStyle = bgGradient;
        ctx.fillRect(x, y, w, h);

        if (isActive) {
            const alpha = 1 - shutdownProgress * 0.8;
            ctx.globalAlpha = alpha;

            const coreRadius = maxR * (0.9 - shutdownProgress * 0.4);
            const coreGradient = ctx.createRadialGradient(cx, cy, 0, cx, cy, coreRadius);
            coreGradient.addColorStop(0, '#ffffff');
            coreGradient.addColorStop(0.2, '#00ccff');
            coreGradient.addColorStop(0.5, '#0066aa');
            coreGradient.addColorStop(1, 'rgba(0, 0, 50, 0)');
            ctx.fillStyle = coreGradient;
            ctx.beginPath();
            ctx.arc(cx, cy, coreRadius, 0, Math.PI * 2);
            ctx.fill();

            if (shutdownProgress < 0.8) {
                for (let j = 0; j < 5; j++) {
                    const angle = phase * 2 + (j * Math.PI * 2) / 5;
                    const startX = cx + Math.cos(angle) * maxR * 0.3;
                    const startY = cy + Math.sin(angle) * maxR * 0.3;
                    const endX = cx + Math.cos(angle + 0.4) * maxR * 0.7;
                    const endY = cy + Math.sin(angle + 0.4) * maxR * 0.7;
                    ctx.beginPath();
                    ctx.moveTo(startX, startY);
                    ctx.quadraticCurveTo(
                        cx + Math.cos(angle + 0.2) * maxR * 0.9,
                        cy + Math.sin(angle + 0.2) * maxR * 0.9,
                        endX, endY
                    );
                    ctx.strokeStyle = `rgba(255, 200, 100, ${0.7 + Math.sin(phase * 5 + j) * 0.3})`;
                    ctx.lineWidth = 2;
                    ctx.stroke();
                }
            }

            if (shutdownProgress < 1) {
                for (let k = 0; k < 16; k++) {
                    const angle = (k / 16) * Math.PI * 2 + phase * (0.3 - shutdownProgress * 0.25);
                    const len = maxR * (1.4 + Math.sin(phase * 3 + k) * 0.2) * (1 - shutdownProgress * 0.5);
                    const x1 = cx + Math.cos(angle) * maxR * 0.9;
                    const y1 = cy + Math.sin(angle) * maxR * 0.9;
                    const x2 = cx + Math.cos(angle) * len;
                    const y2 = cy + Math.sin(angle) * len;
                    ctx.beginPath();
                    ctx.moveTo(x1, y1);
                    ctx.lineTo(x2, y2);
                    ctx.strokeStyle = `rgba(0, 180, 255, ${0.3 + Math.sin(phase * 4 + k) * 0.1})`;
                    ctx.lineWidth = 1;
                    ctx.stroke();
                }
            }
            ctx.globalAlpha = 1;
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

        if (!isGhost) {
            const pCount = b.inputResources?.['p'] || 0;
            const nCount = b.inputResources?.['n'] || 0;
            const eCount = b.resources?.['energy'] || 0;
            const fontSize = tileSize * 0.25;

            ctx.textAlign = 'left';
            ctx.font = `bold ${fontSize}px "Segoe UI"`;

            ctx.fillStyle = '#ffaa00';
            ctx.fillText(`p ${pCount}/10`, x + 6, y + h - 12);

            ctx.fillStyle = '#aa00ff';
            ctx.fillText(`n ${nCount}/10`, x + 6, y + h - 12 - fontSize - 2);

            ctx.textAlign = 'right';
            ctx.fillStyle = '#00ccff';
            ctx.fillText(`⚡${Math.floor(eCount)}/50`, x + w - 6, y + h - 12);
        }
    }
};