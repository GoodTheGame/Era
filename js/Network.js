// js/Network.js
import { drawParticle } from './ParticleRenderer.js';

const STACK_SIZE = 100;
const NODE_CAPACITY = 1000;

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
        this.pullTimer = 0;
        this.pullInterval = 1.0;
    }

    // ---------- геометрия ----------
    getRect(building) {
        const size = building.getSize();
        return {
            x1: building.tx,
            y1: building.ty,
            x2: building.tx + size.w,
            y2: building.ty + size.h
        };
    }

    rectDistance(r1, r2) {
        const dx = Math.max(r1.x1 - r2.x2, r2.x1 - r1.x2, 0);
        const dy = Math.max(r1.y1 - r2.y2, r2.y1 - r1.y2, 0);
        return Math.max(dx, dy);
    }

    getMaxDistance(fromType, toType) {
        if (fromType === 'connector' && toType === 'connector') return 15;
        return 5;
    }

    // ---------- типы зданий ----------
    isFactory(type) {
        return type === 'hadron_synthesizer' || type === 'electron_capture' || type === 'fusion_press';
    }

    isExtractor(type) {
        return type === 'quantum_resonator' || type === 'gluon_extractor' || type === 'lepton_extractor';
    }

    // Максимальное количество исходящих проводов для типа здания
    getMaxOutputs(type) {
        if (this.isExtractor(type)) return 4;   // источники (добытчики)
        if (this.isFactory(type)) return 2;     // фабрики
        return Infinity;                         // узлы, коннекторы — без ограничений
    }

    /** Определяет выходной тип ресурса для источника (добытчика или фабрики) */
    getSourceResourceType(building) {
        if (building.type === 'quantum_resonator') {
            const quarkNames = ['u', 'd', 'c', 's', 't', 'b'];
            return quarkNames[building.quarkType || 0];
        }
        if (building.type === 'gluon_extractor') return 'g';
        if (building.type === 'lepton_extractor') return 'e';
        if (building.type === 'hadron_synthesizer') {
            return (building.recipe === 'proton') ? 'p' : 'n';
        }
        if (building.type === 'electron_capture') return 'H';
        if (building.type === 'fusion_press') return 'He';
        return null;
    }

    // ---------- управление проводами ----------
    addConnection(from, to) {
        if (from.type === 'hub' || to.type === 'hub') return;

        const validSources = [
            'quantum_resonator', 'gluon_extractor', 'lepton_extractor', 'node',
            'hadron_synthesizer', 'electron_capture', 'connector', 'fusion_press'
        ];
        if (!validSources.includes(from.type)) return;
        if (this.isExtractor(to.type)) return;

        // Проверяем лимит выходных проводов
        const currentOutputs = this.connections.filter(c => c.from === from).length;
        const maxOutputs = this.getMaxOutputs(from.type);
        if (currentOutputs >= maxOutputs) return;

        const maxDist = this.getMaxDistance(from.type, to.type);
        const r1 = this.getRect(from);
        const r2 = this.getRect(to);
        const dist = this.rectDistance(r1, r2);
        if (dist > maxDist) return;

        this.connections.push({ from, to });

        // ---------- НАСЛЕДОВАНИЕ ФИЛЬТРА ----------
        if (to.type === 'connector') {
            const sourceResource = this.getSourceResourceType(from);
            if (sourceResource) {
                to.filterType = sourceResource;
            } else if (from.type === 'connector' && from.filterType) {
                to.filterType = from.filterType;
            }
        }
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

    // ---------- проверки рецептов и лимитов ----------
    isResourceNeededByFactory(building, quarkType) {
        if (building.type === 'hadron_synthesizer') return ['u', 'd', 'g'].includes(quarkType);
        if (building.type === 'electron_capture') return ['p', 'e'].includes(quarkType);
        if (building.type === 'fusion_press') return ['H'].includes(quarkType);
        return false;
    }

    canFactoryAccept(factory, quarkType) {
        if (!factory.inputResources) return true;
        const cur = factory.inputResources[quarkType] || 0;
        return cur < STACK_SIZE;
    }

    canAcceptTarget(target, quarkType) {
        if (this.isExtractor(target.type)) return false;
        if (this.isFactory(target.type)) {
            return this.isResourceNeededByFactory(target, quarkType) && this.canFactoryAccept(target, quarkType);
        }
        if (!target.resources) return true;
        const cap = target.type === 'node' ? NODE_CAPACITY : STACK_SIZE;
        const cur = target.resources[quarkType] || 0;
        return cur < cap;
    }

    hasValidPath(connector, quarkType) {
        const visited = new Set();
        const queue = [connector];
        while (queue.length > 0) {
            const current = queue.shift();
            const outConns = this.connections.filter(c => c.from === current);
            for (const conn of outConns) {
                const to = conn.to;
                if (visited.has(to)) continue;
                visited.add(to);
                if (to.type === 'connector') {
                    if (to.filterType && to.filterType !== quarkType) continue;
                    queue.push(to);
                } else {
                    if (this.canAcceptTarget(to, quarkType)) return true;
                }
            }
        }
        return false;
    }

    /** Все выходы коннектора: соседние фабрики + валидные провода */
    getOutputTargets(connector, quarkType) {
        const targets = [];
        const connectorRect = this.getRect(connector);

        // Соседние фабрики
        for (const b of this.game.buildingManager.buildings) {
            if (b === connector) continue;
            if (!this.isFactory(b.type)) continue;
            if (!this.canAcceptTarget(b, quarkType)) continue;
            const d = this.rectDistance(connectorRect, this.getRect(b));
            if (d <= 1) {
                const fromSize = connector.getSize(), toSize = b.getSize();
                const tileSize = 64;
                const x1 = (connector.tx + fromSize.w / 2) * tileSize;
                const y1 = (connector.ty + fromSize.h / 2) * tileSize;
                const x2 = (b.tx + toSize.w / 2) * tileSize;
                const y2 = (b.ty + toSize.h / 2) * tileSize;
                const realDist = Math.max(Math.hypot(x2 - x1, y2 - y1), 32);
                targets.push({ target: b, dist: realDist });
            }
        }

        // Исходящие провода
        const outConns = this.connections.filter(c => c.from === connector);
        for (const conn of outConns) {
            const to = conn.to;
            if (to.type === 'connector') {
                if (to.filterType && to.filterType !== quarkType) continue;
                if (!this.hasValidPath(to, quarkType)) continue;
            } else {
                if (!this.canAcceptTarget(to, quarkType)) continue;
            }
            const fromSize = connector.getSize(), toSize = to.getSize();
            const tileSize = 64;
            const x1 = (connector.tx + fromSize.w / 2) * tileSize;
            const y1 = (connector.ty + fromSize.h / 2) * tileSize;
            const x2 = (to.tx + toSize.w / 2) * tileSize;
            const y2 = (to.ty + toSize.h / 2) * tileSize;
            const dist = Math.hypot(x2 - x1, y2 - y1);
            targets.push({ target: to, dist });
        }

        return targets;
    }

    // ========== Активная подтяжка: создаёт пачки от источника к коннектору ==========
    pullResourcesForConnectors() {
        for (const b of this.game.buildingManager.buildings) {
            if (b.type !== 'connector') continue;
            const filter = b.filterType;
            if (!filter || filter === 'energy') continue;

            const targets = this.getOutputTargets(b, filter);
            const numTargets = targets.length;
            if (numTargets === 0) continue;

            const totalRequest = Math.min(5 * numTargets, 30);

            const inConns = this.connections.filter(c => c.to === b);
            let pulled = 0;
            for (const conn of inConns) {
                const source = conn.from;
                let stock;
                if (source.type === 'hadron_synthesizer' || source.type === 'electron_capture' || source.type === 'fusion_press') {
                    stock = source.outputResources;
                } else {
                    stock = source.resources;
                }
                if (!stock || !stock[filter] || stock[filter] <= 0) continue;

                const canPull = Math.min(totalRequest - pulled, stock[filter]);
                if (canPull <= 0) break;
                // Создаём пачку от источника к коннектору
                const fromSize = source.getSize(), toSize = b.getSize();
                const tileSize = 64;
                const x1 = (source.tx + fromSize.w / 2) * tileSize;
                const y1 = (source.ty + fromSize.h / 2) * tileSize;
                const x2 = (b.tx + toSize.w / 2) * tileSize;
                const y2 = (b.ty + toSize.h / 2) * tileSize;
                const dist = Math.max(Math.hypot(x2 - x1, y2 - y1), 32);
                this.packs.push(new Pack(source, b, filter, canPull, dist));
                stock[filter] -= canPull;
                pulled += canPull;
            }
        }
    }

    // ========== основной update ==========
    update(dt) {
        // 1) Активная подтяжка (создание пачек источник → коннектор)
        this.pullTimer += dt;
        if (this.pullTimer >= this.pullInterval) {
            this.pullTimer -= this.pullInterval;
            this.pullResourcesForConnectors();
        }

        // 2) Движение и доставка пачек (скорость 5 тайлов/с для наглядности)
        const speed = 5 * 64;
        for (const pack of this.packs) {
            pack.distance -= speed * dt;
            if (pack.distance <= 0) {
                pack.done = true;
                const to = pack.to;

                if (to.type === 'connector') {
                    if (to.filterType && pack.quarkType !== to.filterType) continue;

                    const targets = this.getOutputTargets(to, pack.quarkType);
                    if (targets.length > 0) {
                        const perTarget = Math.floor(pack.count / targets.length);
                        let remainder = pack.count % targets.length;
                        for (let i = 0; i < targets.length; i++) {
                            let cnt = perTarget + (i < remainder ? 1 : 0);
                            if (cnt <= 0) continue;
                            const { target, dist } = targets[i];
                            this.packs.push(new Pack(to, target, pack.quarkType, cnt, dist));
                        }
                    }
                } else if (this.isFactory(to.type)) {
                    if (!to.inputResources) to.inputResources = {};
                    const cur = to.inputResources[pack.quarkType] || 0;
                    const canAdd = Math.min(pack.count, STACK_SIZE - cur);
                    if (canAdd > 0) to.inputResources[pack.quarkType] = cur + canAdd;
                } else if (!this.isExtractor(to.type)) {
                    if (!to.resources) to.resources = {};
                    const cur = to.resources[pack.quarkType] || 0;
                    const cap = to.type === 'node' ? NODE_CAPACITY : STACK_SIZE;
                    const canAdd = Math.min(pack.count, cap - cur);
                    if (canAdd > 0) to.resources[pack.quarkType] = cur + canAdd;
                }
            }
        }
        this.packs = this.packs.filter(p => !p.done);

        // 3) Пассивная отправка от не-коннекторов (но НЕ в коннекторы)
        this.sendTimer += dt;
        if (this.sendTimer >= this.sendInterval) {
            this.sendTimer -= this.sendInterval;
            const sources = new Set(this.connections.map(c => c.from));
            for (const src of sources) {
                if (src.type === 'connector') continue;
                this.sendFromBuilding(src);
            }
        }
    }

    sendFromBuilding(source) {
        const tileSize = 64;
        const conns = this.connections.filter(c => c.from === source && c.to.type !== 'connector');
        if (conns.length === 0) return;

        let stock;
        if (source.type === 'hadron_synthesizer' || source.type === 'electron_capture' || source.type === 'fusion_press') {
            stock = source.outputResources;
        } else {
            stock = source.resources;
        }
        if (!stock) return;

        const resTypes = Object.keys(stock);
        for (const q of resTypes) {
            let available = stock[q];
            if (available <= 0) continue;

            const validConns = conns.filter(conn => {
                const to = conn.to;
                if (this.isFactory(to.type)) {
                    return this.isResourceNeededByFactory(to, q) && this.canFactoryAccept(to, q);
                }
                if (this.isExtractor(to.type)) return false;
                if (!to.resources) return true;
                const cap = to.type === 'node' ? NODE_CAPACITY : STACK_SIZE;
                const cur = to.resources[q] || 0;
                return cur < cap;
            });

            if (validConns.length === 0) continue;

            const totalConns = validConns.length;
            const perConn = Math.floor(available / totalConns);
            let remainder = available % totalConns;

            for (let i = 0; i < totalConns; i++) {
                let count = perConn + (i < remainder ? 1 : 0);
                if (count <= 0) continue;
                count = Math.min(count, 10);
                stock[q] -= count;
                const conn = validConns[i];
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
            drawParticle(ctx, px, py, 7, pack.quarkType, this.game.buildingManager.beltAnimTimer || 0);
            ctx.fillStyle = '#fff';
            ctx.font = 'bold 7px "Segoe UI"';
            ctx.textAlign = 'center';
            ctx.fillText(pack.count, px, py + 10);
            ctx.fillText(pack.quarkType, px, py - 6);
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