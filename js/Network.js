// js/Network.js
import { drawParticle } from './ParticleRenderer.js';

const FACTORY_INPUT_LIMIT = 10;
const STACK_SIZE = 100;
const NODE_CAPACITY = 1000;
const MATTER_COLOR = '#8899aa';
const ENERGY_COLOR = '#00ffff';

export const QUARK_COLORS = {
    u: '#e74c3c', d: '#3498db', c: '#2ecc71', s: '#f1c40f', t: '#9b59b6', b: '#e67e22',
    g: '#ff44cc', e: '#ffff00', p: '#ffaa00', n: '#aa00ff', H: '#22aaff',
    He: '#ffdd44', energy: '#00ffff', u: '#e74c3c',
};

class Pack {
    constructor(from, to, quarkType, count, distance, fromPortIndex = 0, toPortIndex = 0) {
        this.from = from;
        this.to = to;
        this.quarkType = quarkType;
        this.count = count;
        this.distance = distance;
        this.totalDistance = distance;
        this.fromPortIndex = fromPortIndex;
        this.toPortIndex = toPortIndex;
        this.done = false;
    }
}

function hexToRgb(hex) {
    const r = parseInt(hex.slice(1, 3), 16);
    const g = parseInt(hex.slice(3, 5), 16);
    const b = parseInt(hex.slice(5, 7), 16);
    return `${r}, ${g}, ${b}`;
}

export class Network {
    constructor(game) {
        this.game = game;
        this.connections = [];
        this.packs = [];
        this.sendTimer = 0;
        this.sendInterval = 2.0;
    }

    // Получить порты здания с абсолютными координатами
    getPortPositions(building, type) {
    const tileSize = this.game.map.tileSize;
    const ports = type === 'energy' ? building.getEnergyPorts() : building.getItemPorts();
    if (!ports) return [];
    const size = building.getSize();
    const baseX = building.tx * tileSize;
    const baseY = building.ty * tileSize;
    const w = size.w * tileSize;
    const h = size.h * tileSize;
    const rotation = building.rotation || 0;

    return ports.map((port, index) => {
        // Применяем поворот к координатам порта
        let { x, y } = port;
        if (rotation === 1) {        // 90° по часовой
            x = 1 - port.y;
            y = port.x;
        } else if (rotation === 2) { // 180°
            x = 1 - port.x;
            y = 1 - port.y;
        } else if (rotation === 3) { // 270°
            x = port.y;
            y = 1 - port.x;
        }
        return {
            index,
            ...port,
            x, y, // переопределяем x,y с учётом поворота
            worldX: baseX + x * w,
            worldY: baseY + y * h
        };
    });
}

    isPortFree(building, portIndex, type) {
        return !this.connections.some(c =>
            (c.from === building && c.fromPortIndex === portIndex && c.type === type) ||
            (c.to === building && c.toPortIndex === portIndex && c.type === type)
        );
    }

    isFactory(type) {
        return type === 'hadron_synthesizer' || type === 'electron_capture' || type === 'fusion_press';
    }
    isExtractor(type) {
        return type === 'quantum_resonator' || type === 'gluon_extractor' || type === 'lepton_extractor';
    }
    isEnergyNode(type) {
        return type === 'energy_buffer' || type === 'connector_energy' || type === 'star' || type === 'fusion_press';
    }

    getSourceResourceType(building) {
        if (building.type === 'quantum_resonator') {
            const quarkNames = ['u', 'd', 'c', 's', 't', 'b'];
            return quarkNames[building.quarkType || 0];
        }
        if (building.type === 'gluon_extractor') return 'g';
        if (building.type === 'lepton_extractor') return 'e';
        if (building.type === 'hadron_synthesizer') return (building.recipe === 'proton') ? 'p' : 'n';
        if (building.type === 'electron_capture') return 'H';
        if (building.type === 'fusion_press') return 'He';
        if (building.type === 'energy_buffer') return 'energy';
        return null;
    }

