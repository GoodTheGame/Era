// js/Map.js
export class GameMap {
    constructor(camera) {
        this.camera = camera;
        this.tileSize = 64;
    }

    render(ctx) {
        // Получаем границы видимой области
        const topLeft = this.camera.screenToWorld(0, 0);
        const bottomRight = this.camera.screenToWorld(this.camera.canvas.width, this.camera.canvas.height);
        const w = bottomRight.x - topLeft.x;
        const h = bottomRight.y - topLeft.y;

        // Единый цвет бездны
        ctx.fillStyle = '#050510';
        ctx.fillRect(topLeft.x, topLeft.y, w, h);

        this._renderGrid(ctx);
    }

    _renderGrid(ctx) {
    const zoom = this.camera.zoom;
    // При сильном отдалении сетку не рисуем
    if (zoom < 0.5) return;

    const topLeft = this.camera.screenToWorld(0, 0);
    const bottomRight = this.camera.screenToWorld(this.camera.canvas.width, this.camera.canvas.height);

    const startX = Math.floor(topLeft.x / this.tileSize) * this.tileSize;
    const startY = Math.floor(topLeft.y / this.tileSize) * this.tileSize;
    const endX = Math.ceil(bottomRight.x / this.tileSize) * this.tileSize;
    const endY = Math.ceil(bottomRight.y / this.tileSize) * this.tileSize;

    // Толщина линии минимальна и тоже зависит от зума для аккуратности
    ctx.strokeStyle = '#2a3a5a';
    ctx.lineWidth = Math.max(0.5, 1 / zoom);

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