export class AtlasLoader {
    constructor() {
        this.atlases = new Map();
        this.images = new Map();
        this.loadingPromises = [];
    }

    async loadAtlas(name, jsonUrl, imageUrl) {
        const loadPromise = Promise.all([
            fetch(jsonUrl).then(res => res.json()),
            this.loadImage(imageUrl)
        ]).then(([atlasData, image]) => {
            this.atlases.set(name, atlasData);
            this.images.set(name, image);
            console.log(`✅ Атлас ${name} загружен`);
        });

        this.loadingPromises.push(loadPromise);
        return loadPromise;
    }

    loadImage(url) {
        return new Promise((resolve, reject) => {
            const img = new Image();
            img.onload = () => resolve(img);
            img.onerror = reject;
            img.src = url;
        });
    }

    async waitForAll() {
        await Promise.all(this.loadingPromises);
    }

    getSprite(name, spritePath) {
        const atlas = this.atlases.get(name);
        const image = this.images.get(name);
        
        if (!atlas || !image) {
            console.warn(`Атлас ${name} не найден`);
            return null;
        }

        const frameData = atlas.frames[spritePath];
        if (!frameData) {
            console.warn(`Спрайт ${spritePath} не найден в атласе ${name}`);
            return null;
        }

        return {
            image,
            sx: frameData.frame.x,
            sy: frameData.frame.y,
            sw: frameData.frame.w,
            sh: frameData.frame.h,
            dx: frameData.spriteSourceSize.x,
            dy: frameData.spriteSourceSize.y,
            sourceW: frameData.sourceSize.w,
            sourceH: frameData.sourceSize.h
        };
    }

    drawSprite(ctx, name, spritePath, x, y, width, height) {
        const sprite = this.getSprite(name, spritePath);
        if (!sprite) return;

        // Вычисляем масштаб
        const scaleX = width / sprite.sourceW;
        const scaleY = height / sprite.sourceH;

        // Рисуем с учетом обрезки (trimming)
        ctx.drawImage(
            sprite.image,
            sprite.sx, sprite.sy, sprite.sw, sprite.sh,
            x + sprite.dx * scaleX,
            y + sprite.dy * scaleY,
            sprite.sw * scaleX,
            sprite.sh * scaleY
        );
    }
}

// Глобальный экземпляр загрузчика
export const atlasLoader = new AtlasLoader();