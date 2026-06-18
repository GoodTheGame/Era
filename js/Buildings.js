// Buildings.js
import {
    beltBuilding,
    updateSurroundingBelts,
    calculateOptimalBeltRotation,
    calculateBeltType,
    rotateBelt,
    getBeltTypeFromDirs,
    getInputsAndOutputs
} from './buildings/belt.js';
import { extractorBuilding } from './buildings/extractor.js';
import { cutterBuilding } from './buildings/cutter.js';
import { rotatorBuilding } from './buildings/rotator.js';
import { mixerBuilding } from './buildings/mixer.js';
import { splitterBuilding } from './buildings/splitter.js';
import { balancerBuilding } from './buildings/balancer.js';
import { storageBuilding } from './buildings/storage.js';
import { trashBuilding } from './buildings/trash.js';
import { tunnelBuilding } from './buildings/tunnel.js';
import { hubBuilding } from './buildings/hub.js';

const BUILDING_MODULES = {
    'belt': beltBuilding,
    'extractor': extractorBuilding,
    'cutter': cutterBuilding,
    'rotator': rotatorBuilding,
    'mixer': mixerBuilding,
    'splitter': splitterBuilding,
    'balancer': balancerBuilding,
    'storage': storageBuilding,
    'trash': trashBuilding,
    'tunnel': tunnelBuilding,
    'hub': hubBuilding,
};

export const BUILDING_SIZES = Object.fromEntries(
    Object.entries(BUILDING_MODULES).map(([type, mod]) => [type, mod.size])
);

export class Building {
    constructor(tx, ty, type, rotation = 0) {
        this.tx = tx;
        this.ty = ty;
        this.type = type;
        this.rotation = rotation;
        this.animationFrame = 0;
        this.beltType = 0;
    }

    getSize() {
        const base = BUILDING_SIZES[this.type] || { w: 1, h: 1 };
        if (this.rotation % 2 === 1) {
            return { w: base.h, h: base.w };
        }
        return base;
    }
}

export class BuildingManager {
    constructor(game) {
        this.game = game;
        this.buildings = [];
        this.ghost = null;
        this.lastMouseX = 0;
        this.lastMouseY = 0;
        this.isLeftMouseDown = false;
        this.isRightMouseDown = false;
        this.lastPlacedTile = null;
        this.lastGhostTile = null;
        this.ghostPreferred = { rotation: 0, beltType: 0 };
        this.pendingFirstBeltTile = null;
        this.isDraggingBelt = false;
        this.justPlaced = false;

        this.beltAnimFrame = 0;
        this.beltAnimTimer = 0;

        this._initGhost();
    }

    _initGhost() {
        this.ghost = new Building(0, 0, 'belt', 0);
        this.ghost.visible = false;
    }

    update(dt) {
        this.beltAnimTimer += dt;
        while (this.beltAnimTimer >= 0.07) {
            this.beltAnimTimer -= 0.07;
            this.beltAnimFrame = (this.beltAnimFrame + 1) % 14;
        }

        if (this.isRightMouseDown && !this.game.selectedType) {
            this._deleteUnderCursor();
        }

        this._updateGhostFromLastMouse();
    }

