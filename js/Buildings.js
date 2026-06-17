import { spriteRenderer } from './SpriteRenderer.js';

export class Building {
    constructor(tx, ty, type, rotation = 0) {
        this.tx = tx;
        this.ty = ty;
        this.type = type;
        this.rotation = rotation;
        this.animationFrame = 0;
        this.animationTimer = 0;
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
        if (this.type === 'hub') return { w: 4, h: 4 };
        return { w: 1, h: 1 };
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
        this.lastPlacedTile = null; // для drag placement
        
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
        
        // Обновляем призрак каждый тик (пункт 5)
        this._updateGhostFromLastMouse();
        
        // Массовое удаление при зажатой ПКМ (пункт 7)
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
    }

    setMousePosition(x, y) {
        this.lastMouseX = x;
        this.lastMouseY = y;
    }

    rotateGhost() {
        if (this.game.selectedType && this.ghost.visible) {
            this.ghost.rotation = (this.ghost.rotation + 1) % 4;
        }
    }

    // Пипетка (Q) - копирует тип здания под курсором (пункт 2)
    pipette() {
        const worldPos = this.game.camera.screenToWorld(this.lastMouseX, this.lastMouseY);
        const tile = this.game.map.worldToTile(worldPos.x, worldPos.y);
        const b = this.getBuildingAt(tile.tx, tile.ty);
        
        if (b && b.type !== 'hub') {
            this.game.selectedType = b.type;
            this.ghost.rotation = b.rotation;
            this.game.hud.updateActiveButton();
            return true;
        }
        return false;
    }

    // Удаление здания под курсором (пункт 7)
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
            // Если есть выбор - отменяем его (пункт 6)
            this.game.selectedType = null;
            this.ghost.visible = false;
            this.game.hud.updateActiveButton();
        } else {
            // Если нет выбора - удаляем здание (пункт 7)
            this._deleteUnderCursor();
        }
    }

    onRightMouseUp() {
        this.isRightMouseDown = false;
    }

    // Drag placement для конвейеров (пункт 3)
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
            spriteRenderer.drawBelt(ctx, x, y, w, b.rotation, b.animationFrame);
        } 
        else if (b.type === 'extractor') {
            spriteRenderer.drawBuilding(ctx, x, y, w, 'miner', b.rotation);
        } 
        else if (b.type === 'hub') {
            spriteRenderer.drawBuilding(ctx, x, y, w, 'hub', 0);
        }
        else if (b.type === 'cutter') {
            spriteRenderer.drawBuilding(ctx, x, y, w, 'cutter', b.rotation);
        }
        else if (b.type === 'rotator') {
            spriteRenderer.drawBuilding(ctx, x, y, w, 'rotater', b.rotation);
        }
        else if (b.type === 'mixer') {
            spriteRenderer.drawBuilding(ctx, x, y, w, 'mixer', b.rotation);
        }
        else if (b.type === 'stacker') {
            spriteRenderer.drawBuilding(ctx, x, y, w, 'stacker', b.rotation);
        }
        else if (b.type === 'painter') {
            spriteRenderer.drawBuilding(ctx, x, y, w, 'painter', b.rotation);
        }
        else if (b.type === 'trash') {
            spriteRenderer.drawBuilding(ctx, x, y, w, 'trash', b.rotation);
        }
        else if (b.type === 'storage') {
            spriteRenderer.drawBuilding(ctx, x, y, w, 'storage', 0);
        }
        else if (b.type === 'underground_belt') {
            spriteRenderer.drawBuilding(ctx, x, y, w, 'underground_belt_entry', b.rotation);
        }
        else if (b.type === 'balancer') {
            spriteRenderer.drawBuilding(ctx, x, y, w, 'balancer', b.rotation);
        }
        else if (b.type === 'splitter') {
            spriteRenderer.drawBuilding(ctx, x, y, w, 'balancer-splitter', b.rotation);
        }
        else if (b.type === 'tunnel') {
            spriteRenderer.drawBuilding(ctx, x, y, w, 'underground_belt_entry', b.rotation);
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