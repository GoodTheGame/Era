// js/PlacementUtils.js
export function drawPlacementGrid(ctx, ghost, tileSize, isValid) {
    const size = ghost.getSize();
    const x = ghost.tx * tileSize;
    const y = ghost.ty * tileSize;
    const w = size.w * tileSize;
    const h = size.h * tileSize;

    ctx.save();
    ctx.globalAlpha = 0.4;
    if (isValid) {
        ctx.fillStyle = 'rgba(0, 255, 0, 0.15)';
        ctx.strokeStyle = 'rgba(0, 255, 0, 0.5)';
    } else {
        ctx.fillStyle = 'rgba(255, 0, 0, 0.15)';
        ctx.strokeStyle = 'rgba(255, 0, 0, 0.5)';
    }
    ctx.fillRect(x, y, w, h);
    ctx.strokeRect(x, y, w, h);
    ctx.restore();
}