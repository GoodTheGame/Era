export const electronCaptureBuilding = {
    type: 'electron_capture',
    size: { w: 2, h: 1 },
    rotateGhost(ghost) {},
    update(building, game, dt) {
        if (!building.inputResources) building.inputResources = {};
        if (!building.outputResources) building.outputResources = {};
        if (!building.craftTimer) building.craftTimer = 0;

        const needP = 1, needE = 1;
        const hasP = building.inputResources['p'] || 0;
        const hasE = building.inputResources['e'] || 0;

        if (hasP >= needP && hasE >= needE) {
            building.craftTimer += dt;
            if (building.craftTimer >= 1.0) {
                building.craftTimer -= 1.0;
                building.inputResources['p'] -= needP;
                building.inputResources['e'] -= needE;
                building.outputResources['H'] = (building.outputResources['H'] || 0) + 1;
            }
        } else {
            building.craftTimer = 0;
        }
    },
    render(ctx, b, tileSize, isGhost, game) {
        const x = b.tx * tileSize;
        const y = b.ty * tileSize;
        const size = b.getSize();
        const w = size.w * tileSize;
        const h = size.h * tileSize;
        ctx.fillStyle = '#22aaff20';
        ctx.fillRect(x, y, w, h);
        ctx.strokeStyle = '#22aaff';
        ctx.lineWidth = 2;
        ctx.strokeRect(x+1, y+1, w-2, h-2);
        ctx.fillStyle = '#fff';
        ctx.font = `bold ${tileSize*0.4}px "Segoe UI"`;
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillText('H', x + w/2, y + h/2);
        if (!isGhost && b.craftTimer > 0) {
            const progress = b.craftTimer / 1.0;
            ctx.fillStyle = '#0f0';
            ctx.fillRect(x + 2, y + h - 6, (w - 4) * progress, 4);
        }
    }
};