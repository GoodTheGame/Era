// js/Map.js
export class GameMap {
    constructor(camera) {
        this.camera = camera;
        this.tileSize = 64;
    }

    render(ctx) {
        // Тёмный фон
        ctx.fillStyle = '#1a1d2e';
        ctx.fillRect(-5000, -5000, 10000, 10000);

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
}