    _updateGhostFromLastMouse() {
        if (!this.game.selectedType) { this.ghost.visible = false; return; }
        const worldPos = this.game.camera.screenToWorld(this.lastMouseX, this.lastMouseY);
        const tile = this.game.map.worldToTile(worldPos.x, worldPos.y);

        if (this.justPlaced) {
            if (this.lastPlacedTile && tile.tx === this.lastPlacedTile.tx && tile.ty === this.lastPlacedTile.ty) {
                this.ghost.visible = false;
                return;
            } else {
                this.justPlaced = false;
            }
        }

        if (this.lastGhostTile && (tile.tx !== this.lastGhostTile.tx || tile.ty !== this.lastGhostTile.ty)) {
            this.lastGhostTile = null;
        }

        this.ghost.tx = tile.tx;
        this.ghost.ty = tile.ty;
        this.ghost.type = this.game.selectedType;
        this.ghost.visible = true;

        const module = BUILDING_MODULES[this.game.selectedType];

        if (!this.lastGhostTile) {
            const { inputs, outputs } = getInputsAndOutputs(tile.tx, tile.ty, this.game);
            if (inputs.length === 0 && outputs.length === 0) {
                this.ghost.rotation = this.ghostPreferred.rotation;
                this.ghost.beltType = 0;
            } else {
                if (module && module.getGhostRotation) {
                    this.ghost.rotation = module.getGhostRotation(tile.tx, tile.ty, this.game);
                }
                if (module && module.getGhostBeltType) {
                    this.ghost.beltType = module.getGhostBeltType(tile.tx, tile.ty, this.ghost.rotation, this.game);
                }
            }
        }
    }

    // ---------------------------------------------------------------
    //  АВТОПРОКЛАДКА С ПОВОРОТАМИ, ЗАМЫКАНИЕМ И ВЫХОДОМ
    // ---------------------------------------------------------------
    _tryPlaceBeltAt(tx, ty) {
        const existing = this.getBuildingAt(tx, ty);
        if (existing && existing.type !== 'belt') return false;

        let newBelt = null;

        if (this.lastPlacedTile) {
            const prev = this.getBuildingAt(this.lastPlacedTile.tx, this.lastPlacedTile.ty);
            if (!prev || prev.type !== 'belt') {
                newBelt = new Building(tx, ty, 'belt', this.ghost.rotation);
                newBelt.beltType = 0;
            } else {
                // Направление от предыдущего к текущей клетке
                const dx = tx - prev.tx;
                const dy = ty - prev.ty;
                let fromDir = null;
                if (dx === 0 && dy === -1) fromDir = 0;
                else if (dx === 1 && dy === 0) fromDir = 1;
                else if (dx === 0 && dy === 1) fromDir = 2;
                else if (dx === -1 && dy === 0) fromDir = 3;
                if (fromDir === null) return false;

                if (existing && existing.type === 'belt') {
                    // Клетка занята конвейером – стыковка или замыкание
                    const outDir = existing.rotation;
                    newBelt = new Building(tx, ty, 'belt', outDir);
                    newBelt.beltType = getBeltTypeFromDirs(fromDir, outDir);
                } else {
                    // Пустая клетка: прямое продолжение или поворот
                    const outDx = [0, 1, 0, -1][prev.rotation];
                    const outDy = [-1, 0, 1, 0][prev.rotation];
                    const expectedTX = prev.tx + outDx;
                    const expectedTY = prev.ty + outDy;

                    if (tx === expectedTX && ty === expectedTY) {
                        // Прямое продолжение
                        newBelt = new Building(tx, ty, 'belt', prev.rotation);
                        newBelt.beltType = 0;
                    } else {
                        // Не прямо – это поворот, обработаем снаружи
                        return false;
                    }
                }
            }
        } else {
            // Самый первый конвейер
            newBelt = new Building(tx, ty, 'belt', this.ghost.rotation);
            newBelt.beltType = 0;
        }

        if (!newBelt) return false;

        // Если существующий конвейер полностью совпадает – не трогаем, но продолжаем линию
        if (existing && existing.type === 'belt' &&
            existing.rotation === newBelt.rotation &&
            existing.beltType === newBelt.beltType) {
            this.lastPlacedTile = { tx, ty };
            return true;
        }

        // Замена существующего
        if (existing) {
            this.buildings = this.buildings.filter(b => b !== existing);
        }
        if (this.getBuildingAt(tx, ty)) return false;

        this.buildings.push(newBelt);
        updateSurroundingBelts(tx, ty, this.game);
        this.lastPlacedTile = { tx, ty };
        return true;
    }

