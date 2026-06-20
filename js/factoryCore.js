// js/factoryCore.js
import { RESOURCE_COLORS } from './resources.js';

/**
 * Центральный модуль для работы с фабриками.
 * Предоставляет методы для получения рецептов, портов, проверки ресурсов.
 */
export const FactoryCore = {
    /**
     * Возвращает конфигурацию фабрики (рецепты, размеры и т.п.)
     */
    getConfig(building) {
        return building._factoryConfig || null;
    },

    /**
     * Получает текущий рецепт здания
     */
    getRecipe(building) {
        const config = this.getConfig(building);
        if (!config || !config.recipes) return null;
        return config.recipes[building.recipe];
    },

    /**
     * Устанавливает новый рецепт зданию
     */
    setRecipe(building, recipeKey, game) {
        const config = this.getConfig(building);
        if (!config || !config.recipes || !config.recipes[recipeKey]) return false;
        building.recipe = recipeKey;

        // Очистка несовместимых входных ресурсов
        if (building.inputResources) {
            const newInputs = config.recipes[recipeKey].inputs;
            const newKeys = Object.keys(newInputs);
            for (const key of Object.keys(building.inputResources)) {
                if (!newKeys.includes(key)) {
                    delete building.inputResources[key];
                }
            }
        }
        // Сброс выхода и таймера
        building.outputResources = {};
        building.craftTimer = 0;

        // Обновление сети (цвет линий)
        if (game && game.network) {
            game.network.refreshOutgoingResourceTypes(building);
        }
        return true;
    },

    /**
     * Возвращает список доступных рецептов (ключей) для фабрики
     */
    getAvailableRecipes(building) {
        const config = this.getConfig(building);
        return config ? Object.keys(config.recipes) : [];
    },

    /**
     * Проверяет, какой ресурс производит фабрика в данный момент (выходной порт)
     */
    getProducedResource(building) {
        const recipe = this.getRecipe(building);
        return recipe ? recipe.output : null;
    },

    /**
     * Проверяет, принимает ли конкретный порт указанный ресурс
     */
    canAcceptResourceInPort(building, portIndex, resource) {
        const ports = building.getItemPorts();
        if (!ports || portIndex >= ports.length) return false;
        const port = ports[portIndex];
        return port.accepts ? port.accepts.includes(resource) : true;
    }
};