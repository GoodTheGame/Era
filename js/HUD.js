// js/HUD.js
export class HUD {
    constructor(game) {
        this.game = game;
        this.toolbar = document.getElementById('toolbar');
        this.buttons = {};
        this.slot2Main = 'node';          // основной предмет слота 2
        this.slot2Alt = 'energy_buffer';  // альтернативный предмет
        this.showConnections = true;      // ПО УМОЛЧАНИЮ ВКЛЮЧЕНО
        this._createToolbar();
        this._bindHotkeys();
        this._initSlot2Popup();
    }

    _createToolbar() {
        // Сначала создаём контейнер для переключателя + кнопки 1
        const group1 = document.createElement('div');
        group1.style.display = 'flex';
        group1.style.alignItems = 'center';
        group1.style.gap = '0px'; // без зазора, чтобы примыкали вплотную

        // Тонкая вертикальная кнопка-переключатель
        const toggleBtn = document.createElement('button');
        toggleBtn.className = 'tool-btn toggle-btn';
        toggleBtn.innerHTML = '🔌';
        toggleBtn.title = 'Показать соединения';
        toggleBtn.style.width = '22px';
        toggleBtn.style.height = '56px'; // как у обычных кнопок
        toggleBtn.style.borderRadius = '8px 0 0 8px';
        toggleBtn.style.marginRight = '0';
        // ЗАДАЁМ НАЧАЛЬНЫЙ ЦВЕТ (СИНИЙ, ТАК КАК ВКЛЮЧЕН)
        toggleBtn.style.background = 'rgba(0, 255, 255, 0.3)';
        toggleBtn.style.border = '1px solid rgba(100,120,180,0.3)';
        toggleBtn.style.cursor = 'pointer';
        toggleBtn.style.display = 'flex';
        toggleBtn.style.alignItems = 'center';
        toggleBtn.style.justifyContent = 'center';
        toggleBtn.style.fontSize = '14px';
        toggleBtn.addEventListener('click', (e) => {
            e.stopPropagation();
            this.showConnections = !this.showConnections;
            toggleBtn.style.background = this.showConnections ? 'rgba(0, 255, 255, 0.3)' : 'rgba(20,25,45,0.92)';
        });
        group1.appendChild(toggleBtn);

        // Обычная кнопка 1 (Связь)
        const items = [
            { key: '1', type: 'wire',          label: '1<br>Связь' },
            { key: '2', type: this.slot2Main,  label: '2<br>Узел' },
            { key: '3', type: 'connector',     label: '3<br>Коннект' },
            { key: '4', type: 'quantum_resonator', label: '4<br>Резонат' },
            { key: '5', type: 'gluon_extractor',   label: '5<br>Глюоны' },
            { key: '6', type: 'lepton_extractor',  label: '6<br>Лептон' },
            { key: '7', type: 'hadron_synthesizer', label: '7<br>Синтез' },
            { key: '8', type: 'electron_capture',  label: '8<br>Захват' },
            { key: '9', type: 'fusion_press',      label: '9<br>Пресс' },
            { key: '0', type: null,            label: '0<br>—' }
        ];

        items.forEach((item, index) => {
            const btn = document.createElement('button');
            btn.className = 'tool-btn';
            btn.innerHTML = item.label;
            btn.dataset.type = item.type;
            btn.addEventListener('click', () => this.selectBuilding(item.type));
            if (index === 0) {
                // Кнопка 1 пристыковывается к переключателю
                btn.style.borderRadius = '0 8px 8px 0';
                group1.appendChild(btn);
                this.toolbar.appendChild(group1);
            } else {
                this.toolbar.appendChild(btn);
            }
            this.buttons[item.type] = btn;
        });
    }

    _initSlot2Popup() {
        const btn2 = this.buttons['node'];
        const wrapper = document.createElement('div');
        wrapper.style.position = 'relative';
        wrapper.style.display = 'inline-block';
        btn2.parentNode.insertBefore(wrapper, btn2);
        wrapper.appendChild(btn2);

        const popup = document.createElement('div');
        popup.className = 'slot2-popup';
        popup.innerHTML = '⚡';
        popup.style.position = 'absolute';
        popup.style.bottom = '100%';
        popup.style.left = '50%';
        popup.style.transform = 'translateX(-50%)';
        popup.style.marginBottom = '8px';
        popup.style.background = 'rgba(20,25,45,0.95)';
        popup.style.border = '1px solid #7AE0A3';
        popup.style.borderRadius = '8px';
        popup.style.padding = '6px 10px';
        popup.style.cursor = 'pointer';
        popup.style.display = 'none';
        popup.style.zIndex = '1000';
        popup.title = 'Переключить на Буфер энергии';
        wrapper.appendChild(popup);

        let hideTimer = null;

        wrapper.addEventListener('mouseenter', () => {
            clearTimeout(hideTimer);
            popup.style.display = 'block';
        });

        wrapper.addEventListener('mouseleave', () => {
            hideTimer = setTimeout(() => {
                if (!popup.matches(':hover')) {
                    popup.style.display = 'none';
                }
            }, 1000);
        });

        popup.addEventListener('mouseenter', () => {
            clearTimeout(hideTimer);
        });

        popup.addEventListener('mouseleave', () => {
            popup.style.display = 'none';
        });

        popup.addEventListener('click', (e) => {
            e.stopPropagation();
            this.toggleSlot2();
            popup.style.display = 'none';
        });

        this._updateSlot2Button();
    }

    toggleSlot2() {
        const tmp = this.slot2Main;
        this.slot2Main = this.slot2Alt;
        this.slot2Alt = tmp;
        this._updateSlot2Button();
        const popup = document.querySelector('.slot2-popup');
        if (popup) {
            popup.innerHTML = this.slot2Alt === 'energy_buffer' ? '⚡' : '⏺';
            popup.title = `Переключить на ${this.slot2Alt === 'node' ? 'Узел' : 'Буфер энергии'}`;
        }
        if (this.game.selectedType === tmp) {
            this.selectBuilding(this.slot2Main);
        }
    }

    _updateSlot2Button() {
        const btn2 = document.querySelector('#toolbar button[data-key="2"]');
        if (btn2) {
            btn2.dataset.type = this.slot2Main;
            btn2.innerHTML = `2<br>${this.slot2Main === 'node' ? 'Узел' : 'Буфер'}`;
        }
    }

    _bindHotkeys() {
        window.addEventListener('keydown', (e) => {
            const key = e.key;
            if (['1','2','3','4','5','6','7','8','9','0','r','R','к','К','q','Q','й','Й','Escape'].includes(key)) {
                e.preventDefault();
            }
            if (key === '1') this.selectBuilding('wire');
            else if (key === '2') {
                if (this.game.selectedType === this.slot2Main || this.game.selectedType === this.slot2Alt) {
                    this.toggleSlot2();
                } else {
                    this.selectBuilding(this.slot2Main);
                }
            }
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