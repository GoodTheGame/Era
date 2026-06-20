// js/FactoryUI.js
import { RESOURCE_COLORS } from './resources.js';
import { drawParticle } from './ParticleRenderer.js';
import { FactoryCore } from './factoryCore.js';

export class FactoryUI {
    constructor(game) {
        this.game = game;
        this.activeFactory = null;
        this.visible = false;
        this.slotSize = 56;
        this.padding = 10;
        this.groupGap = 40;
        this.selectingRecipe = false;
        this.dragging = null;
    }

    open(building) {
        if (building.type === 'quantum_resonator' ||
            building.type === 'gluon_extractor' ||
            building.type === 'lepton_extractor') {
            return false;
        }
        if (building.type === 'star') {
            this.activeFactory = building;
            this.visible = true;
            this.selectingRecipe = false;
            return true;
        }

        building._refreshPorts();
        const ports = building.getItemPorts();
        if (!ports || ports.length === 0) return false;

        const config = building._factoryConfig;
        if (config && config.recipes && !building.recipe) {
            this.selectingRecipe = true;
        } else {
            this.selectingRecipe = false;
        }

        this.activeFactory = building;
        this.visible = true;
        return true;
    }

    close() { this.activeFactory = null; this.visible = false; this.selectingRecipe = false; }
    closeIfInvalid() {
        if (!this.visible || !this.activeFactory) return;
        const stillExists = this.game.buildingManager.buildings.includes(this.activeFactory);
        if (!stillExists) this.close();
    }

    hitTest(worldX, worldY) {
        if (!this.visible || !this.activeFactory) return false;
        const rect = this._getRect();
        return worldX >= rect.x && worldX <= rect.x + rect.w &&
               worldY >= rect.y && worldY <= rect.y + rect.h;
    }

    getSlotAt(worldX, worldY) {
        if (!this.visible || this.selectingRecipe) return null;
        const b = this.activeFactory;
        const rect = this._getRect();
        const ports = b.getItemPorts();
        const inputPorts = ports.filter(p => p.type === 'in' || p.accepts);
        const outputPorts = ports.filter(p => p.type === 'out' || p.produces);
        const startY = rect.y + 35;
        const leftX = rect.x + this.padding;
        const rightX = rect.x + rect.w - this.padding - outputPorts.length * (this.slotSize + this.padding) + this.padding;

        for (let i = 0; i < inputPorts.length; i++) {
            const slotX = leftX + i * (this.slotSize + this.padding);
            if (worldX >= slotX && worldX <= slotX + this.slotSize &&
                worldY >= startY && worldY <= startY + this.slotSize) {
                return { slotType: 'input', index: i, port: inputPorts[i] };
            }
        }
        for (let i = 0; i < outputPorts.length; i++) {
            const slotX = rightX + i * (this.slotSize + this.padding);
            if (worldX >= slotX && worldX <= slotX + this.slotSize &&
                worldY >= startY && worldY <= startY + this.slotSize) {
                return { slotType: 'output', index: i, port: outputPorts[i] };
            }
        }
        return null;
    }

    onRightClick(worldX, worldY) {
        if (!this.visible || this.selectingRecipe) return;
        const slot = this.getSlotAt(worldX, worldY);
        if (!slot) return;
        const b = this.activeFactory;
        if (slot.slotType === 'input' && slot.port.accepts) {
            const res = slot.port.accepts[0];
            if (b.inputResources?.[res]) {
                b.inputResources[res] = Math.max(0, (b.inputResources[res] || 0) - 100);
            }
        } else if (slot.slotType === 'output' && slot.port.produces) {
            const res = slot.port.produces;
            if (b.outputResources?.[res]) {
                b.outputResources[res] = Math.max(0, (b.outputResources[res] || 0) - 100);
            }
        }
    }

