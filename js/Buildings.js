// Buildings.js
import { spriteRenderer } from './SpriteRenderer.js';

export const BUILDING_SIZES = {
    'belt': { w: 1, h: 1 },
    'tunnel': { w: 1, h: 1 },
    'extractor': { w: 1, h: 1 },
    'cutter': { w: 2, h: 1 },
    'rotator': { w: 1, h: 1 },
    'mixer': { w: 2, h: 1 },
    'splitter': { w: 1, h: 1 },
    'balancer': { w: 2, h: 1 },
    'storage': { w: 2, h: 2 },
    'trash': { w: 1, h: 1 },
    'hub': { w: 4, h: 4 }
};

export class Building {
    constructor(tx, ty, type, rotation = 0) {
        this.tx = tx;
        this.ty = ty;
        this.type = type;
        this.rotation = rotation;
        this.animationFrame = 0;
        this.animationTimer = 0;
        this.beltType = 0; // 0=forward, 1=left, 2=right
    }

    update(dt) {
        if (this.type === 'belt') {
            this.animationTimer += dt;
            if (this.animationTimer >= 0.07) {
                this.animationTimer = 0;
                this.animationFrame = (this.animationFrame + 1) % 14;
            }
        }
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
        this._initGhost();
    }

    _initGhost() {
        this.ghost = new Building(0, 0, 'belt', 0);
        this.ghost.visible = false;
    }

    update(dt) {
        for (const b of this.buildings) {
            b.update(dt);
        }
        this._updateGhostFromLastMouse();
        if (this.isRightMouseDown && !this.game.selectedType) {
            this._deleteUnderCursor();
        }
    }

    _updateGhostFromLastMouse() {
        if (!this.game.selectedType) {
            this.ghost.visible = false;
            return;
        }
        const worldPos = this.game.camera.screenToWorld(this.lastMouseX, this.lastMouseY);
        const tile = this.game.map.worldToTile(worldPos.x, worldPos.y);
        this.ghost.tx = tile.tx;
        this.ghost.ty = tile.ty;
        this.ghost.type = this.game.selectedType;
        this.ghost.visible = true;
        
        if (this.game.selectedType === 'belt') {
            this.ghost.rotation = this._calculateOptimalBeltRotation(tile.tx, tile.ty);
            this.ghost.beltType = this._calculateBeltType(tile.tx, tile.ty, this.ghost.rotation);
        }
    }

    _calculateBeltType(tx, ty, rotation) {
        const neighbors = this._getBeltNeighborInfo(tx, ty);
        
        if (neighbors.inputFrom === null && neighbors.outputTo === null) {
            return 0; // Изолированный - прямой
        }
        
        if (neighbors.inputFrom !== null && neighbors.outputTo !== null) {
            const inputDir = neighbors.inputFrom;
            const outputDir = neighbors.outputTo;
            
            // Если вход и выход противоположны - прямой
            if ((inputDir + 2) % 4 === outputDir) {
                return 0; // forward
            }
            
            // Определяем тип поворота
            // rotation - направление ВЫХОДА конвейера
            // inputDir - с какой стороны входит
            const diff = (outputDir - inputDir + 4) % 4;
            
            if (diff === 1) {
                // Поворот направо (по часовой)
                return 2; // right
            } else if (diff === 3) {
                // Поворот налево (против часовой)
                return 1; // left
            }
        }
        
        return 0; // По умолчанию прямой
    }

