// Buildings.js
import { drawPlacementGrid } from './PlacementUtils.js';
import { quantumResonatorBuilding } from './buildings/quantum_resonator.js';
import { gluonExtractorBuilding } from './buildings/gluon_extractor.js';
import { leptonExtractorBuilding } from './buildings/lepton_extractor.js';
import { nodeBuilding } from './buildings/node.js';
import { connectorBuilding } from './buildings/connector.js';
import { connectorEnergyBuilding } from './buildings/connector_energy.js';
import { hadronSynthesizerBuilding } from './buildings/hadron_synthesizer.js';
import { electronCaptureBuilding } from './buildings/electron_capture.js';
import { fusionPressBuilding } from './buildings/fusion_press.js';
import { energyBufferBuilding } from './buildings/energy_buffer.js';
import { starBuilding } from './buildings/star.js';

const BUILDING_MODULES = {
    'quantum_resonator': quantumResonatorBuilding,
    'gluon_extractor': gluonExtractorBuilding,
    'lepton_extractor': leptonExtractorBuilding,
    'node': nodeBuilding,
    'connector': connectorBuilding,
    'connector_energy': connectorEnergyBuilding,
    'hadron_synthesizer': hadronSynthesizerBuilding,
    'electron_capture': electronCaptureBuilding,
    'fusion_press': fusionPressBuilding,
    'energy_buffer': energyBufferBuilding,
    'star': starBuilding,
};

export const BUILDING_SIZES = Object.fromEntries(
    Object.entries(BUILDING_MODULES).map(([type, mod]) => [type, mod.size])
);

export class Building {
    constructor(tx, ty, type, rotation = 0) {
        this.tx = tx; this.ty = ty; this.type = type; this.rotation = rotation;
        this.quarkType = 0; this.recipe = null; this.filterType = null;
        this.resources = {}; this.inputResources = {}; this.outputResources = {};
        this.timer = 0; this.craftTimer = 0;

        if (type === 'connector') this.filterType = 'u';
        else if (type === 'energy_buffer') this.filterType = 'energy';
        else if (type === 'connector_energy') this.filterType = null;
        else if (type === 'quantum_resonator') this.quarkType = 0;

        const mod = BUILDING_MODULES[type];
        if (mod && mod.initGhost) {
            mod.initGhost(this);
        }
    }
    getSize() {
        const base = BUILDING_SIZES[this.type] || { w: 1, h: 1 };
        if (this.rotation % 2 === 1 && base.w !== base.h) return { w: base.h, h: base.w };
        return base;
    }
}

export class BuildingManager {
    constructor(game) {
        this.game = game;
        this.buildings = [];
        this.ghost = null;
        this.lastMouseX = 0; this.lastMouseY = 0;
        this.isLeftMouseDown = false; this.isRightMouseDown = false;
        this.wireSource = null;
        this.wireModeActive = false;
        this._initGhost();

        this.lastPlacedTile = null;
        this.isDragging = false;
        this.pendingFirstTile = null;
    }
    _initGhost() {
        this.ghost = new Building(0, 0, 'quantum_resonator', 0);
        this.ghost.visible = false;
    }
    update(dt) {
        for (const b of this.buildings) {
            const mod = BUILDING_MODULES[b.type];
            if (mod && mod.update) mod.update(b, this.game, dt);
        }
        if (this.isRightMouseDown && !this.game.selectedType) this._deleteUnderCursor();
        this._updateGhostFromLastMouse();
    }
    _updateGhostFromLastMouse() {
        if (!this.game.selectedType || this.game.selectedType === 'wire') { this.ghost.visible = false; return; }
        const wp = this.game.camera.screenToWorld(this.lastMouseX, this.lastMouseY);
        const tile = this.game.map.worldToTile(wp.x, wp.y);
        this.ghost.tx = tile.tx; this.ghost.ty = tile.ty;
        this.ghost.type = this.game.selectedType; this.ghost.visible = true;

        const mod = BUILDING_MODULES[this.game.selectedType];
        if (mod && mod.initGhost) {
            mod.initGhost(this.ghost);
        }
    }

    isPlacementValid(tx, ty, type) {
        if (type === 'quantum_resonator') {
            const count = this.buildings.filter(b => b.type === 'quantum_resonator').length;
            if (count >= 10) return false;
        }
        const size = BUILDING_SIZES[type] || { w: 1, h: 1 };
        for (let dx = 0; dx < size.w; dx++)
            for (let dy = 0; dy < size.h; dy++)
                if (this.getBuildingAt(tx + dx, ty + dy)) return false;
        return true;
    }

