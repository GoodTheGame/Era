export class GameMap {
    constructor(camera) {
        this.camera = camera;
        this.tileSize = 64;
        this.veins = [];
        this._generateVeins();
    }

    _generateVeins() {
        // 3 типа кварков (цвета), по 2 жилы каждого
        const veinTypes = [
            { color: '#E07A7A', name: 'up_quark' },
            { color: '#7A9EE0', name: 'down_quark' },
            { color: '#7AE0A3', name: 'strange_quark' }
        ];
        
        const placedVeins = [];
        const minDistance = 450;
        
        for (const type of veinTypes) {
            for (let i = 0; i < 2; i++) {
                let attempts = 0;
                let placed = false;
                
                while (!placed && attempts < 200) {
                    const x = (Math.random() - 0.5) * 3500;
                    const y = (Math.random() - 0.5) * 3500;
                    const radius = 130 + Math.random() * 70;
                    
                    // Не ближе 500px к центру (где Хаб)
                    const distToCenter = Math.hypot(x, y);
                    if (distToCenter < 500) {
                        attempts++;
                        continue;
                    }
                    
                    // Проверяем дистанцию до других жил
                    let valid = true;
                    for (const v of placedVeins) {
                        const dist = Math.hypot(x - v.x, y - v.y);
                        if (dist < minDistance) {
                            valid = false;
                            break;
                        }
                    }
                    
                    if (valid) {
                        const vein = { x, y, radius, color: type.color, name: type.name };
                        this.veins.push(vein);
                        placedVeins.push(vein);
                        placed = true;
                    }
                    
                    attempts++;
                }
            }
        }
    }

    render(ctx) {
        ctx.fillStyle = '#1a1d2e';
        ctx.fillRect(-5000, -5000, 10000, 10000);

        for (const vein of this.veins) {
            const gradient = ctx.createRadialGradient(vein.x, vein.y, 0, vein.x, vein.y, vein.radius);
            gradient.addColorStop(0, vein.color + 'aa');
            gradient.addColorStop(0.7, vein.color + '55');
            gradient.addColorStop(1, vein.color + '00');
            ctx.fillStyle = gradient;
            ctx.beginPath();
            ctx.arc(vein.x, vein.y, vein.radius, 0, Math.PI * 2);
            ctx.fill();
        }

        this._renderGrid(ctx);
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