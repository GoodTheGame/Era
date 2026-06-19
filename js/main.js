// main.js
import { Camera } from './Camera.js';
import { GameMap } from './Map.js';
import { Building, BuildingManager } from './Buildings.js';
import { HUD } from './HUD.js';
import { atlasLoader } from './AtlasLoader.js';
import { spriteRenderer } from './SpriteRenderer.js';
import { Network } from './Network.js';
import { UIManager } from './UIManager.js';

class Game {
    constructor() {
        this.canvas = document.getElementById('gameCanvas');
        this.ctx = this.canvas.getContext('2d');
        this.camera = new Camera(this.canvas);
        this.map = new GameMap(this.camera);
        this.buildingManager = new BuildingManager(this);
        this.network = new Network(this);
        this.uiManager = new UIManager(this);
        this.hud = new HUD(this);
        this.selectedType = null;
        this.lastTime = 0;
        this.assetsLoaded = false;
        this.input = { shiftKey: false };
        this.lastMouseX = 0;
        this.lastMouseY = 0;
        this.globalAnimTime = 0;   // ← глобальный таймер для всех анимаций

        this._spawnStar();
        this.camera.x = this.star.tx * this.map.tileSize + 2.5 * this.map.tileSize;
        this.camera.y = this.star.ty * this.map.tileSize + 2.5 * this.map.tileSize;

        this._resize();
        window.addEventListener('resize', () => this._resize());
        this._bindMouse();
        window.addEventListener('keydown', (e) => this.input.shiftKey = e.shiftKey);
        window.addEventListener('keyup', (e) => this.input.shiftKey = e.shiftKey);

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
        });
        this.canvas.addEventListener('mousedown', (e) => {
            const worldPos = this.camera.screenToWorld(e.clientX, e.clientY);
            const tile = this.map.worldToTile(worldPos.x, worldPos.y);
            const building = this.buildingManager.getBuildingAt(tile.tx, tile.ty);

            if (this.uiManager.isUIOpen()) {
                this.uiManager.handleClick(worldPos.x, worldPos.y);
                return;
            }

            if (e.button === 0 && building && building.type === 'node' && !this.selectedType) {
                this.uiManager.openNodeUI(building);
                return;
            }

            if (e.button === 0 && !e.shiftKey) {
                this.buildingManager.onLeftMouseDown();
            } else if (e.button === 2) {
                this.buildingManager.onRightMouseDown();
            }
        });
        this.canvas.addEventListener('mouseup', (e) => {
            if (e.button === 0) this.buildingManager.onLeftMouseUp();
            else if (e.button === 2) this.buildingManager.onRightMouseUp();
        });
        this.canvas.addEventListener('mouseleave', () => {
            this.buildingManager.onLeftMouseUp();
            this.buildingManager.onRightMouseUp();
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
        this.globalAnimTime += dt;   // ← обновляем глобальный таймер
        this.camera.update(dt);
        this.buildingManager.update(dt);
        this.network.update(dt);
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

        this.ctx.restore();

        if (this.uiManager.isUIOpen()) {
            this.ctx.save();
            this.camera.applyTransform(this.ctx);
            this.uiManager.render(this.ctx);
            this.ctx.restore();
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