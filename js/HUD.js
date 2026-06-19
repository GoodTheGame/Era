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
            { key: '1', type: 'wire',              label: '1<br>Связь' },
            { key: '2', type: 'node',              label: '2<br>Узел' },
            { key: '3', type: 'connector',         label: '3<br>Коннект' },
            { key: '4', type: 'quantum_resonator', label: '4<br>Резонат' },
            { key: '5', type: 'gluon_extractor',   label: '5<br>Глюоны' },
            { key: '6', type: 'lepton_extractor',  label: '6<br>Лептон' },
            { key: '7', type: 'hadron_synthesizer', label: '7<br>Синтез' },
            { key: '8', type: 'electron_capture',  label: '8<br>Захват' },
            { key: '9', type: 'fusion_press', label: '9<br>Пресс' },
            { key: '0', type: null,                label: '0<br>—' }
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
            if (['1','2','3','4','5','6','7','8','9','0','r','R','к','К','q','Q','й','Й','Escape'].includes(key)) {
                e.preventDefault();
            }
            if (key === '1') this.selectBuilding('wire');
            else if (key === '2') this.selectBuilding('node');
            else if (key === '3') this.selectBuilding('connector');
            else if (key === '4') this.selectBuilding('quantum_resonator');
            else if (key === '5') this.selectBuilding('gluon_extractor');
            else if (key === '6') this.selectBuilding('lepton_extractor');
            else if (key === '7') this.selectBuilding('hadron_synthesizer');
            else if (key === '8') this.selectBuilding('electron_capture');
            else if (key === '9') this.selectBuilding('fusion_press');
            else if (key === 'r' || key === 'R' || key === 'к' || key === 'К') {
                if (this.game.selectedType) {
                    this.game.buildingManager.rotateGhost();
                } else {
                    this.game.buildingManager.rotateBuildingUnderCursor();
                }
            }
            else if (key === 'q' || key === 'Q' || key === 'й' || key === 'Й') {
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
        if (type) this.game.buildingManager._updateGhostFromLastMouse();
    }
    updateActiveButton() {
        Object.values(this.buttons).forEach(btn => btn.classList.remove('active'));
        if (this.game.selectedType && this.buttons[this.game.selectedType]) {
            this.buttons[this.game.selectedType].classList.add('active');
        }
    }
}