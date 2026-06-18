const QUARK_COLORS = {
    u: '#e74c3c', d: '#3498db', c: '#2ecc71', s: '#f1c40f', t: '#9b59b6', b: '#e67e22'
};
export const quantumResonatorBuilding = {
    type: 'quantum_resonator',
    size: { w: 3, h: 3 },
    rotateGhost(ghost) {
        if (ghost.quarkType === undefined) ghost.quarkType = 0;
        ghost.quarkType = (ghost.quarkType + 1) % 6;
    },
    update(building, game, dt) {
        if (building.quarkType === undefined) building.quarkType = 0;
        if (!building.resources) building.resources = {};
        if (!building.timer) building.timer = 0;
        const quarkNames = ['u', 'd', 'c', 's', 't', 'b'];
        const quark = quarkNames[building.quarkType];
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
        const w = 3 * tileSize, h = 3 * tileSize;
        const quarkNames = ['u', 'd', 'c', 's', 't', 'b'];
        const quark = isGhost ? quarkNames[b.quarkType || 0] : quarkNames[b.quarkType || 0];
        const color = QUARK_COLORS[quark] || '#fff';
        ctx.fillStyle = 'rgba(0,255,255,0.1)';
        ctx.fillRect(x, y, w, h);
        ctx.strokeStyle = '#00ffff';
        ctx.lineWidth = 2;
        ctx.strokeRect(x+1,y+1,w-2,h-2);
        ctx.beginPath();
        ctx.arc(x+w/2, y+h/2, w*0.35, 0, Math.PI*2);
        ctx.fillStyle = color+'40';
        ctx.fill();
        ctx.strokeStyle = color;
        ctx.stroke();
        ctx.fillStyle = '#fff';
        ctx.font = `bold ${tileSize*0.5}px "Segoe UI"`;
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillText(quark.toUpperCase(), x+w/2, y+h/2);
        if (!isGhost && b.resources) {
            const count = b.resources[quark] || 0;
            ctx.font = `${tileSize*0.15}px "Segoe UI"`;
            ctx.fillText(count, x+w/2, y+h - tileSize*0.3);
        }
    }
};