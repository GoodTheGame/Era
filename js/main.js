import { Camera } from './Camera.js';
import { GameMap } from './Map.js';
import { Building, BuildingManager } from './Buildings.js';
import { HUD } from './HUD.js';
import { atlasLoader } from './AtlasLoader.js';
import { spriteRenderer } from './SpriteRenderer.js';

class Game {
    constructor() {
        this.canvas = document.getElementById('gameCanvas');
        this.ctx = this.canvas.getContext('2d');
        
        this.camera = new Camera(this.canvas);
        this.map = new GameMap(this.camera);
        this.buildingManager = new BuildingManager(this);
        this.hud = new HUD(this);

        this.selectedType = null;
        this.lastTime = 0;
        this.assetsLoaded = false;

        // Создаём Хаб один раз в центре (пункт 8)
        this._spawnHub();
        
        // Камера стартует на Хабе
        this.camera.x = this.hub.tx * this.map.tileSize + this.map.tileSize * 2;
        this.camera.y = this.hub.ty * this.map.tileSize + this.map.tileSize * 2;

        this._resize();
        window.addEventListener('resize', () => this._resize());
        this._bindMouse();

        this._loadAssets().then(() => {
            this.assetsLoaded = true;
            requestAnimationFrame((t) => this._loop(t));
        });
    }

    _spawnHub() {
        // Центр карты (0,0) - хаб занимает 4x4, смещаем чтобы центр был в (0,0)
        this.hub = new Building(-2, -2, 'hub', 0);
        this.buildingManager.buildings.push(this.hub);
    }

    async _loadAssets() {
        console.log('🔄 Загрузка атласов...');
        
        await atlasLoader.loadAtlas(
            'atlas0_lq',
            'assets/storage/sprites/res_built/atlas/atlas0_lq.json',
            'assets/storage/sprites/res_built/atlas/atlas0_lq.png'
        );
        
        await atlasLoader.loadAtlas(
            'atlas0_mq',
            'assets/storage/sprites/res_built/atlas/atlas0_mq.json',
            'assets/storage/sprites/res_built/atlas/atlas0_mq.png'
        );
        
        await atlasLoader.loadAtlas(
            'atlas0_hq',
            'assets/storage/sprites/res_built/atlas/atlas0_hq.json',
            'assets/storage/sprites/res_built/atlas/atlas0_hq.png'
        );

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
            this.buildingManager.setMousePosition(e.clientX, e.clientY);
            this.buildingManager.onMouseMove();
        });

        this.canvas.addEventListener('mousedown', (e) => {
            if (e.button === 0 && !e.shiftKey) {
                this.buildingManager.onLeftMouseDown();
            } else if (e.button === 2) {
                this.buildingManager.onRightMouseDown();
            }
        });

        this.canvas.addEventListener('mouseup', (e) => {
            if (e.button === 0) {
                this.buildingManager.onLeftMouseUp();
            } else if (e.button === 2) {
                this.buildingManager.onRightMouseUp();
            }
        });

        this.canvas.addEventListener('mouseleave', () => {
            this.buildingManager.onLeftMouseUp();
            this.buildingManager.onRightMouseUp();
        });

        this.canvas.addEventListener('contextmenu', (e) => e.preventDefault());
    }

    _loop(time) {
        const dt = (time - this.lastTime) / 1000;
        this.lastTime = time;

        this._update(dt);
        this._render();

        requestAnimationFrame((t) => this._loop(t));
    }

    _update(dt) {
        this.camera.update(dt);
        this.buildingManager.update(dt);
    }

    _render() {
        this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);

        this.ctx.save();
        this.camera.applyTransform(this.ctx);

        this.map.render(this.ctx);
        this.buildingManager.render(this.ctx, this.camera);

        this.ctx.restore();

        if (!this.assetsLoaded) {
            this.ctx.fillStyle = '#fff';
            this.ctx.font = '20px Arial';
            this.ctx.textAlign = 'center';
            this.ctx.fillText('Загрузка ассетов...', this.canvas.width / 2, this.canvas.height / 2);
        }
    }
}

const game = new Game();