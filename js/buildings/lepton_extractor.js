import { drawParticle } from '../ParticleRenderer.js';

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
        const x = b.tx * tileSize;
        const y = b.ty * tileSize;
        const s = tileSize;
        const cx = x + s / 2;
        const cy = y + s / 2;
        const animTimer = game.globalAnimTime || 0;
        const zoom = game.camera.zoom;

        if (zoom < 0.5 && !isGhost) {
            ctx.fillStyle = '#ffff00';
            ctx.fillRect(x + s*0.25, y + s*0.25, s*0.5, s*0.5);
            const count = b.resources?.['e'] || 0;
            if (count > 0) {
                ctx.fillStyle = '#000';
                ctx.font = `${s*0.3}px "Segoe UI"`;
                ctx.textAlign = 'center';
                ctx.fillText(count, cx, y + s - 2);
            }
            return;
        }

        const phase = animTimer * 2;

        ctx.fillStyle = '#ffff0020';
        ctx.fillRect(x, y, s, s);
        ctx.strokeStyle = '#ffff00';
        ctx.lineWidth = 2;
        ctx.strokeRect(x + 1, y + 1, s - 2, s - 2);

        ctx.save();
        ctx.translate(cx, cy);
        ctx.rotate(phase);

        ctx.beginPath();
        ctx.arc(0, 0, s * 0.28, 0, Math.PI * 2);
        ctx.strokeStyle = '#ccc';
        ctx.lineWidth = 1.5;
        ctx.stroke();

        for (let i = 0; i < 6; i++) {
            const angle = (i / 6) * Math.PI * 2;
            const innerX = Math.cos(angle) * s * 0.08;
            const innerY = Math.sin(angle) * s * 0.08;
            const outerX = Math.cos(angle) * s * 0.25;
            const outerY = Math.sin(angle) * s * 0.25;
            ctx.beginPath();
            ctx.moveTo(innerX, innerY);
            ctx.lineTo(outerX, outerY);
            ctx.strokeStyle = '#aaa';
            ctx.lineWidth = 1;
            ctx.stroke();
        }

        ctx.beginPath();
        ctx.arc(0, 0, s * 0.1, 0, Math.PI * 2);
        ctx.fillStyle = '#888';
        ctx.fill();
        ctx.strokeStyle = '#fff';
        ctx.lineWidth = 1;
        ctx.stroke();
        ctx.restore();

        const catchAngle = phase * 0.7;
        const catchDist = s * 0.28 + Math.sin(phase * 5) * s * 0.05;
        const eX = cx + Math.cos(catchAngle) * catchDist;
        const eY = cy + Math.sin(catchAngle) * catchDist;
        drawParticle(ctx, eX, eY, s * 0.15, 'e', animTimer);

        if (Math.sin(phase * 3) > 0.5) {
            ctx.beginPath();
            ctx.moveTo(cx, cy);
            ctx.lineTo(eX, eY);
            ctx.strokeStyle = 'rgba(255, 255, 0, 0.5)';
            ctx.lineWidth = 1;
            ctx.stroke();
        }

        if (!isGhost) {
            const count = b.resources['e'] || 0;
            ctx.fillStyle = '#000';
            ctx.font = `${s * 0.2}px "Segoe UI"`;
            ctx.textAlign = 'center';
            ctx.fillText(count, cx, y + s - 2);
        }
    }
};