    canAcceptResource(building, quarkType) {
        if (this.isExtractor(building.type)) return false;
        if (quarkType === 'energy') {
            if (building.type === 'node') return false;
            if (building.type === 'fusion_press') return false;
            if (this.isEnergyNode(building.type)) {
                const cur = building.resources?.['energy'] || 0;
                return cur < (building.type === 'star' ? 50 : NODE_CAPACITY);
            }
            return false;
        }
        if (building.type === 'star') {
            if (quarkType === 'p' || quarkType === 'n') {
                const cur = building.inputResources?.[quarkType] || 0;
                return cur < STACK_SIZE;
            }
            return false;
        }
        if (this.isFactory(building.type)) {
            const cur = building.inputResources?.[quarkType] || 0;
            return cur < FACTORY_INPUT_LIMIT;
        }
        const cap = building.type === 'node' ? NODE_CAPACITY : STACK_SIZE;
        const cur = building.resources?.[quarkType] || 0;
        return cur < cap;
    }

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

    addConnection(from, to, fromPortIndex = -1, toPortIndex = -1) {
    if (from === to || (from.type === 'star' && to.type === 'star')) return;
    const connectionType = this.game.hud.wireMode;
    if (connectionType === 'matter' && !this.isPathClear(from, to)) return;

    const portType = connectionType === 'energy' ? 'energy' : 'item';
    const fromPorts = this.getPortPositions(from, portType);
    const toPorts = this.getPortPositions(to, portType);
    if (!fromPorts.length || !toPorts.length) return;

    const maxDistTiles = connectionType === 'energy' ? 15 : 5;
    const tileDist = this.rectDistance(this.getRect(from), this.getRect(to));
    if (tileDist > maxDistTiles) return;

    if (fromPortIndex < 0) {
        for (const fp of fromPorts) {
            if ((fp.type === 'out' || fp.type === 'any') && this.isPortFree(from, fp.index, connectionType)) {
                fromPortIndex = fp.index;
                break;
            }
        }
    }
    if (toPortIndex < 0) {
        for (const tp of toPorts) {
            if ((tp.type === 'in' || tp.type === 'any') && this.isPortFree(to, tp.index, connectionType)) {
                toPortIndex = tp.index;
                break;
            }
        }
    }
    if (fromPortIndex === -1 || toPortIndex === -1) return;
    if (!this.isPortFree(from, fromPortIndex, connectionType) || !this.isPortFree(to, toPortIndex, connectionType)) return;

    const fromPort = fromPorts[fromPortIndex];
    const toPort = toPorts[toPortIndex];
    if (!fromPort || !toPort) return;

    // === Проверка совместимости ресурсов портов ===
    if (connectionType === 'matter') {
        // Если выходной порт жёстко привязан к одному ресурсу, а входной порт принимает конкретные ресурсы,
        // проверяем пересечение.
        const sourceRes = this.getSourceResourceType(from);
        if (fromPort.produces && toPort.accepts && toPort.accepts.length > 0) {
            if (!toPort.accepts.includes(fromPort.produces)) {
                return; // несовместимы
            }
        } else if (fromPort.produces && toPort.accepts) {
            if (!toPort.accepts.includes(fromPort.produces)) return;
        } else if (sourceRes && toPort.accepts && toPort.accepts.length > 0) {
            if (!toPort.accepts.includes(sourceRes)) return;
        }
    }

    let fromRole = fromPort.type;
    let toRole = toPort.type;
    if (fromRole === 'any') fromRole = 'out';
    if (toRole === 'any') toRole = 'in';

    if (fromRole === 'in') return;
    if (toRole === 'out') return;
    if (from === to && fromPortIndex === toPortIndex) return;

    let resourceType = null;
    const strict = connectionType === 'matter' && (this.isExtractor(from.type) || this.isFactory(from.type) || from.type === 'star');
    if (connectionType === 'matter') {
        resourceType = strict ? this.getSourceResourceType(from) : null;
    } else {
        resourceType = 'energy';
    }

    this.connections.push({
        from, to,
        type: connectionType,
        resourceType,
        fromPortIndex, toPortIndex,
        fromRole, toRole,
        strict
    });
}
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

