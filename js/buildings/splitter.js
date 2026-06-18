import { spriteRenderer } from '../SpriteRenderer.js';

export const splitterBuilding = {
    type: 'splitter',
    size: { w: 1, h: 1 },
    render(ctx, b, tileSize, isGhost, game) {
        const x = b.tx * tileSize;
        const y = b.ty * tileSize;
        const size = b.getSize();
        spriteRenderer.drawBuilding(ctx, x, y, size.w * tileSize, size.h * tileSize, 'balancer-splitter', b.rotation);
    }
};