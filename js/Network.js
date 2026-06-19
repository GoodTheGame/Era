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
        if ((fromType === 'connector' || fromType === 'connector_energy') &&
            (toType === 'connector' || toType === 'connector_energy')) return 15;
        return 5;
    }

    // ---------- типы зданий ----------
    isFactory(type) {
        return type === 'hadron_synthesizer' || type === 'electron_capture' || type === 'fusion_press';
    }

    isExtractor(type) {
        return type === 'quantum_resonator' || type === 'gluon_extractor' || type === 'lepton_extractor';
    }

    /** Может ли здание быть частью энергосети (принимать/отдавать энергию) */
    isEnergyNode(type) {
        return type === 'energy_buffer' || type === 'connector_energy' || type === 'star' || type === 'fusion_press';
    }

    /** Может ли здание быть частью материальной сети */
    isMatterNode(type) {
        return type === 'node' || type === 'connector' || this.isExtractor(type) || this.isFactory(type);
    }

    getMaxOutputs(type) {
        if (this.isExtractor(type)) return 4;
        if (this.isFactory(type)) return 2;
        return Infinity;
    }

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
        if (building.type === 'energy_buffer') return 'energy';
        return null;
    }

    canAcceptResource(building, quarkType) {
        if (this.isExtractor(building.type)) return false;

        if (quarkType === 'energy') {
            if (building.type === 'node') return false;
            if (this.isEnergyNode(building.type)) {
                const cur = building.resources?.['energy'] || 0;
                return cur < (building.type === 'star' ? 50 : NODE_CAPACITY);
            }
            return false;
        }

        if (this.isFactory(building.type)) {
            return this.isResourceNeededByFactory(building, quarkType) && this.canFactoryAccept(building, quarkType);
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
                if (to.type === 'connector' || to.type === 'connector_energy') {
                    if (to.filterType && to.filterType !== quarkType) continue;
                    queue.push(to);
                } else {
                    if (this.canAcceptResource(to, quarkType)) return true;
                }
            }
        }
        return false;
    }

    getOutputTargets(connector, quarkType) {
        const targets = [];
        const connectorRect = this.getRect(connector);

        for (const b of this.game.buildingManager.buildings) {
            if (b === connector) continue;
            if (!this.isFactory(b.type) && !this.isEnergyNode(b.type)) continue;
            if (!this.canAcceptResource(b, quarkType)) continue;
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

        const outConns = this.connections.filter(c => c.from === connector);
        for (const conn of outConns) {
            const to = conn.to;
            if (to.type === 'connector' || to.type === 'connector_energy') {
                if (to.filterType && to.filterType !== quarkType) continue;
                if (!this.hasValidPath(to, quarkType)) continue;
            } else {
                if (!this.canAcceptResource(to, quarkType)) continue;
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

    // ---------- управление проводами ----------
    addConnection(from, to) {
        if (from.type === 'star' && to.type === 'star') return;

        const validSources = [
            'quantum_resonator', 'gluon_extractor', 'lepton_extractor', 'node',
            'hadron_synthesizer', 'electron_capture', 'connector', 'fusion_press',
            'energy_buffer', 'connector_energy'
        ];
        if (!validSources.includes(from.type)) return;
        if (this.isExtractor(to.type)) return;

        const currentOutputs = this.connections.filter(c => c.from === from).length;
        const maxOutputs = this.getMaxOutputs(from.type);
        if (currentOutputs >= maxOutputs) return;

        const maxDist = this.getMaxDistance(from.type, to.type);
        const r1 = this.getRect(from);
        const r2 = this.getRect(to);
        const dist = this.rectDistance(r1, r2);
        if (dist > maxDist) return;

        const connectionType = this.game.hud.wireMode;

        // Проверки совместимости типов сети
        if (connectionType === 'energy') {
            // Энергосвязь: источник должен быть в энергосети, приёмник тоже (или фабрика, производящая энергию)
            if (!this.isEnergyNode(from.type) && from.type !== 'fusion_press') return;
            if (!this.isEnergyNode(to.type) && to.type !== 'fusion_press') return;
        } else {
            // Материальная связь: ни источник, ни приёмник не должны быть чисто энергетическими
            if (from.type === 'connector_energy' || from.type === 'energy_buffer') return;
            if (to.type === 'connector_energy' || to.type === 'energy_buffer') return;
        }

        this.connections.push({ from, to, type: connectionType });

        if (to.type === 'connector') {
            const sourceResource = this.getSourceResourceType(from);
            if (sourceResource) {
                to.filterType = sourceResource;
            } else if (from.type === 'connector' && from.filterType) {
                to.filterType = from.filterType;
            }
            if (to.filterType && to._lastFilter && to.filterType !== to._lastFilter) {
                this.removeAllConnections(to);
            }
            to._lastFilter = to.filterType;
        }
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
        const tileSize = 64;
        let closest = null;
        let minDist = threshold;

        for (const conn of this.connections) {
            const fromSize = conn.from.getSize(), toSize = conn.to.getSize();
            const yOffset = conn.type === 'energy' ? -3 : 3;
            const x1 = (conn.from.tx + fromSize.w / 2) * tileSize;
            const y1 = (conn.from.ty + fromSize.h / 2) * tileSize + yOffset;
            const x2 = (conn.to.tx + toSize.w / 2) * tileSize;
            const y2 = (conn.to.ty + toSize.h / 2) * tileSize + yOffset;
            const d = distToSegment(worldX, worldY, x1, y1, x2, y2);
            if (d < minDist) {
                minDist = d;
                closest = conn;
            }
        }
        return closest;
    }

    // ========== Активная подтяжка ==========
    pullResourcesForConnectors() {
        for (const b of this.game.buildingManager.buildings) {
            if (b.type !== 'connector') continue;
            const filter = b.filterType;
            if (!filter) continue;

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
        this.pullTimer += dt;
        if (this.pullTimer >= this.pullInterval) {
            this.pullTimer -= this.pullInterval;
            this.pullResourcesForConnectors();
        }

        for (const pack of this.packs) {
            const speed = pack.quarkType === 'energy' ? 100 * 64 : 1 * 64;
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
                    } else {
                        if (this.canAcceptResource(to, pack.quarkType)) {
                            if (!to.resources) to.resources = {};
                            const cur = to.resources[pack.quarkType] || 0;
                            const cap = STACK_SIZE;
                            const canAdd = Math.min(pack.count, cap - cur);
                            if (canAdd > 0) to.resources[pack.quarkType] = cur + canAdd;
                        }
                    }
                } else if (to.type === 'connector_energy') {
                    const outConns = this.connections.filter(c => c.from === to);
                    for (const conn of outConns) {
                        const fromSize = to.getSize(), toSize = conn.to.getSize();
                        const tileSize = 64;
                        const x1 = (to.tx + fromSize.w / 2) * tileSize;
                        const y1 = (to.ty + fromSize.h / 2) * tileSize;
                        const x2 = (conn.to.tx + toSize.w / 2) * tileSize;
                        const y2 = (conn.to.ty + toSize.h / 2) * tileSize;
                        const dist = Math.hypot(x2 - x1, y2 - y1);
                        this.packs.push(new Pack(to, conn.to, pack.quarkType, pack.count, dist));
                    }
                } else if (this.isFactory(to.type)) {
                    if (!to.inputResources) to.inputResources = {};
                    const cur = to.inputResources[pack.quarkType] || 0;
                    const canAdd = Math.min(pack.count, STACK_SIZE - cur);
                    if (canAdd > 0) to.inputResources[pack.quarkType] = cur + canAdd;
                } else if (to.type === 'node') {
                    if (!to.resources) to.resources = {};
                    const cur = to.resources[pack.quarkType] || 0;
                    const cap = NODE_CAPACITY;
                    const canAdd = Math.min(pack.count, cap - cur);
                    if (canAdd > 0) {
                        to.resources[pack.quarkType] = cur + canAdd;
                        const outConns = this.connections.filter(c => c.from === to && c.to.type !== 'connector' && c.to.type !== 'connector_energy');
                        if (outConns.length > 0) {
                            const perConn = Math.floor(canAdd / outConns.length);
                            let rem = canAdd % outConns.length;
                            for (const conn of outConns) {
                                let cnt = perConn + (rem > 0 ? 1 : 0);
                                if (cnt <= 0) continue;
                                rem--;
                                const fromSize = to.getSize(), toSize = conn.to.getSize();
                                const tileSize = 64;
                                const x1 = (to.tx + fromSize.w / 2) * tileSize;
                                const y1 = (to.ty + fromSize.h / 2) * tileSize;
                                const x2 = (conn.to.tx + toSize.w / 2) * tileSize;
                                const y2 = (conn.to.ty + toSize.h / 2) * tileSize;
                                const dist = Math.hypot(x2 - x1, y2 - y1);
                                this.packs.push(new Pack(to, conn.to, pack.quarkType, cnt, dist));
                            }
                            to.resources[pack.quarkType] = Math.max(0, (to.resources[pack.quarkType] || 0) - canAdd);
                        }
                    }
                } else if (to.type === 'energy_buffer' || to.type === 'star') {
                    if (!to.resources) to.resources = {};
                    const cur = to.resources[pack.quarkType] || 0;
                    const cap = to.type === 'star' ? 50 : NODE_CAPACITY;
                    const canAdd = Math.min(pack.count, cap - cur);
                    if (canAdd > 0) to.resources[pack.quarkType] = cur + canAdd;
                } else if (!this.isExtractor(to.type)) {
                    if (!to.resources) to.resources = {};
                    const cur = to.resources[pack.quarkType] || 0;
                    const cap = STACK_SIZE;
                    const canAdd = Math.min(pack.count, cap - cur);
                    if (canAdd > 0) to.resources[pack.quarkType] = cur + canAdd;
                }
            }
        }
        this.packs = this.packs.filter(p => !p.done);

        this.sendTimer += dt;
        if (this.sendTimer >= this.sendInterval) {
            this.sendTimer -= this.sendInterval;
            const sources = new Set(this.connections.map(c => c.from));
            for (const src of sources) {
                if (src.type === 'connector' || src.type === 'connector_energy') continue;
                this.sendFromBuilding(src);
            }
        }
    }

    sendFromBuilding(source) {
        const tileSize = 64;
        const conns = this.connections.filter(c => c.from === source && c.to.type !== 'connector' && c.to.type !== 'connector_energy');
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

            const validConns = conns.filter(conn => this.canAcceptResource(conn.to, q));

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

    updateDownstreamFilters(building) {
        if (building.type === 'connector' && building.filterType) {
            building._lastFilter = building.filterType;
            this.removeAllConnections(building);
        }
    }

    // ========== Рендер ==========
    render(ctx) {
        const tileSize = 64;
        const now = performance.now() / 1000;
        const hud = this.game.hud;

        const MATTER_COLOR = '#8899aa';
        const ENERGY_COLOR = '#00ffff';

        // Статические линии
        for (const conn of this.connections) {
            const show = conn.type === 'energy' ? hud.showEnergyConnections : hud.showMatterConnections;
            if (!show) continue;

            const fromSize = conn.from.getSize(), toSize = conn.to.getSize();
            const yOffset = conn.type === 'energy' ? -3 : 3;
            const x1 = (conn.from.tx + fromSize.w / 2) * tileSize;
            const y1 = (conn.from.ty + fromSize.h / 2) * tileSize + yOffset;
            const x2 = (conn.to.tx + toSize.w / 2) * tileSize;
            const y2 = (conn.to.ty + toSize.h / 2) * tileSize + yOffset;

            const strokeColor = conn.type === 'energy' ? ENERGY_COLOR : MATTER_COLOR;
            ctx.strokeStyle = strokeColor;
            ctx.lineWidth = 2;
            ctx.beginPath();
            ctx.moveTo(x1, y1);
            ctx.lineTo(x2, y2);
            ctx.stroke();
        }

        // Подсветка ближайшего провода красным (если нет выбранного инструмента)
        if (!this.game.selectedType && this.game.buildingManager.lastMouseX !== undefined) {
            const worldPos = this.game.camera.screenToWorld(this.game.buildingManager.lastMouseX, this.game.buildingManager.lastMouseY);
            const closest = this.findConnectionAt(worldPos.x, worldPos.y);
            if (closest) {
                const fromSize = closest.from.getSize(), toSize = closest.to.getSize();
                const yOffset = closest.type === 'energy' ? -3 : 3;
                const x1 = (closest.from.tx + fromSize.w / 2) * tileSize;
                const y1 = (closest.from.ty + fromSize.h / 2) * tileSize + yOffset;
                const x2 = (closest.to.tx + toSize.w / 2) * tileSize;
                const y2 = (closest.to.ty + toSize.h / 2) * tileSize + yOffset;
                ctx.strokeStyle = 'rgba(255, 50, 50, 0.8)';
                ctx.lineWidth = 3;
                ctx.beginPath();
                ctx.moveTo(x1, y1);
                ctx.lineTo(x2, y2);
                ctx.stroke();
            }
        }

        // Паки (ресурсы) с тем же сдвигом
        for (const pack of this.packs) {
            const fromSize = pack.from.getSize(), toSize = pack.to.getSize();
            const yOffset = pack.quarkType === 'energy' ? -3 : 3;
            const x1 = (pack.from.tx + fromSize.w / 2) * tileSize;
            const y1 = (pack.from.ty + fromSize.h / 2) * tileSize + yOffset;
            const x2 = (pack.to.tx + toSize.w / 2) * tileSize;
            const y2 = (pack.to.ty + toSize.h / 2) * tileSize + yOffset;
            const dx = x2 - x1, dy = y2 - y1;
            const total = Math.hypot(dx, dy);
            if (total === 0) continue;

            const progress = 1 - pack.distance / pack.totalDistance;
            const centerX = x1 + dx * progress;
            const centerY = y1 + dy * progress;

            const pulseLen = total * 0.25;
            const halfLen = pulseLen / 2;
            const startX = centerX - (dx / total) * halfLen;
            const startY = centerY - (dy / total) * halfLen;
            const endX = centerX + (dx / total) * halfLen;
            const endY = centerY + (dy / total) * halfLen;

            const baseColor = pack.quarkType === 'energy' ? ENERGY_COLOR : MATTER_COLOR;
            const gradient = ctx.createLinearGradient(startX, startY, endX, endY);
            gradient.addColorStop(0, `rgba(${baseColor === ENERGY_COLOR ? '0, 255, 255' : '136, 153, 170'}, 0)`);
            gradient.addColorStop(0.3, baseColor);
            gradient.addColorStop(0.7, baseColor);
            gradient.addColorStop(1, `rgba(${baseColor === ENERGY_COLOR ? '0, 255, 255' : '136, 153, 170'}, 0)`);

            ctx.strokeStyle = gradient;
            ctx.lineWidth = 6;
            ctx.lineCap = 'round';
            ctx.beginPath();
            ctx.moveTo(startX, startY);
            ctx.lineTo(endX, endY);
            ctx.stroke();

            drawParticle(ctx, centerX, centerY, 7, pack.quarkType, now);
            ctx.fillStyle = '#fff';
            ctx.font = 'bold 7px "Segoe UI"';
            ctx.textAlign = 'center';
            ctx.fillText(pack.count, centerX, centerY + 12);
        }
    }

    renderPreview(ctx, fromBuilding, mouseWorldX, mouseWorldY) {
        if (!fromBuilding) return;
        const tileSize = 64;
        const fromSize = fromBuilding.getSize();
        const x1 = (fromBuilding.tx + fromSize.w / 2) * tileSize;
        const y1 = (fromBuilding.ty + fromSize.h / 2) * tileSize;
        const x2 = mouseWorldX;
        const y2 = mouseWorldY;

        const dx = x2 - x1, dy = y2 - y1;
        const length = Math.hypot(dx, dy);
        if (length === 0) return;

        let maxDist = 5;
        if (fromBuilding.type === 'connector' || fromBuilding.type === 'connector_energy') maxDist = 15;
        const maxDistPx = maxDist * tileSize;

        const outOfRange = length > maxDistPx;
        const MATTER_COLOR = '#8899aa';
        const ENERGY_COLOR = '#00ffff';
        const previewColor = this.game.hud.wireMode === 'energy' ? ENERGY_COLOR : MATTER_COLOR;
        ctx.strokeStyle = outOfRange ? 'rgba(255, 50, 50, 0.8)' : previewColor;
        ctx.lineWidth = 2;
        ctx.setLineDash([8, 4]);
        ctx.beginPath();
        ctx.moveTo(x1, y1);
        ctx.lineTo(x2, y2);
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