import { spriteRenderer } from '../SpriteRenderer.js';

export const mixerBuilding = {
    type: 'mixer',
    size: { w: 2, h: 1 },
    render(ctx, b, tileSize, isGhost, game) {
        const x = b.tx * tileSize;
        const y = b.ty * tileSize;
        const size = b.getSize();                     // {w:2,h:1} или {w:1,h:2}
        spriteRenderer.drawBuilding(ctx, x, y, size.w * tileSize, size.h * tileSize, 'mixer', b.rotation);
    }
};