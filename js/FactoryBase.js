// js/FactoryBase.js
export const STACK_SIZE = 100;

/**
 * Универсальный конструктор фабрики.
 * config должен содержать:
 *   type, size, recipes, recipeColors, inputColors (для отладки),
 *   render (функция отрисовки, как раньше)
 *   rotateCallback (опционально) – если нужно что-то дополнительное при смене рецепта
 */
export function createFactory(config) {
    return {
        type: config.type,
        size: config.size,

        rotateGhost(ghost) {
            if (!ghost.recipe) ghost.recipe = Object.keys(config.recipes)[0];
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

            // Инициализация
            building.inputResources = building.inputResources || {};
            building.outputResources = building.outputResources || {};
            building.craftTimer = building.craftTimer || 0;

            // Определяем, изменился ли рецепт (с прошлого вызова update)
            if (building._lastRecipe && building._lastRecipe !== building.recipe) {
                // Очищаем выход
                building.outputResources = {};
                // Удаляем входные ресурсы, не нужные новому рецепту
                const newInputs = new Set(Object.keys(recipe.inputs));
                for (const key of Object.keys(building.inputResources)) {
                    if (!newInputs.has(key)) {
                        delete building.inputResources[key];
                    }
                }
                building.craftTimer = 0;
            }
            building._lastRecipe = building.recipe;

            // Проверка возможности крафта
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

            // Таймер крафта
            building.craftTimer += dt;
            if (building.craftTimer >= recipe.time) {
                building.craftTimer = 0;
                for (const [res, amount] of Object.entries(recipe.inputs)) {
                    building.inputResources[res] -= amount;
                }
                const out = recipe.output;
                building.outputResources[out] = (building.outputResources[out] || 0) + 1;
            }

            // Анимация
            if (!building.animTimer) building.animTimer = 0;
            building.animTimer += dt;
        },

        render(ctx, b, tileSize, isGhost, game) {
            // Вызываем пользовательскую отрисовку, если она есть
            if (config.render) {
                config.render(ctx, b, tileSize, isGhost, game);
            } else {
                // Заглушка
                const x = b.tx * tileSize, y = b.ty * tileSize;
                const size = b.getSize();
                const w = size.w * tileSize, h = size.h * tileSize;
                ctx.fillStyle = '#0a0a1a';
                ctx.fillRect(x, y, w, h);
                ctx.strokeStyle = '#444';
                ctx.lineWidth = 2;
                ctx.strokeRect(x+1, y+1, w-2, h-2);
            }

            // Отображение входных ресурсов (общее для всех фабрик)
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
}