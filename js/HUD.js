// js/HUD.js
export class HUD {
    constructor(game) {
        this.game = game;
        this.toolbar = document.getElementById('toolbar');
        this.buttons = {};

        this._createToolbar();
        this._bindHotkeys();
    }

    _createToolbar() {
        const items = [
            { key: '1', type: 'belt',           label: '1<br>Лента' },
            { key: '2', type: 'tunnel',         label: '2<br>Тоннель' },
            { key: '3', type: 'splitter',       label: '3<br>Разделит.' },
            { key: '4', type: 'balancer',       label: '4<br>Баланс.' }, // Добавлено
            { key: '5', type: 'extractor',      label: '5<br>Добыча' },
            { key: '6', type: 'cutter',         label: '6<br>Резак' },
            { key: '7', type: 'rotator',        label: '7<br>Вращатель' },
            { key: '8', type: 'mixer',          label: '8<br>Смеситель' },
            { key: '9', type: 'storage',        label: '9<br>Склад' },
            { key: '0', type: 'trash',          label: '0<br>Мусор' }
        ];

        items.forEach((item) => {
            const btn = document.createElement('button');
            btn.className = 'tool-btn';
            btn.innerHTML = item.label;
            btn.dataset.type = item.type;
            
            btn.addEventListener('click', () => this.selectBuilding(item.type));
            this.toolbar.appendChild(btn);
            this.buttons[item.type] = btn;
        });
    }

    _bindHotkeys() {
        window.addEventListener('keydown', (e) => {
            const key = e.key;
            
            if (key === '1') this.selectBuilding('belt');
            else if (key === '2') this.selectBuilding('tunnel');
            else if (key === '3') this.selectBuilding('splitter');
            else if (key === '4') this.selectBuilding('balancer');
            else if (key === '5') this.selectBuilding('extractor');
            else if (key === '6') this.selectBuilding('cutter');
            else if (key === '7') this.selectBuilding('rotator');
            else if (key === '8') this.selectBuilding('mixer');
            else if (key === '9') this.selectBuilding('storage');
            else if (key === '0') this.selectBuilding('trash');
            
            else if (key.toLowerCase() === 'r' || key.toLowerCase() === 'к') {
                this.game.buildingManager.rotateGhost();
            }
            
            else if (key.toLowerCase() === 'q' || key.toLowerCase() === 'й') {
                this.game.buildingManager.pipette();
            }
            
            else if (key === 'Escape') {
                this.selectBuilding(null);
            }
        });
    }

    selectBuilding(type) {
        this.game.selectedType = type;
        this.updateActiveButton();
        
        if (type) {
            this.game.buildingManager._updateGhostFromLastMouse();
        }
    }

    updateActiveButton() {
        Object.values(this.buttons).forEach(btn => btn.classList.remove('active'));
        if (this.game.selectedType && this.buttons[this.game.selectedType]) {
            this.buttons[this.game.selectedType].classList.add('active');
        }
    }
}