    _tryPlace() {
        if (!this.ghost.visible) return false;
        const size = this.ghost.getSize();
        const worldPos = this.game.camera.screenToWorld(this.lastMouseX, this.lastMouseY);
        const tile = this.game.map.worldToTile(worldPos.x, worldPos.y);
        const tx = tile.tx, ty = tile.ty;

        for (let dx = 0; dx < size.w; dx++) {
            for (let dy = 0; dy < size.h; dy++) {
                if (this.getBuildingAt(tx + dx, ty + dy)) return false;
            }
        }
        if (this.ghost.type === 'extractor' && !this.game.map.getVeinAt(tx, ty)) return false;

        const newBuilding = new Building(tx, ty, this.ghost.type, this.ghost.rotation);
        if (this.ghost.type === 'belt') {
            newBuilding.beltType = this.ghost.beltType || 0;
        }
        this.buildings.push(newBuilding);
        if (this.ghost.type === 'belt') {
            updateSurroundingBelts(tx, ty, this.game);
        }
        this.lastPlacedTile = { tx, ty };
        return true;
    }

    rotateBuildingUnderCursor() {
        const worldPos = this.game.camera.screenToWorld(this.lastMouseX, this.lastMouseY);
        const tile = this.game.map.worldToTile(worldPos.x, worldPos.y);
        const building = this.getBuildingAt(tile.tx, tile.ty);
        if (!building || building.type === 'hub') return;
        const module = BUILDING_MODULES[building.type];
        if (module && module.rotate) {
            module.rotate(building, this.game);
            updateSurroundingBelts(building.tx, building.ty, this.game);
        } else {
            building.rotation = (building.rotation + 1) % 4;
        }
    }

    rotateGhost() {
        if (!this.ghost.visible) return;
        const module = BUILDING_MODULES[this.ghost.type];
        if (module && module.rotateGhost) {
            module.rotateGhost(this.ghost, this.game);
            this.ghostPreferred.rotation = this.ghost.rotation;
            this.ghostPreferred.beltType = 0;
            this.lastGhostTile = { tx: this.ghost.tx, ty: this.ghost.ty };
        } else {
            this.ghost.rotation = (this.ghost.rotation + 1) % 4;
            this.ghostPreferred.rotation = this.ghost.rotation;
            this.ghostPreferred.beltType = 0;
        }
    }

    setMousePosition(x, y) { this.lastMouseX = x; this.lastMouseY = y; }

    pipette() {
        const worldPos = this.game.camera.screenToWorld(this.lastMouseX, this.lastMouseY);
        const tile = this.game.map.worldToTile(worldPos.x, worldPos.y);
        const b = this.getBuildingAt(tile.tx, tile.ty);
        if (b && b.type !== 'hub') {
            this.game.selectedType = b.type;
            this.ghost.rotation = b.rotation;
            if (b.type === 'belt') this.ghost.beltType = b.beltType;
            this.game.hud.updateActiveButton();
            return true;
        }
        return false;
    }

    _deleteUnderCursor() {
        const worldPos = this.game.camera.screenToWorld(this.lastMouseX, this.lastMouseY);
        const tile = this.game.map.worldToTile(worldPos.x, worldPos.y);
        const b = this.getBuildingAt(tile.tx, tile.ty);
        if (b && b.type !== 'hub') {
            this.buildings = this.buildings.filter(x => x !== b);
            if (b.type === 'belt') {
                updateSurroundingBelts(b.tx, b.ty, this.game);
            }
        }
    }

