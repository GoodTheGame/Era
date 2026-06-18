// js/buildings/belt.js
import { spriteRenderer } from '../SpriteRenderer.js';

export const BELT_ANIM_FRAME_COUNT = 14;

// ---------------------------------------------------------------
//  ВСПОМОГАТЕЛЬНЫЕ ФУНКЦИИ
// ---------------------------------------------------------------

function neighborOutputsTo(neighbor, tx, ty) {
    if (neighbor.type === 'extractor' || neighbor.type === 'belt') {
        const outDx = [0, 1, 0, -1][neighbor.rotation];
        const outDy = [-1, 0, 1, 0][neighbor.rotation];
        return (neighbor.tx + outDx === tx && neighbor.ty + outDy === ty);
    }
    return false;
}

function neighborAcceptsFrom(neighbor, fromDir) {
    if (neighbor.type === 'belt') {
        const rot = neighbor.rotation;
        const bt = neighbor.beltType || 0;
        let inDir;
        if (bt === 1)       inDir = (rot + 3) % 4; // левый поворот (вход слева от выхода)
        else if (bt === 2)  inDir = (rot + 1) % 4; // правый поворот (вход справа)
        else                inDir = (rot + 2) % 4; // прямой (вход сзади)
        return (inDir === fromDir);
    }
    if (['cutter', 'rotator', 'mixer', 'storage'].includes(neighbor.type)) {
        return (neighbor.rotation + 2) % 4 === fromDir;
    }
    return false;
}

export function getInputsAndOutputs(tx, ty, game) {
    const inputs = [];
    const outputs = [];
    const dirs = [0, 1, 2, 3]; // 0=вверх, 1=вправо, 2=вниз, 3=влево
    for (const dir of dirs) {
        const dx = [0, 1, 0, -1][dir];
        const dy = [-1, 0, 1, 0][dir];
        const nb = game.buildingManager.getBuildingAt(tx + dx, ty + dy);
        if (!nb) continue;
        if (neighborOutputsTo(nb, tx, ty)) inputs.push(dir);
        const acceptorDir = (dir + 2) % 4;
        if (neighborAcceptsFrom(nb, acceptorDir)) outputs.push(dir);
    }
    return { inputs, outputs };
}

// ---------------------------------------------------------------
//  ТИП ПОВОРОТА ПО ВХОДУ И ВЫХОДУ
// ---------------------------------------------------------------
export function getBeltTypeFromDirs(inDir, outDir) {
    const diff = (outDir - inDir + 4) % 4;
    if (diff === 1) return 1;   // левый поворот (left)
    if (diff === 3) return 2;   // правый поворот (right)
    return 0;                   // прямой (forward)
}

// ---------------------------------------------------------------
//  ЦИКЛ ВРАЩЕНИЯ ДЛЯ КЛАВИШИ R
// ---------------------------------------------------------------
function getRotationCycle(tx, ty, game) {
    const { inputs, outputs } = getInputsAndOutputs(tx, ty, game);

    if (inputs.length === 0 && outputs.length === 0) {
        return [0, 1, 2, 3].map(r => ({ rotation: r, beltType: 0 }));
    }

    if (inputs.length === 1 && outputs.length === 0) {
        const inDir = inputs[0];
        const leftOut = (inDir + 1) % 4;
        const rightOut = (inDir + 3) % 4;
        return [
            { rotation: leftOut, beltType: getBeltTypeFromDirs(inDir, leftOut) },
            { rotation: (inDir + 2) % 4, beltType: 0 },
            { rotation: rightOut, beltType: getBeltTypeFromDirs(inDir, rightOut) },
            { rotation: inDir, beltType: 0 }
        ];
    }

    if (inputs.length === 0 && outputs.length === 1) {
        const outDir = outputs[0];
        const rightIn = (outDir + 1) % 4;
        const leftIn = (outDir + 3) % 4;
        return [
            { rotation: outDir, beltType: getBeltTypeFromDirs(rightIn, outDir) },
            { rotation: outDir, beltType: 0 },
            { rotation: outDir, beltType: getBeltTypeFromDirs(leftIn, outDir) },
            { rotation: (outDir + 2) % 4, beltType: 0 }
        ];
    }

    if (inputs.length === 1 && outputs.length === 1) {
        const inDir = inputs[0];
        const leftOut = (inDir + 1) % 4;
        const rightOut = (inDir + 3) % 4;
        return [
            { rotation: leftOut, beltType: getBeltTypeFromDirs(inDir, leftOut) },
            { rotation: (inDir + 2) % 4, beltType: 0 },
            { rotation: rightOut, beltType: getBeltTypeFromDirs(inDir, rightOut) },
            { rotation: inDir, beltType: 0 }
        ];
    }

    return [];
}

// ---------------------------------------------------------------
//  ОСНОВНЫЕ ЭКСПОРТИРУЕМЫЕ ФУНКЦИИ
// ---------------------------------------------------------------

export function rotateBelt(building, game) {
    const cycle = getRotationCycle(building.tx, building.ty, game);
    if (cycle.length === 0) return;

    let idx = cycle.findIndex(s => s.rotation === building.rotation && s.beltType === building.beltType);
    if (idx === -1) idx = 0;
    else idx = (idx + 1) % cycle.length;

    const next = cycle[idx];
    building.rotation = next.rotation;
    building.beltType = next.beltType;
}

