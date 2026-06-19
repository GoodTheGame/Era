import { createFactory } from '../FactoryBase.js';
import { drawParticle } from '../ParticleRenderer.js';

const COLORS = {
    p: '#ffaa00', e: '#ffff00', H: '#22aaff'
};

export const electronCaptureBuilding = createFactory({
    type: 'electron_capture',
    size: { w: 2, h: 1 },
    recipes: {
        hydrogen: { inputs: { p: 1, e: 1 }, output: 'H', time: 1.0 }
    },
    recipeColors: { hydrogen: '#22aaff' },
    inputColors: COLORS,

    rotateGhost(ghost, game, reverse = false) {
        // только один рецепт, ничего не делаем
    },

    render(ctx, b, tileSize, isGhost, game, config) {
        const x = b.tx * tileSize, y = b.ty * tileSize;
        const size = b.getSize();
        const w = size.w * tileSize, h = size.h * tileSize;
        const cx = x + w/2, cy = y + h/2;
        const maxR = Math.min(w, h) * 0.35;
        const animTimer = game.globalAnimTime || 0;
        const zoom = game.camera.zoom;

        if (zoom < 0.5 && !isGhost) {
            ctx.fillStyle = '#22aaff';
            ctx.fillRect(x + w*0.25, y + h*0.25, w*0.5, h*0.5);
            return;
        }

        const progress = b.craftTimer ? Math.min(b.craftTimer / 1.0, 1.0) : 0;

        if (!isGhost) {
            drawParticle(ctx, cx, cy, maxR * 0.6, 'p', animTimer);

            if (!progress || progress < 0.8) {
                const eAngle = animTimer * 3;
                const orbitR = maxR * 1.2;
                const ex = cx + Math.cos(eAngle) * orbitR;
                const ey = cy + Math.sin(eAngle) * orbitR;
                drawParticle(ctx, ex, ey, maxR * 0.4, 'e', animTimer);
            }

            if (progress > 0) {
                const alpha = progress;
                ctx.globalAlpha = alpha;
                ctx.beginPath();
                ctx.arc(cx, cy, maxR * 0.3, 0, Math.PI*2);
                ctx.fillStyle = '#ffffff';
                ctx.fill();
                ctx.globalAlpha = 1;

                ctx.fillStyle = '#22aaff';
                ctx.fillRect(x + 2, y + h - 6, (w - 4) * progress, 4);
            }

            if (!progress && (b.outputResources['H'] || 0) > 0) {
                drawParticle(ctx, cx, cy, maxR * 0.8, 'H', animTimer);
            }
        } else {
            drawParticle(ctx, cx, cy, maxR * 0.8, 'H', 0);
        }
    }
});