    _calculateOptimalBeltRotation(tx, ty) {
        const neighbors = this._getBeltNeighborInfo(tx, ty);
        
        if (neighbors.inputFrom !== null && neighbors.outputTo !== null) {
            return this._determineBeltRotation(neighbors.inputFrom, neighbors.outputTo);
        }
        
        if (neighbors.inputFrom !== null) {
            return (neighbors.inputFrom + 2) % 4;
        }
        
        if (neighbors.outputTo !== null) {
            return neighbors.outputTo;
        }
        
        return 0;
    }

    
    _getBeltNeighborInfo(tx, ty) {
        const result = {
            inputFrom: null,
            outputTo: null
        };
        
        const directions = [
            { dx: 0, dy: -1, dir: 0 },  // top
            { dx: 1, dy: 0, dir: 1 },   // right
            { dx: 0, dy: 1, dir: 2 },   // bottom
            { dx: -1, dy: 0, dir: 3 }   // left
        ];
        
        for (const { dx, dy, dir } of directions) {
            const neighborTx = tx + dx;
            const neighborTy = ty + dy;
            const neighbor = this.getBuildingAt(neighborTx, neighborTy);
            
            if (!neighbor) continue;
            
            // Если сосед - конвейер
            if (neighbor.type === 'belt') {
                const neighborOutputDir = neighbor.rotation;
                const directionToUs = (dir + 2) % 4;
                if (neighborOutputDir === directionToUs) {
                    result.inputFrom = dir;
                }
            }
            
            // Если сосед - здание, выдающее в нашу сторону
            if (this._buildingOutputsTo(neighbor, tx, ty)) {
                result.inputFrom = dir;
            }
            
            // Если сосед - здание, принимающее с нашей стороны
            if (this._buildingAcceptsFrom(neighbor, tx, ty, dir)) {
                result.outputTo = dir;
            }
        }
        
        return result;
    }

    _buildingOutputsTo(building, targetTx, targetTy) {
        if (building.type === 'extractor' || building.type === 'belt') {
            const outputDir = building.rotation;
            const outputDx = [0, 1, 0, -1][outputDir];
            const outputDy = [-1, 0, 1, 0][outputDir];
            return (building.tx + outputDx === targetTx && building.ty + outputDy === targetTy);
        }
        return false;
    }

    _buildingAcceptsFrom(building, sourceTx, sourceTy, dir) {
        if (['cutter', 'rotator', 'mixer', 'storage'].includes(building.type)) {
            const inputDir = (building.rotation + 2) % 4;
            const sourceDir = (dir + 2) % 4;
            return inputDir === sourceDir;
        }
        return false;
    }

    _determineBeltRotation(inputFrom, outputTo) {
        // Если вход и выход противоположны - прямой конвейер
        if ((inputFrom + 2) % 4 === outputTo) {
            return outputTo;
        }
        
        // Для поворотов - конвейер смотрит в сторону выхода
        return outputTo;
    }

    setMousePosition(x, y) {
        this.lastMouseX = x;
        this.lastMouseY = y;
    }

    rotateGhost() {
        if (this.ghost.visible) {
            this.ghost.rotation = (this.ghost.rotation + 1) % 4;
            if (this.ghost.type === 'belt') {
                this.ghost.beltType = this._calculateBeltType(this.ghost.tx, this.ghost.ty, this.ghost.rotation);
            }
        }
    }

    pipette() {
        const worldPos = this.game.camera.screenToWorld(this.lastMouseX, this.lastMouseY);
        const tile = this.game.map.worldToTile(worldPos.x, worldPos.y);
        const b = this.getBuildingAt(tile.tx, tile.ty);
        if (b && b.type !== 'hub') {
            this.game.selectedType = b.type;
            this.ghost.rotation = b.rotation;
            this.ghost.beltType = b.beltType;
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
        }
    }

    onLeftMouseDown() {
        this.isLeftMouseDown = true;
        this.lastPlacedTile = null;
        this._tryPlace();
    }

    onLeftMouseUp() {
        this.isLeftMouseDown = false;
        this.lastPlacedTile = null;
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
    }

    onRightMouseUp() {
        this.isRightMouseDown = false;
    }

    onMouseMove() {
        if (this.isLeftMouseDown && this.game.selectedType === 'belt') {
            const worldPos = this.game.camera.screenToWorld(this.lastMouseX, this.lastMouseY);
            const tile = this.game.map.worldToTile(worldPos.x, worldPos.y);
            if (!this.lastPlacedTile ||
                this.lastPlacedTile.tx !== tile.tx ||
                this.lastPlacedTile.ty !== tile.ty) {
                this._tryPlace();
            }
        }
    }

