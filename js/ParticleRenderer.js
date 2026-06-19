// js/ParticleRenderer.js

const PARTICLE_DEFS = {
    u: { color: '#e74c3c', glow: '#ff8888', type: 'quark', name: 'u' },
    d: { color: '#3498db', glow: '#8888ff', type: 'quark', name: 'd' },
    c: { color: '#2ecc71', glow: '#88ff88', type: 'quark', name: 'c' },
    s: { color: '#f1c40f', glow: '#ffff88', type: 'quark', name: 's' },
    t: { color: '#9b59b6', glow: '#cc88ff', type: 'quark', name: 't' },
    b: { color: '#e67e22', glow: '#ffcc88', type: 'quark', name: 'b' },
    g: { color: '#ff44cc', glow: '#ff88ee', type: 'gluon', name: 'g' },
    e: { color: '#ffff00', glow: '#ffffaa', type: 'electron', name: 'e' },
    p: { color: '#ffaa00', glow: '#ffdd88', type: 'proton', name: 'p' },
    n: { color: '#aa00ff', glow: '#dd88ff', type: 'neutron', name: 'n' },
    H: { color: '#22aaff', glow: '#88ddff', type: 'hydrogen', name: 'H' },
    He: { color: '#ffdd44', glow: '#ffeeaa', type: 'helium', name: 'He' },
    energy: { color: '#00ccff', glow: '#88eeff', type: 'energy', name: '⚡' }   // ← ГОЛУБОЙ
};

