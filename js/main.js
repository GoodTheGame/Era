// main.js
import { Camera } from './Camera.js';
import { GameMap } from './Map.js';
import { Building, BuildingManager } from './Buildings.js';
import { HUD } from './HUD.js';
import { atlasLoader } from './AtlasLoader.js';
import { spriteRenderer } from './SpriteRenderer.js';
import { Network } from './Network.js';
import { UIManager } from './UIManager.js';
import { KeybindManager } from './config/keybindManager.js';
import { FactoryUI } from './FactoryUI.js';
import { RESOURCE_COLORS } from './resources.js';

class Game {
    constructor() {
        this.canvas = document.getElementById('gameCanvas');
        this.ctx = this.canvas.getContext('2d');
        this.camera = new Camera(this.canvas);
        this.map = new GameMap(this.camera);
        this.buildingManager = new BuildingManager(this);
        this.network = new Network(this);
        this.uiManager = new UIManager(this);
        this.factoryUI = new FactoryUI(this);
        this.hud = new HUD(this);
        this.selectedType = null;
        this.lastTime = 0;
        this.assetsLoaded = false;
        this.input = { shiftKey: false };
        this.lastMouseX = 0;
        this.lastMouseY = 0;
        this.globalAnimTime = 0;
        this.showRecipeInfo = false;
        this.keybindManager = new KeybindManager(this);
        this.dragPreview = null; // { type, count, x, y }

        this._spawnStar();
        this.camera.x = this.star.tx * this.map.tileSize + 2.5 * this.map.tileSize;
        this.camera.y = this.star.ty * this.map.tileSize + 2.5 * this.map.tileSize;

        this._resize();
        window.addEventListener('resize', () => this._resize());
        this._bindMouse();
        window.addEventListener('keydown', (e) => this.input.shiftKey = e.shiftKey);
        window.addEventListener('keyup', (e) => this.input.shiftKey = e.shiftKey);

        window.addEventListener('keydown', (e) => {
            if (!this.factoryUI.visible && !this.uiManager.isUIOpen()) return;
            const key = e.key.toLowerCase();
            if (['w','a','s','d','ц','ф','ы','в','arrowup','arrowdown','arrowleft','arrowright','shift','control','alt'].includes(key)) {
                return;
            }
            if (this.factoryUI.visible) this.factoryUI.close();
            if (this.uiManager.isUIOpen()) this.uiManager.closeUI();
        });

        this._loadAssets().then(() => {
            this.assetsLoaded = true;
            requestAnimationFrame((t) => this._loop(t));
        });
    }

    _spawnStar() {
        this.star = new Building(-2, -2, 'star', 0);
        this.buildingManager.buildings.push(this.star);
    }

    async _loadAssets() {
        console.log('🔄 Загрузка атласов...');
        await atlasLoader.loadAtlas('atlas0_lq', 'assets/sprites/res_built/atlas/atlas0_lq.json', 'assets/sprites/res_built/atlas/atlas0_lq.png');
        await atlasLoader.loadAtlas('atlas0_mq', 'assets/sprites/res_built/atlas/atlas0_mq.json', 'assets/sprites/res_built/atlas/atlas0_mq.png');
        await atlasLoader.loadAtlas('atlas0_hq', 'assets/sprites/res_built/atlas/atlas0_hq.json', 'assets/sprites/res_built/atlas/atlas0_hq.png');
        await atlasLoader.waitForAll();
    }

    _resize() {
        this.canvas.width = window.innerWidth;
        this.canvas.height = window.innerHeight;
        const minDimension = Math.min(this.canvas.width, this.canvas.height);
        if (minDimension > 1500) spriteRenderer.setQuality('hq');
        else if (minDimension > 800) spriteRenderer.setQuality('mq');
        else spriteRenderer.setQuality('lq');
    }

