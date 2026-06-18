import { spriteRenderer } from '../SpriteRenderer.js';

export const trashBuilding = {
    type: 'trash',
    size: { w: 1, h: 1 },
    render(ctx, b, tileSize, isGhost, game) {
        const x = b.tx * tileSize;
        const y = b.ty * tileSize;
        const size = b.getSize();
        spriteRenderer.drawBuilding(ctx, x, y, size.w * tileSize, size.h * tileSize, 'trash', b.rotation);
    }
};