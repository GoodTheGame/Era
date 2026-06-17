// js/Map.js
export class GameMap {
    constructor(camera) {
        this.camera = camera;
        this.tileSize = 64;
        
        this.veins = [];
        this._generateVeins();
        
        // Кэш для отрисовки жил
        this.veinCanvasCache = new Map();
    }

    _generateVeins() {
        // Генерируем жилы как в Shapez - с использованием seed для детерминированности
        const veinTypes = [
            { color: '#ff666a', name: 'red' },
            { color: '#66a7ff', name: 'blue' },
            { color: '#78ff66', name: 'green' }
        ];
        
        // По 2 жилы каждого типа
        for (const type of veinTypes) {
            for (let i = 0; i < 2; i++) {
                const seed = `${type.name}_${i}`;
                const rng = this._seededRandom(seed);
                
                // Позиция в пределах карты
                const x = (rng() - 0.5) * 3000;
                const y = (rng() - 0.5) * 3000;
                
                // Не ближе 500px к центру (где Хаб)
                const distToCenter = Math.hypot(x, y);
                if (distToCenter < 500) continue;
                
                // Размер жилы
                const radius = 120 + rng() * 80;
                
                this.veins.push({
                    x, y,
                    radius,
                    color: type.color,
                    name: type.name,
                    seed: seed
                });
            }
        }
    }

    _seededRandom(seed) {
        let hash = 0;
        for (let i = 0; i < seed.length; i++) {
            const char = seed.charCodeAt(i);
            hash = ((hash << 5) - hash) + char;
            hash = hash & hash;
        }
        
        return function() {
            hash = (hash * 9301 + 49297) % 233280;
            return hash / 233280;
        };
    }

    render(ctx) {
        // Тёмный фон
        ctx.fillStyle = '#1a1d2e';
        ctx.fillRect(-5000, -5000, 10000, 10000);

        // Рисуем жилы
        for (const vein of this.veins) {
            this._drawVein(ctx, vein);
        }

        this._renderGrid(ctx);
    }

    _drawVein(ctx, vein) {
        ctx.save();
        ctx.translate(vein.x, vein.y);
        
        // Рисуем жилу как в Shapez - с несколькими слоями градиентов
        const layers = 3;
        for (let i = 0; i < layers; i++) {
            const layerRadius = vein.radius * (1 - i * 0.25);
            const alpha = 0.3 + i * 0.2;
            
            const gradient = ctx.createRadialGradient(0, 0, 0, 0, 0, layerRadius);
            gradient.addColorStop(0, vein.color + Math.floor(alpha * 255).toString(16).padStart(2, '0'));
            gradient.addColorStop(0.7, vein.color + Math.floor(alpha * 0.5 * 255).toString(16).padStart(2, '0'));
            gradient.addColorStop(1, vein.color + '00');
            
            ctx.fillStyle = gradient;
            ctx.beginPath();
            ctx.arc(0, 0, layerRadius, 0, Math.PI * 2);
            ctx.fill();
        }
        
        ctx.restore();
    }

    _renderGrid(ctx) {
        const zoom = this.camera.zoom;
        const topLeft = this.camera.screenToWorld(0, 0);
        const bottomRight = this.camera.screenToWorld(this.camera.canvas.width, this.camera.canvas.height);

        const startX = Math.floor(topLeft.x / this.tileSize) * this.tileSize;
        const startY = Math.floor(topLeft.y / this.tileSize) * this.tileSize;
        const endX = Math.ceil(bottomRight.x / this.tileSize) * this.tileSize;
        const endY = Math.ceil(bottomRight.y / this.tileSize) * this.tileSize;

        ctx.strokeStyle = '#2a3a5a';
        ctx.lineWidth = 1 / zoom;

        ctx.beginPath();
        for (let x = startX; x <= endX; x += this.tileSize) {
            ctx.moveTo(x, startY);
            ctx.lineTo(x, endY);
        }
        for (let y = startY; y <= endY; y += this.tileSize) {
            ctx.moveTo(startX, y);
            ctx.lineTo(endX, y);
        }
        ctx.stroke();
    }

    worldToTile(worldX, worldY) {
        return {
            tx: Math.floor(worldX / this.tileSize),
            ty: Math.floor(worldY / this.tileSize)
        };
    }

    getVeinAt(tx, ty) {
        const worldX = tx * this.tileSize + this.tileSize / 2;
        const worldY = ty * this.tileSize + this.tileSize / 2;
        
        for (const vein of this.veins) {
            const dist = Math.hypot(worldX - vein.x, worldY - vein.y);
            if (dist < vein.radius) return vein;
        }
        return null;
    }
}