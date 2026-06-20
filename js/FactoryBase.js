// js/FactoryBase.js
export const STACK_SIZE = 100;

export function createFactory(config) {
    const factory = {
        type: config.type,
        size: config.size,

        // Порты по умолчанию, если не заданы в config
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
            return [];   // по умолчанию энергопортов нет
        },

        initGhost(ghost) {
            if (!ghost.recipe) {
                ghost.recipe = Object.keys(config.recipes)[0];
            }
        },

        rotateGhost(ghost) {
            if (!ghost.recipe) {
                ghost.recipe = Object.keys(config.recipes)[0];
                return;
            }
            const keys = Object.keys(config.recipes);
            const idx = keys.indexOf(ghost.recipe);
            const nextIdx = (idx + 1) % keys.length;
            ghost.recipe = keys[nextIdx];
            if (config.rotateCallback) config.rotateCallback(ghost);
        },

        update(building, game, dt) {
            if (!building.recipe) building.recipe = Object.keys(config.recipes)[0];
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

        // Рендер без дополнительного параметра config (используем замыкание)
        render(ctx, b, tileSize, isGhost, game) {
            if (config.render) {
                config.render(ctx, b, tileSize, isGhost, game, config);
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

            // Отображение входных ресурсов
            if (!isGhost && b.inputResources && config.recipes[b.recipe]) {
                const inputs = config.recipes[b.recipe].inputs;
                const keys = Object.keys(inputs);
                const iconSize = tileSize * 0.15;
                const startX = b.tx * tileSize + 2;
                const startY = b.ty * tileSize + tileSize * b.getSize().h - 12;
                keys.forEach((key, i) => {
                    const rx = startX + i * 20;
                    ctx.fillStyle = config.inputColors?.[key] || '#fff';
                    ctx.fillRect(rx, startY, iconSize, iconSize);
                    ctx.fillStyle = '#000';
                    ctx.font = `${iconSize * 0.7}px "Segoe UI"`;
                    ctx.fillText((b.inputResources[key] || 0).toString(), rx + 2, startY + iconSize - 2);
                });
            }
        }
    };
    return factory;
}