    _bindMouse() {
        this.canvas.addEventListener('mousemove', (e) => {
            this.lastMouseX = e.clientX;
            this.lastMouseY = e.clientY;
            this.buildingManager.setMousePosition(e.clientX, e.clientY);
            this.buildingManager.onMouseMove();

            // Обновляем позицию drag preview
            if (this.dragPreview) {
                this.dragPreview.x = e.clientX;
                this.dragPreview.y = e.clientY;
            }
        });

        this.canvas.addEventListener('mousedown', (e) => {
            if (e.button === 1 || (e.button === 0 && e.shiftKey)) return;

            const worldPos = this.camera.screenToWorld(e.clientX, e.clientY);

            // Правая кнопка мыши для удаления из UI
            if (e.button === 2) {
                if (this.factoryUI.visible && this.factoryUI.hitTest(worldPos.x, worldPos.y)) {
                    this.factoryUI.onRightClick(worldPos.x, worldPos.y);
                    return;
                }
                if (this.uiManager.isUIOpen() && this.uiManager.isPointInsideUI(worldPos.x, worldPos.y)) {
                    this.uiManager.onRightClick(worldPos.x, worldPos.y);
                    return;
                }
            }

            // Перетаскивание левой кнопкой
            if (this.factoryUI.visible) {
                if (this.factoryUI.onMouseDown(worldPos.x, worldPos.y)) {
                    const slot = this.factoryUI.dragging;
                    if (slot) {
                        const b = this.factoryUI.activeFactory;
                        let type = null, count = 0;
                        if (slot.slotType === 'input' && slot.port.accepts) {
                            type = slot.port.accepts[0];
                            count = Math.min(b.inputResources?.[type] || 0, 100);
                        } else if (slot.slotType === 'output' && slot.port.produces) {
                            type = slot.port.produces;
                            count = Math.min(b.outputResources?.[type] || 0, 100);
                        }
                        if (type) {
                            this.dragPreview = { type, count, x: e.clientX, y: e.clientY };
                        }
                    }
                    return;
                }
            }
            if (this.uiManager.isUIOpen()) {
                if (this.uiManager.onMouseDown(worldPos.x, worldPos.y)) {
                    const drag = this.uiManager.dragging;
                    if (drag && this.uiManager.activeNode.resources?.[drag.key]) {
                        const count = Math.min(this.uiManager.activeNode.resources[drag.key], 100);
                        this.dragPreview = { type: drag.key, count, x: e.clientX, y: e.clientY };
                    }
                    return;
                }
            }

            const tile = this.map.worldToTile(worldPos.x, worldPos.y);
            const building = this.buildingManager.getBuildingAt(tile.tx, tile.ty);

            // Фабричный UI
            if (this.factoryUI.visible) {
                if (this.factoryUI.onClick(worldPos.x, worldPos.y)) {
                    return;
                } else {
                    this.factoryUI.close();
                    return;
                }
            }

            // UI узла
            if (this.uiManager.isUIOpen()) {
                this.uiManager.handleClick(worldPos.x, worldPos.y);
                return;
            }

            // Открытие UI узла или фабрики
            if (e.button === 0 && building && !this.selectedType) {
                if (building.type === 'node') {
                    this.uiManager.openNodeUI(building);
                    return;
                }
                if (this.factoryUI.open(building)) {
                    return;
                }
            }

            // Строительство / провода
            if (e.button === 0 && !e.shiftKey) {
                this.buildingManager.onLeftMouseDown();
            } else if (e.button === 2) {
                this.buildingManager.onRightMouseDown();
            }
        });

        this.canvas.addEventListener('mouseup', (e) => {
            const worldPos = this.camera.screenToWorld(e.clientX, e.clientY);
            if (this.factoryUI.visible && this.factoryUI.dragging) {
                this.factoryUI.onMouseUp(worldPos.x, worldPos.y);
                this.dragPreview = null;
                return;
            }
            if (this.uiManager.isUIOpen() && this.uiManager.dragging) {
                this.uiManager.onMouseUp(worldPos.x, worldPos.y);
                this.dragPreview = null;
                return;
            }

            if (e.button === 0) this.buildingManager.onLeftMouseUp();
            else if (e.button === 2) this.buildingManager.onRightMouseUp();
        });

        this.canvas.addEventListener('mouseleave', () => {
            this.buildingManager.onLeftMouseUp();
            this.buildingManager.onRightMouseUp();
            if (this.factoryUI.visible) this.factoryUI.onMouseUp(0, 0);
            if (this.uiManager.isUIOpen()) this.uiManager.onMouseUp(0, 0);
            this.dragPreview = null;
        });

        this.canvas.addEventListener('contextmenu', (e) => e.preventDefault());
    }

    _loop(time) {
        const dt = Math.min((time - this.lastTime) / 1000, 0.1);
        this.lastTime = time;
        this._update(dt);
        this._render();
        requestAnimationFrame((t) => this._loop(t));
    }

    _update(dt) {
        this.globalAnimTime += dt;
        this.camera.update(dt);
        this.buildingManager.update(dt);
        this.network.update(dt);
        this.factoryUI.closeIfInvalid();
    }

    _render() {
        this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);
        this.ctx.save();
        this.camera.applyTransform(this.ctx);
        this.map.render(this.ctx);
        this.buildingManager.render(this.ctx, this.camera);
        this.network.render(this.ctx);

        if (this.buildingManager.wireModeActive && this.selectedType === 'wire') {
            const worldPos = this.camera.screenToWorld(this.lastMouseX, this.lastMouseY);
            this.network.renderPreview(this.ctx, this.buildingManager.wireSource, worldPos.x, worldPos.y);
        }

        if (this.factoryUI.visible) {
            this.factoryUI.render(this.ctx);
        }

        this.ctx.restore();

        if (this.uiManager.isUIOpen()) {
            this.ctx.save();
            this.camera.applyTransform(this.ctx);
            this.uiManager.render(this.ctx);
            this.ctx.restore();
        }

        // Drag preview (поверх всего)
        if (this.dragPreview) {
            const { type, count, x, y } = this.dragPreview;
            const color = RESOURCE_COLORS[type] || '#ffffff';
            this.ctx.fillStyle = color;
            this.ctx.beginPath();
            this.ctx.arc(x, y, 12, 0, Math.PI * 2);
            this.ctx.fill();
            this.ctx.fillStyle = '#fff';
            this.ctx.font = 'bold 11px "Segoe UI"';
            this.ctx.textAlign = 'center';
            this.ctx.fillText(count, x, y + 14);
        }

        if (!this.assetsLoaded) {
            this.ctx.fillStyle = '#fff';
            this.ctx.font = '20px Arial';
            this.ctx.textAlign = 'center';
            this.ctx.fillText('Загрузка ассетов...', this.canvas.width / 2, this.canvas.height / 2);
        }
    }
}

const game = new Game();