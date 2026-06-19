import { createFactory } from '../FactoryBase.js';
import { drawParticle } from '../ParticleRenderer.js';

const COLORS = {
    H: '#22aaff', He: '#ffdd44', energy: '#ff8800'
};

export const fusionPressBuilding = createFactory({
    type: 'fusion_press',
    size: { w: 2, h: 2 },
    recipes: {
        fusion: { inputs: { H: 2 }, output: 'He', time: 2.0 }
    },
    recipeColors: { fusion: '#ffdd44' },
    inputColors: { H: '#22aaff' },

    rotateGhost(ghost, game, reverse = false) {
        // один рецепт
    },

    render(ctx, b, tileSize, isGhost, game, config) {
        const x = b.tx * tileSize, y = b.ty * tileSize;
        const size = b.getSize();
        const w = size.w * tileSize, h = size.h * tileSize;
        const cx = x + w/2, cy = y + h/2;
        const maxR = Math.min(w, h) * 0.3;
        const animTimer = game.globalAnimTime || 0;
        const zoom = game.camera.zoom;

        if (zoom < 0.5 && !isGhost) {
            ctx.fillStyle = '#ff8800';
            ctx.fillRect(x + w*0.25, y + h*0.25, w*0.5, h*0.5);
            return;
        }

        if (!isGhost) {
            const progress = b.craftTimer ? Math.min(b.craftTimer / 2.0, 1.0) : 0;
            const dist = maxR * (1 - progress);
            const angle = animTimer * 2;

            const x1 = cx + Math.cos(angle) * dist;
            const y1 = cy + Math.sin(angle) * dist;
            drawParticle(ctx, x1, y1, maxR * 0.6, 'H', animTimer);

            const x2 = cx + Math.cos(angle + Math.PI) * dist;
            const y2 = cy + Math.sin(angle + Math.PI) * dist;
            drawParticle(ctx, x2, y2, maxR * 0.6, 'H', animTimer);

            if (progress > 0.8) {
                const flashAlpha = (progress - 0.8) * 5;
                ctx.beginPath();
                ctx.arc(cx, cy, maxR * 0.2, 0, Math.PI * 2);
                ctx.fillStyle = `rgba(255, 255, 255, ${flashAlpha})`;
                ctx.fill();
                ctx.shadowColor = '#fff';
                ctx.shadowBlur = 15 * flashAlpha;
                ctx.fill();
                ctx.shadowBlur = 0;
            }

            if (!progress && (b.outputResources['He'] || 0) > 0) {
                drawParticle(ctx, cx, cy, maxR * 0.8, 'He', animTimer);
            }

            if (progress > 0) {
                ctx.fillStyle = '#ff8800';
                ctx.fillRect(x + 2, y + h - 6, (w - 4) * progress, 4);
            }

            const energyCount = b.outputResources['energy'] || 0;
            if (energyCount > 0) {
                ctx.fillStyle = '#ff8800';
                ctx.font = `bold ${tileSize * 0.2}px "Segoe UI"`;
                ctx.textAlign = 'right';
                ctx.fillText(`⚡${energyCount}`, x + w - 4, y + h - 10);
            }
        } else {
            drawParticle(ctx, cx, cy, maxR * 0.8, 'He', 0);
        }
    }
});