    onClick(worldX, worldY) {
        if (!this.hitTest(worldX, worldY)) return false;
        const factory = this.activeFactory;
        const config = factory._factoryConfig;

        if (this.selectingRecipe && config && config.recipes) {
            const rect = this._getRect();
            const keys = Object.keys(config.recipes);
            const cols = Math.min(keys.length, 5);
            const btnW = 100, btnH = 30;
            const startX = rect.x + (rect.w - cols * (btnW + 10)) / 2;
            const startY = rect.y + 50;
            for (let i = 0; i < keys.length; i++) {
                const col = i % cols, row = Math.floor(i / cols);
                const bx = startX + col * (btnW + 10);
                const by = startY + row * (btnH + 5);
                if (worldX >= bx && worldX <= bx + btnW && worldY >= by && worldY <= by + btnH) {
                    FactoryCore.setRecipe(factory, keys[i], this.game);
                    factory._refreshPorts();
                    this.selectingRecipe = false;
                    return true;
                }
            }
            return true;
        }

        // Кнопка смены рецепта
        if (config && config.recipes && Object.keys(config.recipes).length > 1) {
            const rect = this._getRect();
            const ports = factory.getItemPorts();
            const inputPorts = ports.filter(p => p.type === 'in' || p.accepts);
            const outputPorts = ports.filter(p => p.type === 'out' || p.produces);
            const leftX = rect.x + this.padding;
            const inputsEndX = leftX + inputPorts.length * (this.slotSize + this.padding) - this.padding;
            const outputsStartX = rect.x + rect.w - this.padding - outputPorts.length * (this.slotSize + this.padding) + this.padding;
            const gapCenterX = (inputsEndX + outputsStartX) / 2;
            const baseIconSize = 40;
            const iconX = gapCenterX - baseIconSize / 2;
            const iconY = rect.y + 35 + this.slotSize / 2 - baseIconSize / 2;
            if (worldX >= iconX && worldX <= iconX + baseIconSize &&
                worldY >= iconY && worldY <= iconY + baseIconSize) {
                factory.recipe = null;
                factory._refreshPorts();
                this.selectingRecipe = true;
                return true;
            }
        }

        return true;
    }

    onMouseDown(worldX, worldY) {
        if (!this.visible || this.selectingRecipe) return false;
        const slot = this.getSlotAt(worldX, worldY);
        if (slot) {
            this.dragging = { ...slot, startX: worldX, startY: worldY };
            return true;
        }
        return false;
    }

    onMouseUp(worldX, worldY) {
        if (this.dragging) {
            const slot = this.dragging;
            this.dragging = null;
            const currentSlot = this.getSlotAt(worldX, worldY);
            if (!currentSlot || currentSlot.slotType !== slot.slotType || currentSlot.index !== slot.index) {
                const b = this.activeFactory;
                if (slot.slotType === 'input' && slot.port.accepts) {
                    const res = slot.port.accepts[0];
                    if (b.inputResources?.[res]) {
                        b.inputResources[res] = Math.max(0, (b.inputResources[res] || 0) - 100);
                    }
                } else if (slot.slotType === 'output' && slot.port.produces) {
                    const res = slot.port.produces;
                    if (b.outputResources?.[res]) {
                        b.outputResources[res] = Math.max(0, (b.outputResources[res] || 0) - 100);
                    }
                }
            }
            return true;
        }
        return false;
    }

    _getRect() {
        const b = this.activeFactory;
        if (!b) return { x: 0, y: 0, w: 0, h: 0 };
        const tileSize = this.game.map.tileSize;
        const size = b.getSize();
        const cx = (b.tx + size.w / 2) * tileSize;
        const cy = (b.ty + size.h / 2) * tileSize;

        let totalWidth = 200, totalHeight = 140;

        if (b.type === 'star') {
            totalWidth = 260;
            totalHeight = 140;
        } else if (this.selectingRecipe) {
            const keys = Object.keys(b._factoryConfig?.recipes || {});
            const cols = Math.min(keys.length, 5);
            totalWidth = cols * 110 + 20;
            totalHeight = Math.ceil(keys.length / cols) * 35 + 80;
        } else {
            const ports = b.getItemPorts();
            const inputPorts = ports.filter(p => p.type === 'in' || p.accepts);
            const outputPorts = ports.filter(p => p.type === 'out' || p.produces);
            const inputsWidth = inputPorts.length * (this.slotSize + this.padding) + this.padding;
            const outputsWidth = outputPorts.length * (this.slotSize + this.padding) + this.padding;
            totalWidth = inputsWidth + outputsWidth + this.groupGap + this.padding * 2;
            totalHeight = this.slotSize + this.padding * 2 + 50;
            if (this._hasEnergy(b)) totalHeight += 20;
        }

        return {
            x: cx - totalWidth / 2,
            y: cy - totalHeight - 20,
            w: totalWidth,
            h: totalHeight
        };
    }

