// SpriteRenderer.js
import { atlasLoader } from './AtlasLoader.js';

export class SpriteRenderer {
    constructor() {
        this.currentAtlas = 'mq';
    }

    setQuality(quality) {
        if (['lq', 'mq', 'hq'].includes(quality)) this.currentAtlas = quality;
    }

    _drawSprite(ctx, sprite, x, y, targetW, targetH) {
        if (!sprite) return;
        
        const { image, sx, sy, sw, sh, dx, dy, sourceW, sourceH } = sprite;
        
        // Масштабируем относительно sourceSize
        const scaleX = targetW / sourceW;
        const scaleY = targetH / sourceH;

        // Учитываем смещение dx/dy из атласа
        const drawX = x + dx * scaleX;
        const drawY = y + dy * scaleY;
        const drawW = sw * scaleX;
        const drawH = sh * scaleY;

        ctx.drawImage(image, sx, sy, sw, sh, drawX, drawY, drawW, drawH);
    }

    drawBelt(ctx, x, y, size, rotation, frame, beltType = 0) {
        // Выбираем спрайт в зависимости от типа конвейера
        let spriteType = 'forward';
        if (beltType === 1) {
            spriteType = 'left';
        } else if (beltType === 2) {
            spriteType = 'right';
        }
        
        const spritePath = `sprites/belt/built/${spriteType}_${frame}.png`;
        const sprite = atlasLoader.getSprite(`atlas0_${this.currentAtlas}`, spritePath);
        if (!sprite) return;

        ctx.save();
        ctx.translate(x + size / 2, y + size / 2);
        ctx.rotate(rotation * Math.PI / 2);
        ctx.translate(-size / 2, -size / 2);
        
        this._drawSprite(ctx, sprite, 0, 0, size, size);
        ctx.restore();
    }

    drawBuilding(ctx, x, y, localW, localH, buildingType, rotation = 0, variant = '') {
        let spritePath = variant
            ? `sprites/buildings/${buildingType}-${variant}.png`
            : `sprites/buildings/${buildingType}.png`;
            
        // Для повернутых зданий пытаемся найти специальный спрайт
        if (rotation % 2 === 1) {
            const rotatedPath = `sprites/buildings/${buildingType}-rotated.png`;
            const rotatedSprite = atlasLoader.getSprite(`atlas0_${this.currentAtlas}`, rotatedPath);
            if (rotatedSprite) {
                spritePath = rotatedPath;
            }
        }
            
        const sprite = atlasLoader.getSprite(`atlas0_${this.currentAtlas}`, spritePath);
        if (!sprite) {
            ctx.fillStyle = '#ff00ff';
            ctx.fillRect(x, y, localW, localH);
            return;
        }

        ctx.save();
        
        // Если здание прямоугольное и повернуто, меняем местами размеры для корректного центрирования
        if (rotation % 2 === 1 && localW !== localH) {
            ctx.translate(x + localW / 2, y + localH / 2);
            ctx.rotate(rotation * Math.PI / 2);
            ctx.translate(-localH / 2, -localW / 2);
            this._drawSprite(ctx, sprite, 0, 0, localH, localW);
        } else {
            ctx.translate(x + localW / 2, y + localH / 2);
            ctx.rotate(rotation * Math.PI / 2);
            ctx.translate(-localW / 2, -localH / 2);
            this._drawSprite(ctx, sprite, 0, 0, localW, localH);
        }
        
        ctx.restore();
    }
}

export const spriteRenderer = new SpriteRenderer();