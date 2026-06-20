// js/UIManager.js
import { drawParticle } from './ParticleRenderer.js';

export class UIManager {
    constructor(game) {
        this.game = game;
        this.activeNode = null;
        this.slotSize = 48;
        this.padding = 8;
        this.cols = 3;
        this.rows = 4;
        this.dragging = null;
    }

    openNodeUI(node) { this.activeNode = node; }
    closeUI() { this.activeNode = null; }
    isUIOpen() { return this.activeNode !== null; }

    isPointInsideUI(worldX, worldY) {
        if (!this.activeNode) return false;
        const rect = this._getUIRect(this.activeNode);
        return worldX >= rect.x && worldX <= rect.x + rect.w &&
               worldY >= rect.y && worldY <= rect.y + rect.h;
    }

    getSlotIndexAt(worldX, worldY) {
        if (!this.activeNode) return -1;
        const node = this.activeNode;
        const rect = this._getUIRect(node);
        const resources = node.resources || {};
        const keys = Object.keys(resources);
        for (let i = 0; i < keys.length; i++) {
            const col = i % this.cols;
            const row = Math.floor(i / this.cols);
            const slotX = rect.x + this.padding + col * (this.slotSize + this.padding);
            const slotY = rect.y + 30 + this.padding + row * (this.slotSize + this.padding);
            if (worldX >= slotX && worldX <= slotX + this.slotSize &&
                worldY >= slotY && worldY <= slotY + this.slotSize) {
                return i;
            }
        }
        return -1;
    }

    // Обработка клика левой кнопкой (теперь только для перетаскивания)
    handleClick(worldX, worldY) {
        if (!this.activeNode) return false;
        if (!this.isPointInsideUI(worldX, worldY)) {
            this.closeUI();
            return true;
        }
        return true;
    }

    // Удаление по правой кнопке
    onRightClick(worldX, worldY) {
        if (!this.activeNode) return;
        const idx = this.getSlotIndexAt(worldX, worldY);
        if (idx >= 0) {
            const keys = Object.keys(this.activeNode.resources);
            const key = keys[idx];
            if (this.activeNode.resources[key]) {
                this.activeNode.resources[key] = Math.max(0, (this.activeNode.resources[key] || 0) - 100);
                if (this.activeNode.resources[key] <= 0) delete this.activeNode.resources[key];
                if (Object.keys(this.activeNode.resources).length === 0) this.closeUI();
            }
        }
    }

    onMouseDown(worldX, worldY) {
        if (!this.activeNode) return false;
        const idx = this.getSlotIndexAt(worldX, worldY);
        if (idx >= 0) {
            const keys = Object.keys(this.activeNode.resources);
            this.dragging = { index: idx, key: keys[idx] };
            return true;
        }
        return false;
    }

    onMouseUp(worldX, worldY) {
        if (this.dragging) {
            const drag = this.dragging;
            this.dragging = null;
            const currentIdx = this.getSlotIndexAt(worldX, worldY);
            if (currentIdx !== drag.index) {
                if (this.activeNode.resources && this.activeNode.resources[drag.key]) {
                    this.activeNode.resources[drag.key] = Math.max(0, (this.activeNode.resources[drag.key] || 0) - 100);
                    if (this.activeNode.resources[drag.key] <= 0) delete this.activeNode.resources[drag.key];
                }
            }
            return true;
        }
        return false;
    }

    _getUIRect(node) {
        const tileSize = this.game.map.tileSize;
        const resources = node.resources || {};
        const keys = Object.keys(resources);
        const numSlots = Math.min(keys.length, this.cols * this.rows);
        const uiWidth = this.cols * (this.slotSize + this.padding) + this.padding;
        const uiHeight = Math.ceil(numSlots / this.cols) * (this.slotSize + this.padding) + 40;
        const x = node.tx * tileSize + tileSize - uiWidth / 2;
        const y = node.ty * tileSize + tileSize - uiHeight / 2 - 50;
        return { x, y, w: uiWidth, h: uiHeight };
    }

    render(ctx) {
        if (!this.activeNode) return;
        const node = this.activeNode;
        const rect = this._getUIRect(node);
        const resources = node.resources || {};
        const keys = Object.keys(resources);
        const numSlots = Math.min(keys.length, this.cols * this.rows);

        ctx.fillStyle = 'rgba(0, 0, 0, 0.5)';
        ctx.fillRect(rect.x - 10, rect.y - 10, rect.w + 20, rect.h + 20);
        ctx.fillStyle = '#1e2a3a';
        ctx.fillRect(rect.x, rect.y, rect.w, rect.h);
        ctx.strokeStyle = '#6699cc';
        ctx.lineWidth = 2;
        ctx.strokeRect(rect.x, rect.y, rect.w, rect.h);

        ctx.fillStyle = '#fff';
        ctx.font = 'bold 14px "Segoe UI"';
        ctx.textAlign = 'center';
        ctx.fillText('Узел', rect.x + rect.w / 2, rect.y + 20);

        const mouseWorld = this.game.camera.screenToWorld(this.game.lastMouseX, this.game.lastMouseY);
        const hoveredIdx = this.getSlotIndexAt(mouseWorld.x, mouseWorld.y);

        for (let i = 0; i < numSlots; i++) {
            const key = keys[i];
            const col = i % this.cols;
            const row = Math.floor(i / this.cols);
            const slotX = rect.x + this.padding + col * (this.slotSize + this.padding);
            const slotY = rect.y + 30 + this.padding + row * (this.slotSize + this.padding);

            ctx.fillStyle = '#2a3a4a';
            ctx.fillRect(slotX, slotY, this.slotSize, this.slotSize);
            ctx.strokeStyle = '#4a5a6a';
            ctx.strokeRect(slotX, slotY, this.slotSize, this.slotSize);

            if (hoveredIdx === i) {
                ctx.strokeStyle = '#00ff00';
                ctx.lineWidth = 2;
                ctx.strokeRect(slotX, slotY, this.slotSize, this.slotSize);
                ctx.lineWidth = 1;
            }

            drawParticle(ctx, slotX + this.slotSize / 2, slotY + this.slotSize / 2, this.slotSize * 0.3, key, 0);
            ctx.fillStyle = '#fff';
            ctx.font = '10px "Segoe UI"';
            ctx.textAlign = 'right';
            ctx.fillText(resources[key], slotX + this.slotSize - 4, slotY + this.slotSize - 4);
        }
    }
}