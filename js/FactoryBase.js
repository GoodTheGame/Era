// js/FactoryBase.js
export const STACK_SIZE = 100;

export function createFactory(config) {
    const factory = {
        type: config.type,
        size: config.size,
        _factoryConfig: config,

        getItemPorts() {
            if (config.getItemPorts) {
                return config.getItemPorts.call(this);
            }
            return [
                { type: 'in',  x: 0, y: 0.5 },
                { type: 'out', x: 1, y: 0.5 }
            ];
        },

        getEnergyPorts() {
            if (config.getEnergyPorts) {
                return config.getEnergyPorts.call(this);
            }
            return [];
        },

        initGhost(ghost) {
            // Рецепт больше не назначается автоматически – игрок выберет сам
        },

        rotateGhost(ghost, game, reverse) {
            if (config.rotateGhost) {
                config.rotateGhost.call(this, ghost, game, reverse);
                return;
            }
            // поворот без смены рецепта
        },

        changeMode(ghost, game, reverse) {
            if (!config.recipes) return;
            if (!ghost.recipe) ghost.recipe = Object.keys(config.recipes)[0];
            const keys = Object.keys(config.recipes);
            let idx = keys.indexOf(ghost.recipe);
            idx = reverse ? (idx - 1 + keys.length) % keys.length : (idx + 1) % keys.length;
            ghost.recipe = keys[idx];
            ghost.outputResources = {};
            if (ghost.inputResources) {
                const newInputs = config.recipes[ghost.recipe].inputs;
                const newInputKeys = Object.keys(newInputs);
                for (const key of Object.keys(ghost.inputResources)) {
                    if (!newInputKeys.includes(key)) {
                        delete ghost.inputResources[key];
                    }
                }
            }
            ghost.craftTimer = 0;
            if (game && game.network) {
                game.network.refreshOutgoingResourceTypes(ghost);
            }
        },

        update(building, game, dt) {
            if (!building.recipe) return;
            const recipe = config.recipes[building.recipe];
            if (!recipe) return;

            building.inputResources = building.inputResources || {};
            building.outputResources = building.outputResources || {};
            building.craftTimer = building.craftTimer || 0;

            if (building._lastRecipe && building._lastRecipe !== building.recipe) {
                building.outputResources = {};
                const newInputs = new Set(Object.keys(recipe.inputs));
                for (const key of Object.keys(building.inputResources)) {
                    if (!newInputs.has(key)) {
                        delete building.inputResources[key];
                    }
                }
                building.craftTimer = 0;
            }
            building._lastRecipe = building.recipe;

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

            if (!building.animTimer) building.animTimer = 0;
            building.animTimer += dt;
        },

        render(ctx, b, tileSize, isGhost, game) {
            if (config.render) {
                config.render.call(this, ctx, b, tileSize, isGhost, game);
            } else {
                const x = b.tx * tileSize, y = b.ty * tileSize;
                const size = b.getSize();
                const w = size.w * tileSize, h = size.h * tileSize;
                ctx.fillStyle = '#0a0a1a';
                ctx.fillRect(x, y, w, h);
                ctx.strokeStyle = '#444';
                ctx.lineWidth = 2;
                ctx.strokeRect(x+1, y+1, w-2, h-2);
            }
        }
    };
    return factory;
}