    onLeftMouseDown() {
        this.isLeftMouseDown = true;
        this.lastPlacedTile = null;
        this.justPlaced = false;

        if (this.game.selectedType === 'belt') {
            const worldPos = this.game.camera.screenToWorld(this.lastMouseX, this.lastMouseY);
            const tile = this.game.map.worldToTile(worldPos.x, worldPos.y);
            const existing = this.getBuildingAt(tile.tx, tile.ty);

            if (existing && existing.type !== 'belt') {
                this.pendingFirstBeltTile = null;
                this.isDraggingBelt = false;
            } else if (existing && existing.type === 'belt') {
                // Ручная стыковка: вход от призрака, выход существующего
                const inDir = (this.ghost.rotation + 2) % 4;
                const outDir = existing.rotation;
                const newRotation = outDir;
                const newBeltType = getBeltTypeFromDirs(inDir, outDir);
                const newBelt = new Building(tile.tx, tile.ty, 'belt', newRotation);
                newBelt.beltType = newBeltType;
                if (existing.rotation !== newRotation || existing.beltType !== newBeltType) {
                    this.buildings = this.buildings.filter(b => b !== existing);
                    this.buildings.push(newBelt);
                    updateSurroundingBelts(tile.tx, tile.ty, this.game);
                    this.lastPlacedTile = { tx: tile.tx, ty: tile.ty };
                    this.justPlaced = true;
                }
                this.pendingFirstBeltTile = null;
                this.isDraggingBelt = false;
            } else {
                this.pendingFirstBeltTile = { tx: tile.tx, ty: tile.ty };
                this.isDraggingBelt = true;
            }
        } else {
            this._tryPlace();
            this.justPlaced = true;
        }
    }

    onLeftMouseUp() {
        if (this.pendingFirstBeltTile) {
            const tile = this.pendingFirstBeltTile;
            if (!this.getBuildingAt(tile.tx, tile.ty)) {
                const newBelt = new Building(tile.tx, tile.ty, 'belt', this.ghost.rotation);
                newBelt.beltType = 0;
                this.buildings.push(newBelt);
                updateSurroundingBelts(tile.tx, tile.ty, this.game);
                this.lastPlacedTile = { tx: tile.tx, ty: tile.ty };
                this.justPlaced = true;
            }
            this.pendingFirstBeltTile = null;
        }
        this.isLeftMouseDown = false;
        this.lastPlacedTile = null;
        this.isDraggingBelt = false;
        this.pendingFirstBeltTile = null;
    }

    onRightMouseDown() {
        this.isRightMouseDown = true;
        if (this.game.selectedType) {
            this.game.selectedType = null;
            this.ghost.visible = false;
            this.game.hud.updateActiveButton();
        } else {
            this._deleteUnderCursor();
        }
        this.justPlaced = false;
    }

    onRightMouseUp() {
        this.isRightMouseDown = false;
    }

