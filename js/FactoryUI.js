// js/FactoryUI.js
import { RESOURCE_COLORS } from './resources.js';
import { drawParticle } from './ParticleRenderer.js';

export class FactoryUI {
    constructor(game) {
        this.game = game;
        this.activeFactory = null;
        this.visible = false;
        this.slotSize = 56;
        this.padding = 10;
    }

    open(building) {
        const ports = building.getItemPorts();
        if (!ports || ports.length === 0) return false;
        this.activeFactory = building;
        this.visible = true;
        return true;
    }

    close() {
        this.activeFactory = null;
        this.visible = false;
    }

    /** Проверяет, не удалено ли здание, и закрывает UI если что */
    closeIfInvalid() {
        if (!this.visible || !this.activeFactory) return;
        const stillExists = this.game.buildingManager.buildings.includes(this.activeFactory);
        if (!stillExists) {
            this.close();
        }
    }

    hitTest(worldX, worldY) {
        if (!this.visible || !this.activeFactory) return false;
        const rect = this._getRect();
        return worldX >= rect.x && worldX <= rect.x + rect.w &&
               worldY >= rect.y && worldY <= rect.y + rect.h;
    }

    onClick(worldX, worldY) {
        if (!this.hitTest(worldX, worldY)) return false;

        const factory = this.activeFactory;
        const config = factory._factoryConfig;
        if (!config) return true;

        // Кнопка смены рецепта (если есть несколько рецептов)
        if (config.recipes && Object.keys(config.recipes).length > 1) {
            const rect = this._getRect();
            const btnW = 80, btnH = 22;
            const btnX = rect.x + rect.w / 2 - btnW / 2;
            const btnY = rect.y + rect.h - btnH - 6;
            if (worldX >= btnX && worldX <= btnX + btnW &&
                worldY >= btnY && worldY <= btnY + btnH) {
                if (config.changeMode) {
                    config.changeMode.call(factory, factory, this.game, false);
                }
                return true;
            }
        }

        return true; // клик внутри окна, но не по кнопке
    }

    _getRect() {
        const b = this.activeFactory;
        if (!b) return { x: 0, y: 0, w: 0, h: 0 };
        const tileSize = this.game.map.tileSize;
        const size = b.getSize();
        const cx = (b.tx + size.w / 2) * tileSize;
        const cy = (b.ty + size.h / 2) * tileSize;

        const ports = b.getItemPorts();
        const inputPorts = ports.filter(p => p.type === 'in' || p.accepts);
        const outputPorts = ports.filter(p => p.type === 'out' || p.produces);

        // Считаем максимальное количество слотов в ряду (влезает в экран?)
        const maxSlots = Math.max(inputPorts.length, outputPorts.length);
        const totalWidth = maxSlots * (this.slotSize + this.padding) + this.padding;
        const rows = 1; // пока в один ряд
        const totalHeight = this.slotSize + this.padding * 2 + 50; // слоты + заголовок + кнопка

        return {
            x: cx - totalWidth / 2,
            y: cy - totalHeight - 20,
            w: totalWidth,
            h: totalHeight
        };
    }

    render(ctx) {
        if (!this.visible || !this.activeFactory) return;

        const b = this.activeFactory;
        const config = b._factoryConfig;
        const ports = b.getItemPorts();
        const inputPorts = ports.filter(p => p.type === 'in' || p.accepts);
        const outputPorts = ports.filter(p => p.type === 'out' || p.produces);
        const rect = this._getRect();

        // Фон
        ctx.fillStyle = 'rgba(0, 0, 0, 0.8)';
        ctx.fillRect(rect.x - 4, rect.y - 4, rect.w + 8, rect.h + 8);
        ctx.fillStyle = '#1e2a3a';
        ctx.fillRect(rect.x, rect.y, rect.w, rect.h);
        ctx.strokeStyle = '#6699cc';
        ctx.lineWidth = 2;
        ctx.strokeRect(rect.x, rect.y, rect.w, rect.h);

        // Заголовок
        ctx.fillStyle = '#fff';
        ctx.font = 'bold 13px "Segoe UI"';
        ctx.textAlign = 'center';
        ctx.fillText(b.type, rect.x + rect.w / 2, rect.y + 18);

        // Кнопка смены рецепта
        if (config && config.recipes && Object.keys(config.recipes).length > 1) {
            const btnW = 80, btnH = 22;
            const btnX = rect.x + rect.w / 2 - btnW / 2;
            const btnY = rect.y + rect.h - btnH - 6;
            ctx.fillStyle = '#3a4a5a';
            ctx.fillRect(btnX, btnY, btnW, btnH);
            ctx.strokeStyle = '#5a6a7a';
            ctx.strokeRect(btnX, btnY, btnW, btnH);
            ctx.fillStyle = '#fff';
            ctx.font = '10px "Segoe UI"';
            ctx.textAlign = 'center';
            ctx.fillText('🔄 Рецепт', btnX + btnW / 2, btnY + 15);
        }

        const startY = rect.y + 35;
        const startX = rect.x + this.padding;

        // Входные слоты
        inputPorts.forEach((port, i) => {
            const slotX = startX + i * (this.slotSize + this.padding);
            const slotY = startY;
            ctx.fillStyle = '#2a3a4a';
            ctx.fillRect(slotX, slotY, this.slotSize, this.slotSize);
            ctx.strokeStyle = '#4a5a6a';
            ctx.strokeRect(slotX, slotY, this.slotSize, this.slotSize);

            if (port.accepts && port.accepts.length === 1) {
                const res = port.accepts[0];
                drawParticle(ctx, slotX + this.slotSize / 2, slotY + this.slotSize / 2, this.slotSize * 0.3, res, 0);
            }
            if (b.inputResources && port.accepts) {
                const amount = b.inputResources[port.accepts[0]] || 0;
                ctx.fillStyle = '#fff';
                ctx.font = '11px "Segoe UI"';
                ctx.textAlign = 'right';
                ctx.fillText(amount, slotX + this.slotSize - 5, slotY + this.slotSize - 5);
            }
        });

        // Выходные слоты – правее, с отступом
        const outputStartX = rect.x + rect.w - this.padding - outputPorts.length * (this.slotSize + this.padding) + this.padding;
        outputPorts.forEach((port, i) => {
            const slotX = outputStartX + i * (this.slotSize + this.padding);
            const slotY = startY;
            ctx.fillStyle = '#2a3a4a';
            ctx.fillRect(slotX, slotY, this.slotSize, this.slotSize);
            ctx.strokeStyle = '#4a5a6a';
            ctx.strokeRect(slotX, slotY, this.slotSize, this.slotSize);

            if (port.produces) {
                const res = port.produces;
                drawParticle(ctx, slotX + this.slotSize / 2, slotY + this.slotSize / 2, this.slotSize * 0.3, res, 0);
                const amount = b.outputResources?.[res] || 0;
                ctx.fillStyle = '#fff';
                ctx.font = '11px "Segoe UI"';
                ctx.textAlign = 'right';
                ctx.fillText(amount, slotX + this.slotSize - 5, slotY + this.slotSize - 5);
            }
        });
    }
}