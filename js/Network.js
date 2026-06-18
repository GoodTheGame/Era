const QUARK_COLORS = {
    u: '#e74c3c', d: '#3498db', c: '#2ecc71', s: '#f1c40f', t: '#9b59b6', b: '#e67e22',
    g: '#ff44cc', e: '#ffff00', p: '#ffaa00', n: '#aa00ff', H: '#22aaff'
};

class Pack {
    constructor(from, to, quarkType, count, distance) {
        this.from = from;
        this.to = to;
        this.quarkType = quarkType;
        this.count = count;
        this.distance = distance;
        this.totalDistance = distance;
        this.done = false;
    }
}

export class Network {
    constructor(game) {
        this.game = game;
        this.connections = [];
        this.packs = [];
        this.sendTimer = 0;
        this.sendInterval = 2.0;
    }

    addConnection(from, to) {
        if (from.type === 'hub' || to.type === 'hub') return;
        const valid = ['quantum_resonator', 'gluon_extractor', 'lepton_extractor', 'node',
                       'hadron_synthesizer', 'electron_capture', 'connector'];
        if (!valid.includes(from.type)) return;
        const fromSize = from.getSize(), toSize = to.getSize();
        const tileSize = 64;
        const x1 = (from.tx + fromSize.w / 2) * tileSize;
        const y1 = (from.ty + fromSize.h / 2) * tileSize;
        const x2 = (to.tx + toSize.w / 2) * tileSize;
        const y2 = (to.ty + toSize.h / 2) * tileSize;
        const distTiles = Math.hypot(x2 - x1, y2 - y1) / tileSize;
        if (distTiles > 6) return;
        this.connections.push({ from, to });
    }

    removeConnection(conn) {
        this.connections = this.connections.filter(c => c !== conn);
        this.packs = this.packs.filter(p => !(p.from === conn.from && p.to === conn.to));
    }

    removeAllConnections(building) {
        this.connections = this.connections.filter(c => c.from !== building && c.to !== building);
        this.packs = this.packs.filter(p => p.from !== building && p.to !== building);
    }

    findConnectionAt(worldX, worldY) {
        const threshold = 8;
        const tileSize = 64;
        for (const conn of this.connections) {
            const fromSize = conn.from.getSize(), toSize = conn.to.getSize();
            const x1 = (conn.from.tx + fromSize.w / 2) * tileSize;
            const y1 = (conn.from.ty + fromSize.h / 2) * tileSize;
            const x2 = (conn.to.tx + toSize.w / 2) * tileSize;
            const y2 = (conn.to.ty + toSize.h / 2) * tileSize;
            if (distToSegment(worldX, worldY, x1, y1, x2, y2) < threshold) return conn;
        }
        return null;
    }

    update(dt) {
        const speed = 10 * 64;
        for (const pack of this.packs) {
            pack.distance -= speed * dt;
            if (pack.distance <= 0) {
                pack.done = true;
                const to = pack.to;
                if (to.type === 'hadron_synthesizer' || to.type === 'electron_capture') {
                    if (!to.inputResources) to.inputResources = {};
                    to.inputResources[pack.quarkType] = (to.inputResources[pack.quarkType] || 0) + pack.count;
                } else {
                    if (!to.resources) to.resources = {};
                    to.resources[pack.quarkType] = (to.resources[pack.quarkType] || 0) + pack.count;
                    // Узел больше не отправляет автоматически — только по таймеру
                }
            }
        }
        this.packs = this.packs.filter(p => !p.done);

        this.sendTimer += dt;
        if (this.sendTimer >= this.sendInterval) {
            this.sendTimer -= this.sendInterval;
            const sources = new Set(this.connections.map(c => c.from));
            for (const src of sources) {
                this.sendFromBuilding(src);
            }
        }
    }

