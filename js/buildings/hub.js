import { spriteRenderer } from '../SpriteRenderer.js';

export const hubBuilding = {
    type: 'hub',
    size: { w: 4, h: 4 },
    render(ctx, b, tileSize, isGhost, game) {
        const x = b.tx * tileSize;
        const y = b.ty * tileSize;
        const size = b.getSize();
        spriteRenderer.drawBuilding(ctx, x, y, size.w * tileSize, size.h * tileSize, 'hub', 0);
    }
};