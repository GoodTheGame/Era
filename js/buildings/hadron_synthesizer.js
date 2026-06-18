const RECIPES = {
    proton: { inputs: { u: 2, d: 1 }, output: 'p', time: 1.0 },
    neutron: { inputs: { u: 1, d: 2 }, output: 'n', time: 1.0 }
};

export const hadronSynthesizerBuilding = {
    type: 'hadron_synthesizer',
    size: { w: 2, h: 1 }, // 2 клетки в ширину, 1 в высоту (поворачивается)
    rotateGhost(ghost) {
        if (!ghost.recipe) ghost.recipe = 'proton';
        ghost.recipe = ghost.recipe === 'proton' ? 'neutron' : 'proton';
    },
    update(building, game, dt) {
        if (!building.recipe) building.recipe = 'proton';
        if (!building.inputResources) building.inputResources = {};
        if (!building.outputResources) building.outputResources = {};
        if (!building.craftTimer) building.craftTimer = 0;

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
            building.craftTimer -= recipe.time;
            for (const [res, amount] of Object.entries(recipe.inputs)) {
                building.inputResources[res] -= amount;
            }
            const out = recipe.output;
            building.outputResources[out] = (building.outputResources[out] || 0) + 1;
        }
    },
    render(ctx, b, tileSize, isGhost, game) {
        const x = b.tx * tileSize;
        const y = b.ty * tileSize;
        const size = b.getSize(); // {w, h} с учётом rotation
        const w = size.w * tileSize;
        const h = size.h * tileSize;
        const recipe = isGhost ? (b.recipe || 'proton') : (b.recipe || 'proton');
        const col = recipe === 'proton' ? '#ffaa00' : '#aa00ff';

        ctx.fillStyle = col + '30';
        ctx.fillRect(x, y, w, h);
        ctx.strokeStyle = col;
        ctx.lineWidth = 2;
        ctx.strokeRect(x+1, y+1, w-2, h-2);

        ctx.fillStyle = '#fff';
        ctx.font = `bold ${tileSize*0.4}px "Segoe UI"`;
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillText(recipe === 'proton' ? 'p' : 'n', x + w/2, y + h/2);

        if (!isGhost && b.craftTimer > 0) {
            const recipeObj = RECIPES[recipe];
            const progress = b.craftTimer / recipeObj.time;
            ctx.fillStyle = '#0f0';
            ctx.fillRect(x + 2, y + h - 6, (w - 4) * progress, 4);
        }
    }
};