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
    }

    openNodeUI(node) {
        this.activeNode = node;
    }

    closeUI() {
        this.activeNode = null;
    }

    isUIOpen() {
        return this.activeNode !== null;
    }

    /** Проверяет, попадает ли точка (мировые координаты) в текущее UI-окно */
    isPointInsideUI(worldX, worldY) {
        if (!this.activeNode) return false;
        const rect = this._getUIRect(this.activeNode);
        return worldX >= rect.x && worldX <= rect.x + rect.w &&
               worldY >= rect.y && worldY <= rect.y + rect.h;
    }

    /** Обрабатывает клик. Возвращает true, если клик был обработан UI (игра не должна реагировать). */
    handleClick(worldX, worldY) {
        if (!this.activeNode) return false;
        const node = this.activeNode;
        const rect = this._getUIRect(node);

        // Если клик вне окна – закрываем и говорим, что обработали
        if (!this.isPointInsideUI(worldX, worldY)) {
            this.closeUI();
            return true;
        }

        // Проверяем крестики слотов
        if (node.resources) {
            const keys = Object.keys(node.resources);
            for (let i = 0; i < keys.length; i++) {
                const key = keys[i];
                const crossPos = this._getSlotCrossPosition(rect, i);
                if (worldX >= crossPos.x && worldX <= crossPos.x + 12 &&
                    worldY >= crossPos.y && worldY <= crossPos.y + 12) {
                    delete node.resources[key];
                    if (Object.keys(node.resources).length === 0) {
                        this.closeUI();
                    }
                    return true;
                }
            }
        }

        // Клик внутри окна, но не по крестику – ничего не делаем, но событие перехвачено
        return true;
    }

    /** Возвращает прямоугольник UI-окна в мировых координатах */
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

    /** Позиция крестика для i-го слота относительно rect окна */
    _getSlotCrossPosition(rect, i) {
        const col = i % this.cols;
        const row = Math.floor(i / this.cols);
        const slotX = rect.x + this.padding + col * (this.slotSize + this.padding);
        const slotY = rect.y + 30 + this.padding + row * (this.slotSize + this.padding);
        return { x: slotX + this.slotSize - 12, y: slotY };
    }

    /** Отрисовка UI */
    render(ctx) {
        if (!this.activeNode) return;
        const node = this.activeNode;
        const rect = this._getUIRect(node);
        const resources = node.resources || {};
        const keys = Object.keys(resources);
        const numSlots = Math.min(keys.length, this.cols * this.rows);

        // Полупрозрачный фон
        ctx.fillStyle = 'rgba(0, 0, 0, 0.5)';
        ctx.fillRect(rect.x - 10, rect.y - 10, rect.w + 20, rect.h + 20);

        // Основной контейнер
        ctx.fillStyle = '#1e2a3a';
        ctx.fillRect(rect.x, rect.y, rect.w, rect.h);
        ctx.strokeStyle = '#6699cc';
        ctx.lineWidth = 2;
        ctx.strokeRect(rect.x, rect.y, rect.w, rect.h);

        // Заголовок
        ctx.fillStyle = '#fff';
        ctx.font = 'bold 14px "Segoe UI"';
        ctx.textAlign = 'center';
        ctx.fillText('Узел', rect.x + rect.w / 2, rect.y + 20);

        // Слоты
        for (let i = 0; i < numSlots; i++) {
            const key = keys[i];
            const col = i % this.cols;
            const row = Math.floor(i / this.cols);
            const slotX = rect.x + this.padding + col * (this.slotSize + this.padding);
            const slotY = rect.y + 30 + this.padding + row * (this.slotSize + this.padding);

            // Фон слота
            ctx.fillStyle = '#2a3a4a';
            ctx.fillRect(slotX, slotY, this.slotSize, this.slotSize);
            ctx.strokeStyle = '#4a5a6a';
            ctx.strokeRect(slotX, slotY, this.slotSize, this.slotSize);

            // Иконка ресурса
            drawParticle(ctx, slotX + this.slotSize / 2, slotY + this.slotSize / 2, this.slotSize * 0.3, key, 0);

            // Количество
            ctx.fillStyle = '#fff';
            ctx.font = '10px "Segoe UI"';
            ctx.textAlign = 'right';
            ctx.fillText(resources[key], slotX + this.slotSize - 4, slotY + this.slotSize - 4);

            // Крестик удаления
            const crossPos = this._getSlotCrossPosition(rect, i);
            ctx.fillStyle = '#ff4444';
            ctx.font = 'bold 12px "Segoe UI"';
            ctx.textAlign = 'left';
            ctx.fillText('✕', crossPos.x, crossPos.y + 12);
        }
    }
}