    _tryPlaceAt(tx, ty) {
        if (!this.ghost.visible || this.game.selectedType === 'wire') return false;

        const existing = this.getBuildingAt(tx, ty);
        // Разрешаем замену, если оба типа являются коннекторами (обычный или энерго)
        if (existing && (existing.type === 'connector' || existing.type === 'connector_energy') &&
            (this.ghost.type === 'connector' || this.ghost.type === 'connector_energy')) {
            this.buildings = this.buildings.filter(b => b !== existing);
            if (this.game.network) this.game.network.removeAllConnections(existing);
        } else if (existing) {
            return false; // занято другим зданием
        }

        if (!this.isPlacementValid(tx, ty, this.ghost.type)) return false;
        const size = this.ghost.getSize();
        const nb = new Building(tx, ty, this.ghost.type, this.ghost.rotation);
        nb.quarkType = this.ghost.quarkType || 0;
        nb.recipe = this.ghost.recipe;
        nb.filterType = this.ghost.filterType;
        this.buildings.push(nb);
        return true;
    }

    rotateBuildingUnderCursor(reverse = false) {
        const wp = this.game.camera.screenToWorld(this.lastMouseX, this.lastMouseY);
        const tile = this.game.map.worldToTile(wp.x, wp.y);
        const b = this.getBuildingAt(tile.tx, tile.ty);
        if (!b || b.type === 'star') return;
        const mod = BUILDING_MODULES[b.type];
        if (mod && mod.rotateGhost) {
            mod.rotateGhost(b, this.game, reverse);
        } else {
            b.rotation = (b.rotation + 1) % 4;
        }
    }

    rotateGhost(reverse = false) {
        if (!this.ghost.visible) return;
        const mod = BUILDING_MODULES[this.ghost.type];
        if (mod && mod.rotateGhost) mod.rotateGhost(this.ghost, this.game, reverse);
        else this.ghost.rotation = (this.ghost.rotation + 1) % 4;
    }

    setMousePosition(x, y) { this.lastMouseX = x; this.lastMouseY = y; }
    pipette() {
        const wp = this.game.camera.screenToWorld(this.lastMouseX, this.lastMouseY);
        const tile = this.game.map.worldToTile(wp.x, wp.y);
        const b = this.getBuildingAt(tile.tx, tile.ty);
        if (b && b.type !== 'star') {
            this.game.selectedType = b.type;
            this.ghost.rotation = b.rotation;
            this.ghost.quarkType = b.quarkType || 0;
            this.ghost.recipe = b.recipe;
            this.ghost.filterType = b.filterType;
            this.game.hud.updateActiveButton();
            return true;
        }
        return false;
    }

    _deleteUnderCursor() {
        const wp = this.game.camera.screenToWorld(this.lastMouseX, this.lastMouseY);
        const tile = this.game.map.worldToTile(wp.x, wp.y);
        const b = this.getBuildingAt(tile.tx, tile.ty);
        if (b && b.type !== 'star') {
            if (this.game.input?.shiftKey) {
                this.game.network.removeAllConnections(b);
            } else {
                this.buildings = this.buildings.filter(x => x !== b);
                this.game.network.removeAllConnections(b);
            }
        } else if (!b) {
            const conn = this.game.network.findConnectionAt(wp.x, wp.y);
            if (conn) this.game.network.removeConnection(conn);
        }
    }

    onLeftMouseDown() {
        this.isLeftMouseDown = true;
        this.lastPlacedTile = null;
        this.isDragging = false;
        this.pendingFirstTile = null;

        if (this.game.selectedType === 'wire') {
            const wp = this.game.camera.screenToWorld(this.lastMouseX, this.lastMouseY);
            const tile = this.game.map.worldToTile(wp.x, wp.y);
            const target = this.getBuildingAt(tile.tx, tile.ty);

            if (target && target.type !== 'star') {
                if (!this.wireSource) {
                    this.wireSource = target;
                    this.wireModeActive = true;
                } else if (this.wireSource !== target) {
                    this.game.network.addConnection(this.wireSource, target);
                    this.wireSource = target;
                }
            } else {
                this.wireSource = null;
                this.wireModeActive = false;
            }
            return;
        }

        if (this.game.selectedType) {
            const wp = this.game.camera.screenToWorld(this.lastMouseX, this.lastMouseY);
            const tile = this.game.map.worldToTile(wp.x, wp.y);
            const existing = this.getBuildingAt(tile.tx, tile.ty);

            // Замена любого коннектора на выбранный (даже если тип отличается)
            if (existing && (existing.type === 'connector' || existing.type === 'connector_energy') &&
                (this.ghost.type === 'connector' || this.ghost.type === 'connector_energy')) {
                this.buildings = this.buildings.filter(b => b !== existing);
                if (this.game.network) this.game.network.removeAllConnections(existing);
                const nb = new Building(tile.tx, tile.ty, this.ghost.type, this.ghost.rotation);
                nb.filterType = this.ghost.filterType;
                this.buildings.push(nb);
                this.lastPlacedTile = { tx: tile.tx, ty: tile.ty };
                this.justPlaced = true;
                this.pendingFirstTile = null;
                this.isDragging = false;
                return;
            }

            if (existing) {
                this.pendingFirstTile = null;
                this.isDragging = false;
            } else {
                this.pendingFirstTile = { tx: tile.tx, ty: tile.ty };
                this.isDragging = true;
            }
        }
    }