export function rotateBeltGhost(ghost, game) {
    const cycle = getRotationCycle(ghost.tx, ghost.ty, game);
    if (cycle.length === 0) return;

    let idx = cycle.findIndex(s => s.rotation === ghost.rotation && s.beltType === ghost.beltType);
    if (idx === -1) idx = 0;
    else idx = (idx + 1) % cycle.length;

    const next = cycle[idx];
    ghost.rotation = next.rotation;
    ghost.beltType = next.beltType;
}

export function updateSurroundingBelts(tx, ty, game, deep = false) {
    const dirs = [0, 1, 2, 3];

    // Первый проход: прямые соседи изменённой клетки
    for (const dir of dirs) {
        const dx = [0, 1, 0, -1][dir];
        const dy = [-1, 0, 1, 0][dir];
        const nb = game.buildingManager.getBuildingAt(tx + dx, ty + dy);
        if (!nb || nb.type !== 'belt') continue;

        applyBestState(nb, game);
    }

    // Глубокое обновление (только при deep=true)
    if (deep) {
        const visited = new Set();
        const queue = [];
        visited.add(`${tx},${ty}`);

        // Собираем всех соседей первого круга
        for (const dir of dirs) {
            const dx = [0, 1, 0, -1][dir];
            const dy = [-1, 0, 1, 0][dir];
            const nx = tx + dx, ny = ty + dy;
            const nb = game.buildingManager.getBuildingAt(nx, ny);
            if (nb && nb.type === 'belt') {
                const key = `${nx},${ny}`;
                if (!visited.has(key)) {
                    queue.push({ tx: nx, ty: ny });
                    visited.add(key);
                }
            }
        }

        // Каскад
        while (queue.length > 0) {
            const { tx: ctx, ty: cty } = queue.shift();
            const b = game.buildingManager.getBuildingAt(ctx, cty);
            if (!b || b.type !== 'belt') continue;

            const oldRot = b.rotation, oldType = b.beltType;
            applyBestState(b, game);

            if (b.rotation !== oldRot || b.beltType !== oldType) {
                // Изменился – добавляем его соседей
                for (const dir of dirs) {
                    const dx = [0, 1, 0, -1][dir];
                    const dy = [-1, 0, 1, 0][dir];
                    const nx = ctx + dx, ny = cty + dy;
                    const key = `${nx},${ny}`;
                    if (!visited.has(key)) {
                        const nb = game.buildingManager.getBuildingAt(nx, ny);
                        if (nb && nb.type === 'belt') {
                            queue.push({ tx: nx, ty: ny });
                            visited.add(key);
                        }
                    }
                }
            }
        }
    }
}

function applyBestState(belt, game) {
    const { inputs, outputs } = getInputsAndOutputs(belt.tx, belt.ty, game);
    let newState = null;

    if (inputs.length === 0 && outputs.length === 0) return;
    else if (inputs.length === 1 && outputs.length === 0)
        newState = { rotation: (inputs[0] + 2) % 4, beltType: 0 };
    else if (inputs.length === 0 && outputs.length === 1)
        newState = { rotation: outputs[0], beltType: 0 };
    else if (inputs.length === 1 && outputs.length === 1)
        newState = { rotation: outputs[0], beltType: getBeltTypeFromDirs(inputs[0], outputs[0]) };

    if (newState && (belt.rotation !== newState.rotation || belt.beltType !== newState.beltType)) {
        belt.rotation = newState.rotation;
        belt.beltType = newState.beltType;
    }
}

export function calculateOptimalBeltRotation(tx, ty, game) {
    const { inputs, outputs } = getInputsAndOutputs(tx, ty, game);
    if (outputs.length > 0) return outputs[0];
    if (inputs.length > 0) return (inputs[0] + 2) % 4;
    return 0;
}

export function calculateBeltType(tx, ty, rotation, game) {
    const { inputs, outputs } = getInputsAndOutputs(tx, ty, game);
    if (inputs.length === 1 && outputs.length === 1) {
        return getBeltTypeFromDirs(inputs[0], outputs[0]);
    }
    return 0;
}

// ---------------------------------------------------------------
//  ИНТЕРФЕЙС ДЛЯ РЕЕСТРА ЗДАНИЙ
// ---------------------------------------------------------------
export const beltBuilding = {
    type: 'belt',
    size: { w: 1, h: 1 },
    render(ctx, b, tileSize, isGhost, game) {
        const x = b.tx * tileSize;
        const y = b.ty * tileSize;
        spriteRenderer.drawBelt(ctx, x, y, tileSize, b.rotation, b.animationFrame, b.beltType, isGhost);
    },
    getGhostRotation(tx, ty, game) {
        return calculateOptimalBeltRotation(tx, ty, game);
    },
    getGhostBeltType(tx, ty, rotation, game) {
        return calculateBeltType(tx, ty, rotation, game);
    },
    rotate(building, game) {
        rotateBelt(building, game);
    },
    rotateGhost(ghost, game) {
        rotateBeltGhost(ghost, game);
    }
};