    _tryPlace() {
        if (!this.ghost.visible) return false;
        
        const size = this.ghost.getSize();
        const worldPos = this.game.camera.screenToWorld(this.lastMouseX, this.lastMouseY);
        const tile = this.game.map.worldToTile(worldPos.x, worldPos.y);
        const targetTx = tile.tx;
        const targetTy = tile.ty;
        
        for (let dx = 0; dx < size.w; dx++) {
            for (let dy = 0; dy < size.h; dy++) {
                if (this.getBuildingAt(targetTx + dx, targetTy + dy)) {
                    return false;
                }
            }
        }
        
        if (this.ghost.type === 'extractor') {
            if (!this.game.map.getVeinAt(targetTx, targetTy)) {
                return false;
            }
        }
        
        const newBuilding = new Building(
            targetTx,
            targetTy,
            this.ghost.type,
            this.ghost.rotation
        );
        
        if (this.ghost.type === 'belt') {
            newBuilding.beltType = this.ghost.beltType;
        }
        
        this.buildings.push(newBuilding);
        this.lastPlacedTile = { tx: targetTx, ty: targetTy };
        return true;
    }

    tryPlace() {
        return this._tryPlace();
    }

    getBuildingAt(tx, ty) {
        for (const b of this.buildings) {
            const size = b.getSize();
            if (tx >= b.tx && tx < b.tx + size.w && ty >= b.ty && ty < b.ty + size.h) {
                return b;
            }
        }
        return null;
    }

    render(ctx, camera) {
        const tileSize = this.game.map.tileSize;
        for (const b of this.buildings) {
            this._drawBuilding(ctx, b, tileSize, false);
        }
        if (this.ghost.visible && this.game.selectedType) {
            this._drawBuilding(ctx, this.ghost, tileSize, true);
        }
    }

    _drawBuilding(ctx, b, tileSize, isGhost) {
        const x = b.tx * tileSize;
        const y = b.ty * tileSize;
        const size = b.getSize();
        const w = size.w * tileSize;
        const h = size.h * tileSize;
        
        ctx.save();
        if (isGhost) ctx.globalAlpha = 0.6;
        
        if (b.type === 'belt') {
            spriteRenderer.drawBelt(ctx, x, y, tileSize, b.rotation, b.animationFrame, b.beltType);
        }
        else if (b.type === 'extractor') {
            spriteRenderer.drawBuilding(ctx, x, y, w, h, 'miner', b.rotation);
        }
        else if (b.type === 'hub') {
            spriteRenderer.drawBuilding(ctx, x, y, w, h, 'hub', 0);
        }
        else if (b.type === 'cutter') {
            spriteRenderer.drawBuilding(ctx, x, y, w, h, 'cutter', b.rotation);
        }
        else if (b.type === 'rotator') {
            spriteRenderer.drawBuilding(ctx, x, y, w, h, 'rotater', b.rotation);
        }
        else if (b.type === 'mixer') {
            spriteRenderer.drawBuilding(ctx, x, y, w, h, 'mixer', b.rotation);
        }
        else if (b.type === 'splitter') {
            spriteRenderer.drawBuilding(ctx, x, y, w, h, 'balancer-splitter', b.rotation);
        }
        else if (b.type === 'balancer') {
            spriteRenderer.drawBuilding(ctx, x, y, w, h, 'balancer', b.rotation);
        }
        else if (b.type === 'storage') {
            spriteRenderer.drawBuilding(ctx, x, y, w, h, 'storage', 0);
        }
        else if (b.type === 'trash') {
            spriteRenderer.drawBuilding(ctx, x, y, w, h, 'trash', b.rotation);
        }
        else if (b.type === 'tunnel') {
            spriteRenderer.drawBuilding(ctx, x, y, w, h, 'underground_belt_entry', b.rotation);
        }
        else {
            ctx.fillStyle = '#8898A5';
            ctx.fillRect(x, y, w, h);
            ctx.strokeStyle = '#5A6B7A';
            ctx.lineWidth = 2;
            ctx.strokeRect(x, y, w, h);
        }
        
        ctx.restore();
    }
}