    removeConnection(conn) {
        this.connections = this.connections.filter(c => c !== conn);
    }
    removeAllConnections(building) {
        this.connections = this.connections.filter(c => c.from !== building && c.to !== building);
        this.packs = this.packs.filter(p => p.from !== building && p.to !== building);
    }

    findConnectionAt(worldX, worldY) {
        const threshold = 6;
        let closest = null, minDist = threshold;
        for (const conn of this.connections) {
            const fp = this.getPortPositions(conn.from, conn.type).find(p => p.index === conn.fromPortIndex);
            const tp = this.getPortPositions(conn.to, conn.type).find(p => p.index === conn.toPortIndex);
            if (!fp || !tp) continue;
            const d = distToSegment(worldX, worldY, fp.worldX, fp.worldY, tp.worldX, tp.worldY);
            if (d < minDist) { minDist = d; closest = conn; }
        }
        return closest;
    }

    // Маршрутизатор
    processRouter(router, pack) {
    const mode = router.routerMode || 'split';
    const filter = router.filterType;
    const outConns = this.connections.filter(c => c.from === router && c.type === 'matter' && c.fromRole === 'out');
    if (outConns.length === 0) return;

    const leftTargets = outConns.filter(c => c.fromPortIndex === 1).map(c => c.to);
    const rightTargets = outConns.filter(c => c.fromPortIndex === 2).map(c => c.to);

    let leftCount = 0, rightCount = 0;
    if (mode === 'split') {
        leftCount = Math.ceil(pack.count / 2);
        rightCount = Math.floor(pack.count / 2);
    } else if (mode === 'priority_left') {
        if (filter && pack.quarkType !== filter) {
            rightCount = pack.count;
        } else {
            leftCount = pack.count;
        }
    } else if (mode === 'priority_right') {
        if (filter && pack.quarkType !== filter) {
            leftCount = pack.count;
        } else {
            rightCount = pack.count;
        }
    }

    const tileSize = this.game.map.tileSize;
    const sendToTargets = (targets, count, fromPortIndex) => {
        if (count <= 0 || targets.length === 0) return;
        const perTarget = Math.floor(count / targets.length);
        let rem = count % targets.length;
        for (const target of targets) {
            let cnt = perTarget + (rem > 0 ? 1 : 0);
            if (rem > 0) rem--;
            if (cnt <= 0) continue;
            const fromPos = this.getPortPositions(router, 'item')[fromPortIndex];
            const toPorts = this.getPortPositions(target, 'item');
            const toPort = toPorts.find(p => p.type === 'in' || p.type === 'any') || toPorts[0];
            const dist = Math.hypot(toPort.worldX - fromPos.worldX, toPort.worldY - fromPos.worldY) || 64;
            this.packs.push(new Pack(router, target, pack.quarkType, cnt, dist, fromPortIndex, toPort.index));
        }
    };
    sendToTargets(leftTargets, leftCount, 1);
    sendToTargets(rightTargets, rightCount, 2);
}

