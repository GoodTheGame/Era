import { atlasLoader } from './AtlasLoader.js';

export class SpriteRenderer {
    constructor() {
        this.currentAtlas = 'mq';
    }

    setQuality(quality) {
        if (['lq', 'mq', 'hq'].includes(quality)) {
            this.currentAtlas = quality;
        }
    }

    // Рисуем конвейер: используем forward_X и вращаем canvas
    drawBelt(ctx, x, y, size, rotation, frame) {
        const atlasName = `atlas0_${this.currentAtlas}`;
        const spritePath = `sprites/belt/built/forward_${frame}.png`;
        
        ctx.save();
        ctx.translate(x + size / 2, y + size / 2);
        ctx.rotate(rotation * Math.PI / 2);
        ctx.translate(-size / 2, -size / 2);
        
        atlasLoader.drawSprite(ctx, atlasName, spritePath, 0, 0, size, size);
        ctx.restore();
    }

    // Здания с поворотом
    drawBuilding(ctx, x, y, size, buildingType, rotation = 0, variant = '') {
        const atlasName = `atlas0_${this.currentAtlas}`;
        const spritePath = variant 
            ? `sprites/buildings/${buildingType}-${variant}.png`
            : `sprites/buildings/${buildingType}.png`;
        
        ctx.save();
        ctx.translate(x + size / 2, y + size / 2);
        ctx.rotate(rotation * Math.PI / 2);
        ctx.translate(-size / 2, -size / 2);
        
        atlasLoader.drawSprite(ctx, atlasName, spritePath, 0, 0, size, size);
        ctx.restore();
    }

    drawBlueprint(ctx, x, y, size, buildingType, rotation = 0, variant = '') {
        const atlasName = `atlas0_${this.currentAtlas}`;
        const spritePath = variant
            ? `sprites/blueprints/${buildingType}-${variant}.png`
            : `sprites/blueprints/${buildingType}.png`;
        
        ctx.save();
        ctx.translate(x + size / 2, y + size / 2);
        ctx.rotate(rotation * Math.PI / 2);
        ctx.translate(-size / 2, -size / 2);
        
        atlasLoader.drawSprite(ctx, atlasName, spritePath, 0, 0, size, size);
        ctx.restore();
    }

    drawColor(ctx, x, y, size, color) {
        const atlasName = `atlas0_${this.currentAtlas}`;
        const spritePath = `sprites/colors/${color}.png`;
        atlasLoader.drawSprite(ctx, atlasName, spritePath, x, y, size, size);
    }
}

export const spriteRenderer = new SpriteRenderer();