    onMouseMove() {
        this.justPlaced = false;

        if (this.isLeftMouseDown && this.game.selectedType === 'belt') {
            const worldPos = this.game.camera.screenToWorld(this.lastMouseX, this.lastMouseY);
            const tile = this.game.map.worldToTile(worldPos.x, worldPos.y);

            // Первый конвейер при движении
            if (this.pendingFirstBeltTile && (tile.tx !== this.pendingFirstBeltTile.tx || tile.ty !== this.pendingFirstBeltTile.ty)) {
                const ftx = this.pendingFirstBeltTile.tx;
                const fty = this.pendingFirstBeltTile.ty;
                if (!this.getBuildingAt(ftx, fty)) {
                    const newBelt = new Building(ftx, fty, 'belt', this.ghost.rotation);
                    newBelt.beltType = 0;
                    this.buildings.push(newBelt);
                    updateSurroundingBelts(ftx, fty, this.game);
                    this.lastPlacedTile = { tx: ftx, ty: fty };
                }
                this.pendingFirstBeltTile = null;
            }

            // Продолжение линии
            if (!this.lastPlacedTile || this.lastPlacedTile.tx !== tile.tx || this.lastPlacedTile.ty !== tile.ty) {
                const success = this._tryPlaceBeltAt(tile.tx, tile.ty);
                if (!success) {
                    // Не удалось поставить прямо – обрабатываем поворот или выход из углового
                    if (this.lastPlacedTile) {
                        const prev = this.getBuildingAt(this.lastPlacedTile.tx, this.lastPlacedTile.ty);
                        if (prev && prev.type === 'belt') {
                            if (prev.beltType === 0) {
                                // Превращаем предыдущий прямой в угловой
                                const dx = tile.tx - prev.tx;
                                const dy = tile.ty - prev.ty;
                                let newDir = null;
                                if (dx === 0 && dy === -1) newDir = 0;
                                else if (dx === 1 && dy === 0) newDir = 1;
                                else if (dx === 0 && dy === 1) newDir = 2;
                                else if (dx === -1 && dy === 0) newDir = 3;

                                if (newDir !== null && newDir !== prev.rotation) {
                                    const inDir = (prev.rotation + 2) % 4;
                                    prev.rotation = newDir;
                                    prev.beltType = getBeltTypeFromDirs(inDir, newDir);
                                    updateSurroundingBelts(prev.tx, prev.ty, this.game);
                                    // Теперь пробуем поставить конвейер в новой клетке
                                    if (!this.getBuildingAt(tile.tx, tile.ty) || this.getBuildingAt(tile.tx, tile.ty).type === 'belt') {
                                        this._tryPlaceBeltAt(tile.tx, tile.ty);
                                    }
                                }
                            } else {
                                // Предыдущий уже угловой – ставим прямой конвейер в направлении движения
                                const dx = tile.tx - prev.tx;
                                const dy = tile.ty - prev.ty;
                                let dir = 0;
                                if (dx === 0 && dy === -1) dir = 0;
                                else if (dx === 1 && dy === 0) dir = 1;
                                else if (dx === 0 && dy === 1) dir = 2;
                                else if (dx === -1 && dy === 0) dir = 3;
                                const newBelt = new Building(tile.tx, tile.ty, 'belt', dir);
                                newBelt.beltType = 0;
                                if (!this.getBuildingAt(tile.tx, tile.ty)) {
                                    this.buildings.push(newBelt);
                                    updateSurroundingBelts(tile.tx, tile.ty, this.game);
                                    this.lastPlacedTile = { tx: tile.tx, ty: tile.ty };
                                }
                            }
                        }
                    }
                }
            }
        } else if (this.isLeftMouseDown && this.game.selectedType && this.game.selectedType !== 'belt') {
            const worldPos = this.game.camera.screenToWorld(this.lastMouseX, this.lastMouseY);
            const tile = this.game.map.worldToTile(worldPos.x, worldPos.y);
            if (!this.lastPlacedTile || this.lastPlacedTile.tx !== tile.tx || this.lastPlacedTile.ty !== tile.ty) {
                this._tryPlace();
            }
        }
    }

    tryPlace() { return this._tryPlace(); }

    getBuildingAt(tx, ty) {
        for (const b of this.buildings) {
            const size = b.getSize();
            if (tx >= b.tx && tx < b.tx + size.w && ty >= b.ty && ty < b.ty + size.h) return b;
        }
        return null;
    }

    render(ctx, camera) {
        const tileSize = this.game.map.tileSize;
        for (const b of this.buildings) {
            if (b.type === 'belt') b.animationFrame = this.beltAnimFrame;
        }
        for (const b of this.buildings) {
            const module = BUILDING_MODULES[b.type];
            if (module) {
                ctx.save();
                module.render(ctx, b, tileSize, false, this.game);
                ctx.restore();
            } else {
                const x = b.tx * tileSize;
                const y = b.ty * tileSize;
                ctx.fillStyle = '#ff00ff';
                ctx.fillRect(x, y, tileSize, tileSize);
            }
        }

        if (this.ghost.visible && this.game.selectedType) {
            const module = BUILDING_MODULES[this.game.selectedType];
            if (module) {
                ctx.save();
                ctx.globalAlpha = 0.6;
                module.render(ctx, this.ghost, tileSize, true, this.game);
                ctx.restore();
            }
        }
    }
}