    update(dt) {
    for (const pack of this.packs) {
        const speed = pack.quarkType === 'energy' ? 100 * 64 : 1 * 64;
        pack.distance -= speed * dt;
        if (pack.distance <= 0) {
            pack.done = true;
            const to = pack.to;
            if (to.type === 'quantum_router') {
                this.processRouter(to, pack);
                continue;
            }
            if (to.type === 'connector_energy') {
                if (pack.quarkType !== 'energy') continue;
                const outConns = this.connections.filter(c => c.from === to && c.type === 'energy');
                for (const conn of outConns) {
                    const fp = this.getPortPositions(to, 'energy')[conn.fromPortIndex];
                    const tp = this.getPortPositions(conn.to, 'energy')[conn.toPortIndex];
                    if (!fp || !tp) continue;
                    const dist = Math.hypot(tp.worldX - fp.worldX, tp.worldY - fp.worldY);
                    this.packs.push(new Pack(to, conn.to, pack.quarkType, pack.count, dist, conn.fromPortIndex, conn.toPortIndex));
                }
                continue;
            }
            if (this.canAcceptResource(to, pack.quarkType)) {
                if (pack.quarkType === 'energy') {
                    if (!to.resources) to.resources = {};
                    const cur = to.resources['energy'] || 0;
                    const cap = to.type === 'star' ? 50 : NODE_CAPACITY;
                    const add = Math.min(pack.count, cap - cur);
                    if (add > 0) to.resources['energy'] = cur + add;
                } else {
                    if (this.isFactory(to.type)) {
                        if (!to.inputResources) to.inputResources = {};
                        const cur = to.inputResources[pack.quarkType] || 0;
                        const add = Math.min(pack.count, STACK_SIZE - cur);
                        if (add > 0) to.inputResources[pack.quarkType] = cur + add;
                    } else if (to.type === 'node') {
                        if (!to.resources) to.resources = {};
                        const cur = to.resources[pack.quarkType] || 0;
                        const add = Math.min(pack.count, NODE_CAPACITY - cur);
                        if (add > 0) to.resources[pack.quarkType] = cur + add;
                    } else if (to.type === 'star') {
                        if (pack.quarkType === 'p' || pack.quarkType === 'n') {
                            if (!to.inputResources) to.inputResources = {};
                            const cur = to.inputResources[pack.quarkType] || 0;
                            const add = Math.min(pack.count, STACK_SIZE - cur);
                            if (add > 0) to.inputResources[pack.quarkType] = cur + add;
                        }
                    } else {
                        if (!to.resources) to.resources = {};
                        const cur = to.resources[pack.quarkType] || 0;
                        const add = Math.min(pack.count, STACK_SIZE - cur);
                        if (add > 0) to.resources[pack.quarkType] = cur + add;
                    }
                }
            }
            // Больше не вызываем refreshOutgoingResourceTypes, чтобы линия не сбрасывалась
        }
    }
    this.packs = this.packs.filter(p => !p.done);

    this.sendTimer += dt;
    if (this.sendTimer >= this.sendInterval) {
        this.sendTimer -= this.sendInterval;
        const sources = new Set(this.connections.map(c => c.from));
        for (const src of sources) {
            if (src.type === 'connector_energy' || src.type === 'quantum_router') continue;
            this.sendFromBuilding(src);
        }
    }
}

