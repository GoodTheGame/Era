import { drawParticle } from '../ParticleRenderer.js';

export const ELECTRON_CAPTURE_ACCEPTED = ['p', 'e'];
export const electronCaptureBuilding = {
    type: 'electron_capture',
    size: { w: 2, h: 1 },
    rotateGhost(ghost) {},
    update(building, game, dt) {
        if (!building.inputResources) building.inputResources = {};
        if (!building.outputResources) building.outputResources = {};
        if (!building.craftTimer) building.craftTimer = 0;
        if (!building.animTimer) building.animTimer = 0;
        building.animTimer += dt;
        
        const needP = 1, needE = 1;
        const hasP = building.inputResources['p'] || 0;
        const hasE = building.inputResources['e'] || 0;
        
        if (hasP >= needP && hasE >= needE) {
            building.craftTimer += dt;
            if (building.craftTimer >= 1.0) {
                building.craftTimer -= 1.0;
                building.inputResources['p'] -= needP;
                building.inputResources['e'] -= needE;
                building.outputResources['H'] = (building.outputResources['H'] || 0) + 1;
            }
        } else {
            building.craftTimer = 0;
        }
    },
    render(ctx, b, tileSize, isGhost, game) {
        const x = b.tx * tileSize, y = b.ty * tileSize;
        const size = b.getSize();
        const w = size.w * tileSize, h = size.h * tileSize;
        const cx = x + w/2, cy = y + h/2;
        const maxR = Math.min(w, h) * 0.35;
        const animTimer = isGhost ? 0 : (b.animTimer || 0);
        const progress = b.craftTimer ? Math.min(b.craftTimer / 1.0, 1.0) : 0;
        
        ctx.fillStyle = '#0a0a1a';
        ctx.fillRect(x, y, w, h);
        ctx.strokeStyle = '#22aaff';
        ctx.lineWidth = 2;
        ctx.strokeRect(x+1, y+1, w-2, h-2);
        
        if (!isGhost) {
            // Протон в центре
            drawParticle(ctx, cx, cy, maxR * 0.6, 'p', animTimer);
            
            // Электрон на орбите
            if (!progress || progress < 0.8) {
                const eAngle = animTimer * 3;
                const orbitR = maxR * 1.2;
                const ex = cx + Math.cos(eAngle) * orbitR;
                const ey = cy + Math.sin(eAngle) * orbitR;
                drawParticle(ctx, ex, ey, maxR * 0.4, 'e', animTimer);
            }
            
            // Прогресс захвата (электрон падает)
            if (progress > 0) {
                const alpha = progress;
                ctx.globalAlpha = alpha;
                ctx.beginPath();
                ctx.arc(cx, cy, maxR * 0.3, 0, Math.PI*2);
                ctx.fillStyle = '#ffffff';
                ctx.fill();
                ctx.globalAlpha = 1;
                
                // Полоска прогресса
                ctx.fillStyle = '#22aaff';
                ctx.fillRect(x + 2, y + h - 6, (w - 4) * progress, 4);
            }
            
            // Если завершён, показываем водород
            if (!progress && (b.outputResources['H'] || 0) > 0) {
                drawParticle(ctx, cx, cy, maxR * 0.8, 'H', animTimer);
            }
        } else {
            drawParticle(ctx, cx, cy, maxR * 0.8, 'H', 0);
        }
    }
};