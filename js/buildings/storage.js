import { spriteRenderer } from '../SpriteRenderer.js';

export const storageBuilding = {
    type: 'storage',
    size: { w: 2, h: 2 },
    render(ctx, b, tileSize, isGhost, game) {
        const x = b.tx * tileSize;
        const y = b.ty * tileSize;
        const size = b.getSize();                     // всегда 2x2
        spriteRenderer.drawBuilding(ctx, x, y, size.w * tileSize, size.h * tileSize, 'storage', 0);
    }
};