    getConnectionRole(building, portIndex, portType) {
    const conns = this.connections.filter(c => {
        if (portType === 'item') return c.type === 'matter';
        else return c.type === 'energy';
    });
    for (const conn of conns) {
        if (conn.from === building && conn.fromPortIndex === portIndex) return conn.fromRole || 'out';
        if (conn.to === building && conn.toPortIndex === portIndex) return conn.toRole || 'in';
    }
    return null;
}
    sendFromBuilding(source) {
    const TRANSFER_LIMIT = 10;
    const tileSize = this.game.map.tileSize;
    const conns = this.connections.filter(c => c.from === source && c.type !== 'energy' && c.fromRole !== 'in');
    if (conns.length === 0) return;
    let stock;
    if (this.isFactory(source.type) || source.type === 'electron_capture' || source.type === 'fusion_press') {
        stock = source.outputResources;
    } else {
        stock = source.resources;
    }
    if (!stock) return;

    const isSourceStrict = this.isExtractor(source.type) || this.isFactory(source.type) || source.type === 'star';

    for (const q of Object.keys(stock)) {
        if (source.type === 'star' && q === 'energy') continue;
        let available = stock[q];
        if (available <= 0) continue;

        const validConns = conns.filter(conn => {
            if (isSourceStrict) {
                if (conn.resourceType && conn.resourceType !== q) return false;
                conn.resourceType = q;
            } else {
                // для нестрогих соединений не фиксируем resourceType
                if (conn.resourceType && conn.resourceType !== q) {
                    // оставляем старый, линия будет тёмно-серой
                } else {
                    conn.resourceType = q;
                }
            }
            return true;
        });
        if (validConns.length === 0) continue;

        const totalToSend = Math.min(available, TRANSFER_LIMIT);
        const total = validConns.length;
        const perConn = Math.floor(totalToSend / total);
        let remainder = totalToSend % total;
        for (let i = 0; i < total; i++) {
            let count = perConn + (i < remainder ? 1 : 0);
            if (count <= 0) continue;
            const conn = validConns[i];

            // Проверка, разрешён ли ресурс для входного порта приёмника
            const toPort = this.getPortPositions(conn.to, 'item')[conn.toPortIndex];
            if (toPort && toPort.accepts && !toPort.accepts.includes(q)) {
                continue; // пропускаем этот ресурс, если порт его не принимает
            }

            const to = conn.to;
            let cap = STACK_SIZE;
            if (this.isFactory(to.type)) cap = FACTORY_INPUT_LIMIT - (to.inputResources?.[q] || 0);
            else if (to.type === 'star') cap = (q === 'p' || q === 'n') ? FACTORY_INPUT_LIMIT - (to.inputResources?.[q] || 0) : 0;
            else if (to.type === 'node') cap = NODE_CAPACITY - (to.resources?.[q] || 0);
            else cap = STACK_SIZE - (to.resources?.[q] || 0);
            count = Math.min(count, cap, available);
            if (count <= 0) continue;
            stock[q] -= count;
            available = stock[q];

            const fp = this.getPortPositions(source, 'item')[conn.fromPortIndex];
            const tp = this.getPortPositions(to, 'item')[conn.toPortIndex];
            if (!fp || !tp) continue;
            const dist = Math.hypot(tp.worldX - fp.worldX, tp.worldY - fp.worldY);
            this.packs.push(new Pack(source, to, q, count, dist, conn.fromPortIndex, conn.toPortIndex));
        }

        if (stock[q] <= 0) {
            delete stock[q];
            if (isSourceStrict) {
                for (const conn of conns) {
                    if (conn.resourceType === q) {
                        conn.resourceType = null;
                    }
                }
            }
        }
    }
}
isPathClear(fromBuilding, toBuilding) {
    // Только для matter-соединений
    const fromSize = fromBuilding.getSize();
    const toSize = toBuilding.getSize();
    const tileSize = this.game.map.tileSize;
    const x1 = (fromBuilding.tx + fromSize.w/2) * tileSize;
    const y1 = (fromBuilding.ty + fromSize.h/2) * tileSize;
    const x2 = (toBuilding.tx + toSize.w/2) * tileSize;
    const y2 = (toBuilding.ty + toSize.h/2) * tileSize;

    // Перебираем тайлы, которые пересекает отрезок
    const steps = Math.max(Math.abs(x2 - x1), Math.abs(y2 - y1)) / tileSize;
    for (let i = 0; i <= steps; i++) {
        const t = i / steps;
        const wx = x1 + (x2 - x1) * t;
        const wy = y1 + (y2 - y1) * t;
        const tile = this.game.map.worldToTile(wx, wy);
        const building = this.game.buildingManager.getBuildingAt(tile.tx, tile.ty);
        if (building && building !== fromBuilding && building !== toBuilding &&
            !['node', 'quantum_router', 'star', 'connector_energy'].includes(building.type)) {
            return false;
        }
    }
    return true;
}
refreshOutgoingResourceTypes(building) {
    const newType = this.getSourceResourceType(building);
    for (const conn of this.connections) {
        if (conn.from === building && conn.type === 'matter') {
            conn.resourceType = newType;
        }
    }
}