    sendFromBuilding(source) {
        const tileSize = 64;
        const conns = this.connections.filter(c => c.from === source);
        if (conns.length === 0) return;

        let stock;
        if (source.type === 'hadron_synthesizer' || source.type === 'electron_capture') {
            stock = source.outputResources;
        } else {
            stock = source.resources;
        }
        if (!stock) return;

        const resTypes = Object.keys(stock);
        for (const q of resTypes) {
            // Проверяем фильтр, если это узел или коннектор
            if ((source.type === 'node' || source.type === 'connector') && source.filterType) {
                if (q !== source.filterType) continue; // пропускаем ресурсы, не соответствующие фильтру
            }
            let available = stock[q];
            if (available <= 0) continue;
            const totalConns = conns.length;
            const perConn = Math.floor(available / totalConns);
            let remainder = available % totalConns;
            for (let i = 0; i < totalConns; i++) {
                let count = perConn + (i < remainder ? 1 : 0);
                if (count <= 0) continue;
                count = Math.min(count, 10);
                stock[q] -= count;
                const conn = conns[i];
                const fromSize = source.getSize(), toSize = conn.to.getSize();
                const x1 = (source.tx + fromSize.w / 2) * tileSize;
                const y1 = (source.ty + fromSize.h / 2) * tileSize;
                const x2 = (conn.to.tx + toSize.w / 2) * tileSize;
                const y2 = (conn.to.ty + toSize.h / 2) * tileSize;
                const dist = Math.hypot(x2 - x1, y2 - y1);
                this.packs.push(new Pack(source, conn.to, q, count, dist));
            }
        }
    }

    render(ctx) {
        const tileSize = 64;
        ctx.strokeStyle = '#00ffff';
        ctx.lineWidth = 2;
        for (const conn of this.connections) {
            const fromSize = conn.from.getSize(), toSize = conn.to.getSize();
            const x1 = (conn.from.tx + fromSize.w / 2) * tileSize;
            const y1 = (conn.from.ty + fromSize.h / 2) * tileSize;
            const x2 = (conn.to.tx + toSize.w / 2) * tileSize;
            const y2 = (conn.to.ty + toSize.h / 2) * tileSize;
            ctx.beginPath();
            ctx.moveTo(x1, y1);
            ctx.lineTo(x2, y2);
            ctx.stroke();
        }

        for (const pack of this.packs) {
            const fromSize = pack.from.getSize(), toSize = pack.to.getSize();
            const x1 = (pack.from.tx + fromSize.w / 2) * tileSize;
            const y1 = (pack.from.ty + fromSize.h / 2) * tileSize;
            const x2 = (pack.to.tx + toSize.w / 2) * tileSize;
            const y2 = (pack.to.ty + toSize.h / 2) * tileSize;
            const dx = x2 - x1, dy = y2 - y1;
            const total = Math.hypot(dx, dy);
            if (total === 0) continue;
            const progress = 1 - pack.distance / pack.totalDistance;
            const px = x1 + dx * progress;
            const py = y1 + dy * progress;
            const color = QUARK_COLORS[pack.quarkType] || '#ffffff';
            ctx.beginPath();
            ctx.arc(px, py, 8, 0, Math.PI * 2);
            ctx.fillStyle = color;
            ctx.fill();
            ctx.strokeStyle = '#fff';
            ctx.lineWidth = 1;
            ctx.stroke();
            ctx.fillStyle = '#000';
            ctx.font = 'bold 10px "Segoe UI"';
            ctx.textAlign = 'center';
            ctx.textBaseline = 'middle';
            ctx.fillText(pack.count, px, py);
        }
    }
}

function distToSegment(px, py, x1, y1, x2, y2) {
    const vx = x2 - x1, vy = y2 - y1;
    const wx = px - x1, wy = py - y1;
    const c1 = vx * wx + vy * wy;
    if (c1 <= 0) return Math.hypot(wx, wy);
    const c2 = vx * vx + vy * vy;
    if (c2 <= c1) return Math.hypot(px - x2, py - y2);
    const b = c1 / c2;
    const projx = x1 + b * vx, projy = y1 + b * vy;
    return Math.hypot(px - projx, py - projy);
}