    _hasEnergy(building) {
        if (building.type === 'star') return true;
        const energyPorts = building.getEnergyPorts();
        return energyPorts && energyPorts.length > 0;
    }

    render(ctx) {
        if (!this.visible || !this.activeFactory) return;
        const b = this.activeFactory;
        const config = b._factoryConfig;
        const rect = this._getRect();

        ctx.fillStyle = 'rgba(0, 0, 0, 0.8)';
        ctx.fillRect(rect.x - 4, rect.y - 4, rect.w + 8, rect.h + 8);
        ctx.fillStyle = '#1e2a3a';
        ctx.fillRect(rect.x, rect.y, rect.w, rect.h);
        ctx.strokeStyle = '#6699cc';
        ctx.lineWidth = 2;
        ctx.strokeRect(rect.x, rect.y, rect.w, rect.h);

        let title = b.type;
        if (config && config.recipes && b.recipe) {
            title += ` (${b.recipe})`;
        } else if (this.selectingRecipe) {
            title += ' – выберите рецепт';
        }
        ctx.fillStyle = '#fff';
        ctx.font = 'bold 13px "Segoe UI"';
        ctx.textAlign = 'center';
        ctx.fillText(title, rect.x + rect.w / 2, rect.y + 18);

        if (this.selectingRecipe && config && config.recipes) {
            const keys = Object.keys(config.recipes);
            const cols = Math.min(keys.length, 5);
            const btnW = 100, btnH = 30;
            const startX = rect.x + (rect.w - cols * (btnW + 10)) / 2;
            const startY = rect.y + 50;
            keys.forEach((key, i) => {
                const col = i % cols, row = Math.floor(i / cols);
                const bx = startX + col * (btnW + 10);
                const by = startY + row * (btnH + 5);
                ctx.fillStyle = '#2a3a4a';
                ctx.fillRect(bx, by, btnW, btnH);
                ctx.strokeStyle = '#5a6a7a';
                ctx.strokeRect(bx, by, btnW, btnH);
                ctx.fillStyle = '#fff';
                ctx.font = '11px "Segoe UI"';
                ctx.textAlign = 'center';
                ctx.fillText(key, bx + btnW / 2, by + btnH / 2 + 4);
            });
            return;
        }

        if (b.type === 'star') {
            this._renderStarUI(ctx, b, rect);
            return;
        }

        const ports = b.getItemPorts();
        const inputPorts = ports.filter(p => p.type === 'in' || p.accepts);
        const outputPorts = ports.filter(p => p.type === 'out' || p.produces);

        const startY = rect.y + 35;
        const leftX = rect.x + this.padding;
        const rightX = rect.x + rect.w - this.padding - outputPorts.length * (this.slotSize + this.padding) + this.padding;

        const mouseWorld = this.game.camera.screenToWorld(this.game.lastMouseX, this.game.lastMouseY);
        const hoveredSlot = this.getSlotAt(mouseWorld.x, mouseWorld.y);

        // Рисуем слоты
        inputPorts.forEach((port, i) => {
            const slotX = leftX + i * (this.slotSize + this.padding);
            const slotY = startY;
            const isHovered = hoveredSlot && hoveredSlot.slotType === 'input' && hoveredSlot.index === i;
            ctx.fillStyle = isHovered ? '#2a3a4a' : '#1a2a3a';
            ctx.fillRect(slotX, slotY, this.slotSize, this.slotSize);
            ctx.strokeStyle = isHovered ? '#00ff00' : '#4a5a6a';
            ctx.lineWidth = isHovered ? 2 : 1;
            ctx.strokeRect(slotX, slotY, this.slotSize, this.slotSize);
            ctx.lineWidth = 1;

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

        outputPorts.forEach((port, i) => {
            const slotX = rightX + i * (this.slotSize + this.padding);
            const slotY = startY;
            const isHovered = hoveredSlot && hoveredSlot.slotType === 'output' && hoveredSlot.index === i;
            ctx.fillStyle = isHovered ? '#2a3a4a' : '#1a2a3a';
            ctx.fillRect(slotX, slotY, this.slotSize, this.slotSize);
            ctx.strokeStyle = isHovered ? '#00ff00' : '#4a5a6a';
            ctx.lineWidth = isHovered ? 2 : 1;
            ctx.strokeRect(slotX, slotY, this.slotSize, this.slotSize);
            ctx.lineWidth = 1;

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

        // Кнопка смены рецепта (только если рецептов больше одного)
        if (config && config.recipes && Object.keys(config.recipes).length > 1) {
            const inputsEndX = leftX + inputPorts.length * (this.slotSize + this.padding) - this.padding;
            const outputsStartX = rightX;
            const gapCenterX = (inputsEndX + outputsStartX) / 2;
            const baseIconSize = 40;
            const hoverIconSize = 44;
            const isBtnHovered = (() => {
                const btnX = gapCenterX - baseIconSize / 2;
                const btnY = startY + this.slotSize / 2 - baseIconSize / 2;
                return mouseWorld.x >= btnX && mouseWorld.x <= btnX + baseIconSize &&
                       mouseWorld.y >= btnY && mouseWorld.y <= btnY + baseIconSize;
            })();
            const iconSize = isBtnHovered ? hoverIconSize : baseIconSize;
            const iconX = gapCenterX - iconSize / 2;
            const iconY = startY + this.slotSize / 2 - iconSize / 2;

            ctx.fillStyle = isBtnHovered ? '#7ae0a3' : '#5a6a7a';
            ctx.font = `${iconSize * 0.75}px "Segoe UI"`;
            ctx.textAlign = 'center';
            ctx.textBaseline = 'middle';
            ctx.fillText('🔄', iconX + iconSize / 2, iconY + iconSize / 2);
        }

        if (this._hasEnergy(b)) {
            this._renderEnergyBar(ctx, rect, b);
        }
    }

    _renderStarUI(ctx, b, rect) {
        const pCount = b.inputResources?.['p'] || 0;
        const nCount = b.inputResources?.['n'] || 0;
        const eCount = b.resources?.['energy'] || 0;

        const startY = rect.y + 35;
        const slotSize = 40;
        const gap = 10;
        const startX = rect.x + rect.w / 2 - slotSize - gap / 2;

        ctx.fillStyle = '#2a3a4a';
        ctx.fillRect(startX, startY, slotSize, slotSize);
        ctx.strokeStyle = '#4a5a6a';
        ctx.strokeRect(startX, startY, slotSize, slotSize);
        drawParticle(ctx, startX + slotSize / 2, startY + slotSize / 2, slotSize * 0.35, 'p', 0);
        ctx.fillStyle = '#fff';
        ctx.font = '10px "Segoe UI"';
        ctx.textAlign = 'right';
        ctx.fillText(pCount, startX + slotSize - 5, startY + slotSize - 5);

        const nSlotX = startX + slotSize + gap;
        ctx.fillStyle = '#2a3a4a';
        ctx.fillRect(nSlotX, startY, slotSize, slotSize);
        ctx.strokeStyle = '#4a5a6a';
        ctx.strokeRect(nSlotX, startY, slotSize, slotSize);
        drawParticle(ctx, nSlotX + slotSize / 2, startY + slotSize / 2, slotSize * 0.35, 'n', 0);
        ctx.fillStyle = '#fff';
        ctx.textAlign = 'right';
        ctx.fillText(nCount, nSlotX + slotSize - 5, startY + slotSize - 5);

        this._renderEnergyBar(ctx, rect, b);
    }

    _renderEnergyBar(ctx, rect, b) {
        const energy = b.resources?.['energy'] || b.outputResources?.['energy'] || 0;
        const maxEnergy = b.type === 'star' ? 50 : 1000;
        const barWidth = rect.w - 20;
        const barHeight = 8;
        const barX = rect.x + 10;
        const barY = rect.y + rect.h - barHeight - 10;

        ctx.fillStyle = '#111';
        ctx.fillRect(barX, barY, barWidth, barHeight);

        const fillWidth = Math.min(energy / maxEnergy, 1) * barWidth;
        ctx.fillStyle = '#00ccff';
        ctx.fillRect(barX, barY, fillWidth, barHeight);

        ctx.fillStyle = '#fff';
        ctx.font = '9px "Segoe UI"';
        ctx.textAlign = 'center';
        ctx.fillText(`⚡ ${Math.floor(energy)} / ${maxEnergy}`, rect.x + rect.w / 2, barY - 2);
    }
}