    render(ctx) {
        const tileSize = this.game.map.tileSize;
        const now = performance.now() / 1000;
        const hud = this.game.hud;

        for (const conn of this.connections) {
    const show = conn.type === 'energy' ? hud.showEnergyConnections : hud.showMatterConnections;
    if (!show) continue;
    const fp = this.getPortPositions(conn.from, conn.type === 'energy' ? 'energy' : 'item')[conn.fromPortIndex];
    const tp = this.getPortPositions(conn.to, conn.type === 'energy' ? 'energy' : 'item')[conn.toPortIndex];
    if (!fp || !tp) continue;

    let strokeColor;
    if (conn.type === 'energy') {
        strokeColor = ENERGY_COLOR;
    } else {
        // Собираем типы всех пачек, которые сейчас движутся по этому соединению
        const packTypes = new Set();
        for (const pack of this.packs) {
            if ((pack.from === conn.from && pack.to === conn.to && pack.fromPortIndex === conn.fromPortIndex && pack.toPortIndex === conn.toPortIndex) ||
                (pack.from === conn.to && pack.to === conn.from && pack.fromPortIndex === conn.toPortIndex && pack.toPortIndex === conn.fromPortIndex)) {
                packTypes.add(pack.quarkType);
            }
        }
        if (packTypes.size > 1) {
            strokeColor = '#555555';   // тёмно-серый для смешанного потока
        } else if (packTypes.size === 1) {
            const singleType = packTypes.values().next().value;
            strokeColor = QUARK_COLORS[singleType] || MATTER_COLOR;
        } else {
            // Нет активных пачек
            if (conn.strict) {
                // Для строгих источников берём resourceType соединения
                strokeColor = conn.resourceType ? (QUARK_COLORS[conn.resourceType] || MATTER_COLOR) : MATTER_COLOR;
            } else {
                // Для нестрогих (узлы) показываем светло-серый, если ресурс не зафиксирован
                strokeColor = conn.resourceType ? (QUARK_COLORS[conn.resourceType] || MATTER_COLOR) : MATTER_COLOR;
            }
        }
    }

    ctx.strokeStyle = strokeColor;
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(fp.worldX, fp.worldY);
    ctx.lineTo(tp.worldX, tp.worldY);
    ctx.stroke();
}

        // Подсветка при наведении
        if (!this.game.selectedType && this.game.buildingManager.lastMouseX !== undefined) {
            const worldPos = this.game.camera.screenToWorld(this.game.buildingManager.lastMouseX, this.game.buildingManager.lastMouseY);
            const closest = this.findConnectionAt(worldPos.x, worldPos.y);
            if (closest) {
                const fp = this.getPortPositions(closest.from, closest.type)[closest.fromPortIndex];
                const tp = this.getPortPositions(closest.to, closest.type)[closest.toPortIndex];
                if (fp && tp) {
                    ctx.strokeStyle = 'rgba(255, 50, 50, 0.8)';
                    ctx.lineWidth = 3;
                    ctx.beginPath();
                    ctx.moveTo(fp.worldX, fp.worldY);
                    ctx.lineTo(tp.worldX, tp.worldY);
                    ctx.stroke();
                }
            }
        }

        // Пачки
        for (const pack of this.packs) {
            const fp = this.getPortPositions(pack.from, pack.quarkType === 'energy' ? 'energy' : 'item')[pack.fromPortIndex];
            const tp = this.getPortPositions(pack.to, pack.quarkType === 'energy' ? 'energy' : 'item')[pack.toPortIndex];
            if (!fp || !tp) continue;
            const dx = tp.worldX - fp.worldX, dy = tp.worldY - fp.worldY;
            const total = Math.hypot(dx, dy);
            if (total === 0) continue;
            const progress = 1 - pack.distance / pack.totalDistance;
            const cx = fp.worldX + dx * progress;
            const cy = fp.worldY + dy * progress;
            const pulseLen = total * 0.25;
            const half = pulseLen / 2;
            const sx = cx - (dx / total) * half, sy = cy - (dy / total) * half;
            const ex = cx + (dx / total) * half, ey = cy + (dy / total) * half;
            const baseColor = pack.quarkType === 'energy' ? ENERGY_COLOR : (QUARK_COLORS[pack.quarkType] || MATTER_COLOR);
            const rgb = pack.quarkType === 'energy' ? '0, 255, 255' : hexToRgb(baseColor);
            const grad = ctx.createLinearGradient(sx, sy, ex, ey);
            grad.addColorStop(0, `rgba(${rgb}, 0)`);
            grad.addColorStop(0.3, baseColor);
            grad.addColorStop(0.7, baseColor);
            grad.addColorStop(1, `rgba(${rgb}, 0)`);
            ctx.strokeStyle = grad;
            ctx.lineWidth = 6;
            ctx.lineCap = 'round';
            ctx.beginPath();
            ctx.moveTo(sx, sy);
            ctx.lineTo(ex, ey);
            ctx.stroke();

            drawParticle(ctx, cx, cy, 7, pack.quarkType, now);
            ctx.fillStyle = '#fff';
            ctx.font = 'bold 7px "Segoe UI"';
            ctx.textAlign = 'center';
            ctx.fillText(pack.count, cx, cy + 12);
        }
    }

