import { spriteRenderer } from '../SpriteRenderer.js';

export const extractorBuilding = {
    type: 'extractor',
    size: { w: 1, h: 1 },
    render(ctx, b, tileSize, isGhost, game) {
        const x = b.tx * tileSize;
        const y = b.ty * tileSize;
        const size = b.getSize();                     // на случай, если экстрактор станет 2x1
        spriteRenderer.drawBuilding(ctx, x, y, size.w * tileSize, size.h * tileSize, 'miner', b.rotation);
    }
};