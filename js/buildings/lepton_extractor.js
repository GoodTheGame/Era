const ELECTRON_COLOR = '#ffff00';

export const leptonExtractorBuilding = {
    type: 'lepton_extractor',
    size: { w: 1, h: 1 },
    rotateGhost(ghost) {},
    update(building, game, dt) {
        if (!building.resources) building.resources = {};
        if (!building.timer) building.timer = 0;
        const quark = 'e';
        building.timer += dt;
        const interval = 0.2;
        while (building.timer >= interval) {
            building.timer -= interval;
            const cur = building.resources[quark] || 0;
            if (cur < 500) building.resources[quark] = cur + 1;
        }
    },
    render(ctx, b, tileSize, isGhost, game) {
        const x = b.tx * tileSize, y = b.ty * tileSize;
        const s = tileSize;
        const color = ELECTRON_COLOR;
        ctx.fillStyle = color + '20';
        ctx.fillRect(x, y, s, s);
        ctx.strokeStyle = color;
        ctx.lineWidth = 2;
        ctx.strokeRect(x+1, y+1, s-2, s-2);
        ctx.beginPath();
        ctx.arc(x + s/2, y + s/2, s*0.3, 0, Math.PI*2);
        ctx.fillStyle = color + '40';
        ctx.fill();
        ctx.strokeStyle = color;
        ctx.stroke();
        ctx.fillStyle = '#000';
        ctx.font = `bold ${s*0.4}px "Segoe UI"`;
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillText('e', x + s/2, y + s/2);
        if (!isGhost && b.resources) {
            const count = b.resources['e'] || 0;
            ctx.font = `${s*0.2}px "Segoe UI"`;
            ctx.fillText(count, x + s/2, y + s - 4);
        }
    }
};