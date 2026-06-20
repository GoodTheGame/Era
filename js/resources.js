// js/resources.js
// Единый реестр всех ресурсов игры.

const RESOURCES = {
    // --- Кварки (фундаментальные частицы) ---
    u:  { name: 'u-кварк',        color: '#e74c3c', category: 'quark' },
    d:  { name: 'd-кварк',        color: '#3498db', category: 'quark' },
    c:  { name: 'c-кварк',        color: '#2ecc71', category: 'quark' },
    s:  { name: 's-кварк',        color: '#f1c40f', category: 'quark' },
    t:  { name: 't-кварк',        color: '#9b59b6', category: 'quark' },
    b:  { name: 'b-кварк',        color: '#e67e22', category: 'quark' },
    g:  { name: 'глюон',          color: '#ff44cc', category: 'gluon' },
    e:  { name: 'электрон',       color: '#ffff00', category: 'lepton' },

    // --- Нуклоны (составные частицы) ---
    p:  { name: 'протон',         color: '#ffaa00', category: 'nucleon' },
    n:  { name: 'нейтрон',        color: '#aa00ff', category: 'nucleon' },

    // --- Химические элементы (первый уровень материи) ---
    H:  { name: 'водород',        color: '#22aaff', category: 'element' },
    He: { name: 'гелий',          color: '#ffdd44', category: 'element' },

    // --- Энергия (особый ресурс) ---
    energy: { name: 'энергия',    color: '#00ccff', category: 'energy' },
};

// Для быстрого доступа к цветам (используется в отрисовке)
export const RESOURCE_COLORS = Object.fromEntries(
    Object.entries(RESOURCES).map(([key, val]) => [key, val.color])
);

// Для фильтров и UI
export const RESOURCE_LIST = Object.entries(RESOURCES).map(([key, val]) => ({
    id: key,
    name: val.name,
    color: val.color,
    category: val.category
}));

// Получить данные ресурса по ключу
export function getResource(id) {
    return RESOURCES[id] || null;
}