    renderPreview(ctx, fromBuilding, mouseWorldX, mouseWorldY) {
    if (!fromBuilding) return;
    const connectionType = this.game.hud.wireMode;
    const portType = connectionType === 'energy' ? 'energy' : 'item';
    const fromPorts = this.getPortPositions(fromBuilding, portType);
    if (!fromPorts.length) return;
    
    

    let fromPos = null;
    const manager = this.game.buildingManager;
    if (manager.wireSource === fromBuilding && manager.wireSourcePortIndex >= 0) {
        const port = fromPorts[manager.wireSourcePortIndex];
        if (port && !this.connections.some(c =>
            c.from === fromBuilding && c.fromPortIndex === port.index && c.type === connectionType
        )) {
            fromPos = port;
        }
    }
    if (!fromPos) {
        for (const fp of fromPorts) {
            if ((fp.type === 'out' || fp.type === 'any') && this.isPortFree(fromBuilding, fp.index, connectionType)) {
                fromPos = fp;
                break;
            }
        }
    }
    if (!fromPos) return;

    // Определяем цель: если порт под курсором, используем его здание
    const targetBuilding = (manager.wireHoveredBuilding && manager.wireHoveredPortIndex >= 0)
        ? manager.wireHoveredBuilding
        : null;

    let outOfRange = false;
    const maxDistTiles = connectionType === 'energy' ? 15 : 5;

    if (targetBuilding) {
        const dist = this.rectDistance(this.getRect(fromBuilding), this.getRect(targetBuilding));
        outOfRange = dist > maxDistTiles;
    } else {
        const tile = this.game.map.worldToTile(mouseWorldX, mouseWorldY);
        const targetRect = { x1: tile.tx, y1: tile.ty, x2: tile.tx + 1, y2: tile.ty + 1 };
        const dist = this.rectDistance(this.getRect(fromBuilding), targetRect);
        outOfRange = dist > maxDistTiles;
    }


    let blocked = false;
        if (connectionType === 'matter' && targetBuilding) {
            blocked = !this.isPathClear(fromBuilding, targetBuilding);
        }
    ctx.strokeStyle = outOfRange ? 'rgba(255, 50, 50, 0.8)' : (connectionType === 'energy' ? ENERGY_COLOR : MATTER_COLOR);
    ctx.lineWidth = 2;
    ctx.setLineDash([8, 4]);
    ctx.beginPath();
    ctx.moveTo(fromPos.worldX, fromPos.worldY);
    ctx.lineTo(mouseWorldX, mouseWorldY);
    ctx.stroke();
    ctx.setLineDash([]);
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