export function drawParticle(ctx, x, y, radius, type, animTimer = 0) {
    const def = PARTICLE_DEFS[type];
    if (!def) return;

    const { color, glow, type: pType } = def;
    const phase = animTimer * 3;

    ctx.save();
    ctx.translate(x, y);
    ctx.shadowColor = glow;
    ctx.shadowBlur = radius * 1.2;

    if (pType === 'quark') {
        const pulse = 1 + 0.1 * Math.sin(phase * 2);
        const r = radius * pulse;
        // Основа
        ctx.beginPath();
        ctx.arc(0, 0, r, 0, Math.PI * 2);
        ctx.fillStyle = color;
        ctx.fill();

        // Внутренние глюонные точки
        for (let i = 0; i < 3; i++) {
            const angle = phase + (i * Math.PI * 2) / 3;
            const dist = r * 0.5;
            const px = Math.cos(angle) * dist;
            const py = Math.sin(angle) * dist;
            ctx.beginPath();
            ctx.arc(px, py, r * 0.2, 0, Math.PI * 2);
            ctx.fillStyle = '#ff44cc';
            ctx.fill();
        }

        // Уникальные особенности
        if (['u', 'c', 't'].includes(type)) {
            // Острые иголки
            ctx.strokeStyle = glow;
            ctx.lineWidth = 1;
            for (let i = 0; i < 4; i++) {
                const angle = phase + (i * Math.PI) / 2;
                const x1 = Math.cos(angle) * r * 0.8;
                const y1 = Math.sin(angle) * r * 0.8;
                const x2 = Math.cos(angle) * r * 1.4;
                const y2 = Math.sin(angle) * r * 1.4;
                ctx.beginPath();
                ctx.moveTo(x1, y1);
                ctx.lineTo(x2, y2);
                ctx.stroke();
            }
        } else if (type === 's') {
            // Кольцо Сатурна
            ctx.strokeStyle = glow;
            ctx.lineWidth = 1.5;
            ctx.beginPath();
            ctx.ellipse(0, 0, r * 1.3, r * 0.3, 0, 0, Math.PI * 2);
            ctx.stroke();
        } else if (type === 'b') {
            // Спираль внутри
            ctx.strokeStyle = '#fff';
            ctx.lineWidth = 1;
            ctx.beginPath();
            for (let i = 0; i <= 20; i++) {
                const a = (i / 20) * Math.PI * 4 + phase;
                const d = r * 0.8 * (i / 20);
                const sx = Math.cos(a) * d;
                const sy = Math.sin(a) * d;
                if (i === 0) ctx.moveTo(sx, sy);
                else ctx.lineTo(sx, sy);
            }
            ctx.stroke();
        } else if (type === 'c') {
            // Полосы
            ctx.strokeStyle = '#fff';
            ctx.lineWidth = 1;
            for (let i = -1; i <= 1; i += 2) {
                ctx.beginPath();
                ctx.moveTo(-r * 0.8, i * r * 0.3);
                ctx.lineTo(r * 0.8, i * r * 0.3);
                ctx.stroke();
            }
        }
    } else if (pType === 'gluon') {
        const pulse = 1 + 0.2 * Math.sin(phase * 5);
        const r = radius * pulse;
        ctx.beginPath();
        ctx.arc(0, 0, r, 0, Math.PI * 2);
        ctx.fillStyle = color;
        ctx.fill();
        ctx.strokeStyle = glow;
        ctx.lineWidth = 1;
        for (let i = 0; i < 6; i++) {
            const angle = phase * 0.5 + (i * Math.PI) / 3;
            const x1 = Math.cos(angle) * r * 0.6;
            const y1 = Math.sin(angle) * r * 0.6;
            const x2 = Math.cos(angle) * r * 1.3;
            const y2 = Math.sin(angle) * r * 1.3;
            ctx.beginPath();
            ctx.moveTo(x1, y1);
            ctx.lineTo(x2, y2);
            ctx.stroke();
        }
    } else if (pType === 'electron') {
        const alpha = 0.5 + 0.3 * Math.sin(phase * 4);
        const gradient = ctx.createRadialGradient(0, 0, 0, 0, 0, radius * 1.5);
        gradient.addColorStop(0, `rgba(255, 255, 0, ${alpha})`);
        gradient.addColorStop(1, 'rgba(255, 255, 0, 0)');
        ctx.beginPath();
        ctx.arc(0, 0, radius * 1.5, 0, Math.PI * 2);
        ctx.fillStyle = gradient;
        ctx.fill();
        ctx.beginPath();
        ctx.arc(0, 0, radius * 0.4, 0, Math.PI * 2);
        ctx.fillStyle = color;
        ctx.fill();
    } else if (pType === 'proton' || pType === 'neutron') {
        const r = radius;
        ctx.beginPath();
        ctx.arc(0, 0, r, 0, Math.PI * 2);
        ctx.fillStyle = color;
        ctx.fill();
        const quarkPositions = pType === 'proton'
            ? [{ col: '#e74c3c', angle: 0 }, { col: '#e74c3c', angle: 2.1 }, { col: '#3498db', angle: 4.2 }]
            : [{ col: '#3498db', angle: 0 }, { col: '#3498db', angle: 2.1 }, { col: '#e74c3c', angle: 4.2 }];
        for (const q of quarkPositions) {
            const angle = q.angle + phase * 0.7;
            const dist = r * 0.5;
            const qx = Math.cos(angle) * dist;
            const qy = Math.sin(angle) * dist;
            ctx.beginPath();
            ctx.arc(qx, qy, r * 0.25, 0, Math.PI * 2);
            ctx.fillStyle = q.col;
            ctx.fill();
        }
        ctx.strokeStyle = '#ff44cc';
        ctx.lineWidth = 1;
        for (let i = 0; i < quarkPositions.length; i++) {
            const a1 = quarkPositions[i].angle + phase * 0.7;
            const a2 = quarkPositions[(i + 1) % 3].angle + phase * 0.7;
            const x1 = Math.cos(a1) * r * 0.5, y1 = Math.sin(a1) * r * 0.5;
            const x2 = Math.cos(a2) * r * 0.5, y2 = Math.sin(a2) * r * 0.5;
            ctx.beginPath();
            ctx.moveTo(x1, y1);
            ctx.lineTo(x2, y2);
            ctx.stroke();
        }
    } else if (pType === 'hydrogen') {
        const r = radius;
        ctx.beginPath();
        ctx.arc(0, 0, r * 0.6, 0, Math.PI * 2);
        ctx.fillStyle = '#ffaa00';
        ctx.fill();
        ctx.beginPath();
        ctx.arc(0, 0, r * 1.2, 0, Math.PI * 2);
        ctx.strokeStyle = 'rgba(255, 255, 255, 0.2)';
        ctx.lineWidth = 1;
        ctx.stroke();
        const eAngle = phase * 2;
        const ex = Math.cos(eAngle) * r * 1.2;
        const ey = Math.sin(eAngle) * r * 1.2;
        ctx.beginPath();
        ctx.arc(ex, ey, r * 0.3, 0, Math.PI * 2);
        ctx.fillStyle = '#ffff00';
        ctx.fill();
    } else if (pType === 'helium') {
        const r = radius;
        ctx.beginPath();
        ctx.arc(0, 0, r * 0.8, 0, Math.PI * 2);
        ctx.fillStyle = '#ffdd44';
        ctx.fill();
        for (let i = 0; i < 2; i++) {
            const eAngle = phase * 2 + i * Math.PI;
            const ex = Math.cos(eAngle) * r * 1.2;
            const ey = Math.sin(eAngle) * r * 1.2;
            ctx.beginPath();
            ctx.arc(ex, ey, r * 0.25, 0, Math.PI * 2);
            ctx.fillStyle = '#ffff00';
            ctx.fill();
        }
    } else if (pType === 'energy') {
        const flash = Math.sin(phase * 8) * 0.5 + 0.5;
        ctx.beginPath();
        ctx.arc(0, 0, radius * flash, 0, Math.PI * 2);
        ctx.fillStyle = color;   // теперь #00ccff
        ctx.fill();
        ctx.shadowBlur = radius * 2;
        ctx.fill();
    }

    ctx.restore();
}