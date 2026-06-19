// js/buildings/hadron_synthesizer.js
const RECIPES = {
    proton: { inputs: { u: 2, d: 1, g: 1 }, output: 'p', time: 1.5 },
    neutron: { inputs: { u: 1, d: 2, g: 1 }, output: 'n', time: 1.5 }
};
export const HADRON_ACCEPTED = ['u', 'd', 'g'];

const QUARK_COLORS = {
    u: '#e74c3c', d: '#3498db', g: '#ff44cc', p: '#ffaa00', n: '#aa00ff'
};

export const hadronSynthesizerBuilding = {
    type: 'hadron_synthesizer',
    size: { w: 2, h: 2 },

    rotateGhost(ghost) {
        if (!ghost.recipe) ghost.recipe = 'proton';
        ghost.recipe = ghost.recipe === 'proton' ? 'neutron' : 'proton';
    },

    update(building, game, dt) {
        if (!building.recipe) building.recipe = 'proton';
        if (!building.inputResources) building.inputResources = {};
        if (!building.outputResources) building.outputResources = {};
        if (!building.craftTimer) building.craftTimer = 0;
        if (!building.animTimer) building.animTimer = 0;
        building.animTimer += dt;

        const recipe = RECIPES[building.recipe];
        if (!recipe) return;

        let canCraft = true;
        for (const [res, amount] of Object.entries(recipe.inputs)) {
            if ((building.inputResources[res] || 0) < amount) {
                canCraft = false;
                break;
            }
        }

        if (!canCraft) {
            building.craftTimer = 0;
            return;
        }

        building.craftTimer += dt;
        if (building.craftTimer >= recipe.time) {
            building.craftTimer = 0;
            for (const [res, amount] of Object.entries(recipe.inputs)) {
                building.inputResources[res] -= amount;
            }
            const out = recipe.output;
            building.outputResources[out] = (building.outputResources[out] || 0) + 1;
        }
    },

    render(ctx, b, tileSize, isGhost, game) {
        const x = b.tx * tileSize, y = b.ty * tileSize;
        const size = b.getSize();
        const w = size.w * tileSize, h = size.h * tileSize;
        const cx = x + w/2, cy = y + h/2;
        const maxR = Math.min(w, h) * 0.4;

        ctx.fillStyle = '#0a0a1a';
        ctx.fillRect(x, y, w, h);
        ctx.strokeStyle = '#444';
        ctx.lineWidth = 2;
        ctx.strokeRect(x+1, y+1, w-2, h-2);

        if (!isGhost) {
            const progress = b.craftTimer ? Math.min(b.craftTimer / RECIPES[b.recipe].time, 1.0) : 0;
            const phase = b.animTimer || 0;

            // Вихрь из цветных точек
            const numDots = 12;
            for (let i = 0; i < numDots; i++) {
                const angle = (i / numDots) * Math.PI * 2 + phase * 2;
                const r = maxR * (0.6 + 0.3 * Math.sin(phase * 3 + i));
                const px = cx + Math.cos(angle) * r;
                const py = cy + Math.sin(angle) * r;
                const colorIndex = i % 3;
                const color = colorIndex === 0 ? QUARK_COLORS.u :
                              colorIndex === 1 ? QUARK_COLORS.d : QUARK_COLORS.g;
                ctx.beginPath();
                ctx.arc(px, py, 3, 0, Math.PI*2);
                ctx.fillStyle = color;
                ctx.fill();
            }

            // Сжимающееся ядро
            if (progress > 0) {
                const coreR = maxR * 0.5 * progress;
                ctx.beginPath();
                ctx.arc(cx, cy, coreR, 0, Math.PI*2);
                ctx.fillStyle = '#ffffff';
                ctx.globalAlpha = 0.6;
                ctx.fill();
                ctx.globalAlpha = 1;
            }

            // Метка рецепта
            const recipeCol = b.recipe === 'proton' ? QUARK_COLORS.p : QUARK_COLORS.n;
            ctx.fillStyle = recipeCol;
            ctx.beginPath();
            ctx.arc(cx + maxR*0.8, cy - maxR*0.8, 5, 0, Math.PI*2);
            ctx.fill();

            // Отображение входных ресурсов снизу
            const inputY = y + h - 4;
            const inputX = x + 2;
            const inputs = b.inputResources || {};
            ['u', 'd', 'g'].forEach((key, i) => {
                const rx = inputX + i * 25;
                ctx.fillStyle = QUARK_COLORS[key] || '#fff';
                ctx.fillRect(rx, inputY - 10, 10, 10);
                ctx.fillStyle = '#fff';
                ctx.font = '8px "Segoe UI"';
                ctx.fillText((inputs[key] || 0).toString(), rx + 12, inputY);
            });
        } else {
            const recipe = b.recipe || 'proton';
            const col = recipe === 'proton' ? QUARK_COLORS.p : QUARK_COLORS.n;
            ctx.fillStyle = col;
            ctx.font = `bold ${tileSize*0.5}px "Segoe UI"`;
            ctx.textAlign = 'center';
            ctx.textBaseline = 'middle';
            ctx.fillText(recipe === 'proton' ? 'P' : 'N', cx, cy);
        }
    }
};