    onLeftMouseUp() {
        if (this.pendingFirstTile && this.game.selectedType && this.game.selectedType !== 'wire') {
            const tile = this.pendingFirstTile;
            if (this.isPlacementValid(tile.tx, tile.ty, this.game.selectedType)) {
                this._tryPlaceAt(tile.tx, tile.ty);
            }
        }
        this.isLeftMouseDown = false;
        this.lastPlacedTile = null;
        this.isDragging = false;
        this.pendingFirstTile = null;
    }

    onRightMouseDown() {
        this.isRightMouseDown = true;
        if (this.game.selectedType === 'wire') {
            this.wireSource = null;
            this.wireModeActive = false;
        }
        if (this.game.selectedType) {
            this.game.selectedType = null; this.ghost.visible = false; this.wireSource = null;
            this.game.hud.updateActiveButton();
        } else this._deleteUnderCursor();
    }

    onRightMouseUp() {
        this.isRightMouseDown = false;
    }

    onMouseMove() {
        if (this.isLeftMouseDown && this.game.selectedType && this.game.selectedType !== 'wire') {
            const wp = this.game.camera.screenToWorld(this.lastMouseX, this.lastMouseY);
            const tile = this.game.map.worldToTile(wp.x, wp.y);

            if (this.pendingFirstTile && (tile.tx !== this.pendingFirstTile.tx || tile.ty !== this.pendingFirstTile.ty)) {
                const ftx = this.pendingFirstTile.tx;
                const fty = this.pendingFirstTile.ty;
                if (this.isPlacementValid(ftx, fty, this.game.selectedType)) {
                    this._tryPlaceAt(ftx, fty);
                    this.lastPlacedTile = { tx: ftx, ty: fty };
                }
                this.pendingFirstTile = null;
            }

            if (!this.lastPlacedTile || this.lastPlacedTile.tx !== tile.tx || this.lastPlacedTile.ty !== tile.ty) {
                // Разрешаем замену коннекторов при зажатой кнопке
                const existing = this.getBuildingAt(tile.tx, tile.ty);
                if (existing && (existing.type === 'connector' || existing.type === 'connector_energy') &&
                    (this.ghost.type === 'connector' || this.ghost.type === 'connector_energy')) {
                    this.buildings = this.buildings.filter(b => b !== existing);
                    if (this.game.network) this.game.network.removeAllConnections(existing);
                    const nb = new Building(tile.tx, tile.ty, this.ghost.type, this.ghost.rotation);
                    nb.filterType = this.ghost.filterType;
                    this.buildings.push(nb);
                    this.lastPlacedTile = { tx: tile.tx, ty: tile.ty };
                } else if (!existing && this.isPlacementValid(tile.tx, tile.ty, this.game.selectedType)) {
                    if (this._tryPlaceAt(tile.tx, tile.ty)) {
                        this.lastPlacedTile = { tx: tile.tx, ty: tile.ty };
                    }
                } else {
                    // Обновляем lastPlacedTile, чтобы не пытаться строить на том же месте
                    this.lastPlacedTile = { tx: tile.tx, ty: tile.ty };
                }
            }
        }
    }

    getBuildingAt(tx, ty) {
        for (const b of this.buildings) {
            const s = b.getSize();
            if (tx >= b.tx && tx < b.tx + s.w && ty >= b.ty && ty < b.ty + s.h) return b;
        }
        return null;
    }

    isBuildingVisible(b, view, tileSize) {
        const size = b.getSize();
        const x1 = b.tx * tileSize;
        const y1 = b.ty * tileSize;
        const x2 = x1 + size.w * tileSize;
        const y2 = y1 + size.h * tileSize;
        return !(x2 < view.x1 || x1 > view.x2 || y2 < view.y1 || y1 > view.y2);
    }

    render(ctx, camera) {
        const tileSize = this.game.map.tileSize;
        const view = camera.getVisibleRect();

        for (const b of this.buildings) {
            if (!this.isBuildingVisible(b, view, tileSize)) continue;
            const mod = BUILDING_MODULES[b.type];
            if (mod) { ctx.save(); mod.render(ctx, b, tileSize, false, this.game); ctx.restore(); }
            else {
                const x = b.tx * tileSize, y = b.ty * tileSize, s = b.getSize();
                ctx.fillStyle = '#ff00ff'; ctx.fillRect(x, y, s.w * tileSize, s.h * tileSize);
            }
        }

        if (this.ghost.visible && this.game.selectedType && this.game.selectedType !== 'wire') {
            const mod = BUILDING_MODULES[this.game.selectedType];
            if (mod) {
                ctx.save();
                const canPlace = this.isPlacementValid(this.ghost.tx, this.ghost.ty, this.ghost.type);
                drawPlacementGrid(ctx, this.ghost, tileSize, canPlace);
                mod.render(ctx, this.ghost, tileSize, true, this.game);
                ctx.restore();
            }
        }
    }
}