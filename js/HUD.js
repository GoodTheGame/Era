// js/HUD.js
export class HUD {
    constructor(game) {
        this.game = game;
        this.toolbar = document.getElementById('toolbar');
        this.buttons = {};
        this.slot2Main = 'node';
        this.slot2Alt = 'energy_buffer';
        this.slot3Main = 'connector';
        this.slot3Alt = 'connector_energy';
        this.wireMode = 'matter';
        this.showMatterConnections = true;
        this.showEnergyConnections = true;

        this.slot2Active = false;
        this.slot3Active = false;

        this._createToolbar();
        this._bindHotkeys();
        this._initSlot2Popup();
        this._initSlot3Popup();
        this._initWireModePopup();
    }

    _createToolbar() {
        const items = [
            { key: '1', type: 'wire',          label: '1<br>Связь' },
            { key: '2', type: this.slot2Main,  label: '2<br>Узел' },
            { key: '3', type: this.slot3Main,  label: '3<br>Коннект' },
            { key: '4', type: 'quantum_resonator', label: '4<br>Резонат' },
            { key: '5', type: 'gluon_extractor',   label: '5<br>Глюоны' },
            { key: '6', type: 'lepton_extractor',  label: '6<br>Лептон' },
            { key: '7', type: 'hadron_synthesizer', label: '7<br>Синтез' },
            { key: '8', type: 'electron_capture',  label: '8<br>Захват' },
            { key: '9', type: 'fusion_press',      label: '9<br>Пресс' },
            { key: '0', type: null,            label: '0<br>—' }
        ];

        const group1 = document.createElement('div');
        group1.style.display = 'flex';
        group1.style.alignItems = 'center';
        group1.style.gap = '0px';

        const toggleMatter = document.createElement('button');
        toggleMatter.className = 'tool-btn toggle-btn';
        toggleMatter.innerHTML = '🔹';
        toggleMatter.title = 'Показать материальные соединения';
        toggleMatter.style.width = '22px';
        toggleMatter.style.height = '56px';
        toggleMatter.style.borderRadius = '8px 0 0 8px';
        toggleMatter.style.marginRight = '0';
        toggleMatter.style.border = '1px solid rgba(100,120,180,0.3)';
        toggleMatter.style.cursor = 'pointer';
        toggleMatter.style.display = 'flex';
        toggleMatter.style.alignItems = 'center';
        toggleMatter.style.justifyContent = 'center';
        toggleMatter.style.fontSize = '14px';
        toggleMatter.classList.add('active');
        toggleMatter.addEventListener('click', (e) => {
            e.stopPropagation();
            this.showMatterConnections = !this.showMatterConnections;
            toggleMatter.classList.toggle('active', this.showMatterConnections);
        });
        group1.appendChild(toggleMatter);

        const toggleEnergy = document.createElement('button');
        toggleEnergy.className = 'tool-btn toggle-btn';
        toggleEnergy.innerHTML = '⚡';
        toggleEnergy.title = 'Показать энергетические соединения';
        toggleEnergy.style.width = '22px';
        toggleEnergy.style.height = '56px';
        toggleEnergy.style.borderRadius = '0';
        toggleEnergy.style.marginRight = '0';
        toggleEnergy.style.border = '1px solid rgba(100,120,180,0.3)';
        toggleEnergy.style.cursor = 'pointer';
        toggleEnergy.style.display = 'flex';
        toggleEnergy.style.alignItems = 'center';
        toggleEnergy.style.justifyContent = 'center';
        toggleEnergy.style.fontSize = '14px';
        toggleEnergy.classList.add('active');
        toggleEnergy.addEventListener('click', (e) => {
            e.stopPropagation();
            this.showEnergyConnections = !this.showEnergyConnections;
            toggleEnergy.classList.toggle('active', this.showEnergyConnections);
        });
        group1.appendChild(toggleEnergy);

        items.forEach((item, index) => {
            const btn = document.createElement('button');
            btn.className = 'tool-btn';
            btn.innerHTML = item.label;
            btn.dataset.type = item.type;
            btn.dataset.key = item.key;                     // ← ОБЯЗАТЕЛЬНО!
            btn.addEventListener('click', () => this.selectBuilding(item.type));
            if (index === 0) {
                btn.style.borderRadius = '0 8px 8px 0';
                group1.appendChild(btn);
                this.toolbar.appendChild(group1);
            } else {
                this.toolbar.appendChild(btn);
            }
            this.buttons[item.type] = btn;
        });
    }

    _initWireModePopup() {
        const btn1 = this.buttons['wire'];
        const wrapper = document.createElement('div');
        wrapper.style.position = 'relative';
        wrapper.style.display = 'inline-block';
        btn1.parentNode.insertBefore(wrapper, btn1);
        wrapper.appendChild(btn1);

        const popup = document.createElement('div');
        popup.className = 'wire-mode-popup';
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
        popup.title = 'Переключить на Энергосвязь';
        wrapper.appendChild(popup);

        let hideTimer = null;
        wrapper.addEventListener('mouseenter', () => {
            clearTimeout(hideTimer);
            popup.style.display = 'block';
        });
        wrapper.addEventListener('mouseleave', () => {
            hideTimer = setTimeout(() => {
                if (!popup.matches(':hover')) popup.style.display = 'none';
            }, 1000);
        });
        popup.addEventListener('mouseenter', () => clearTimeout(hideTimer));
        popup.addEventListener('mouseleave', () => { popup.style.display = 'none'; });
        popup.addEventListener('click', (e) => {
            e.stopPropagation();
            this.wireMode = this.wireMode === 'matter' ? 'energy' : 'matter';
            popup.innerHTML = this.wireMode === 'energy' ? '🔌' : '⚡';
            popup.title = `Переключить на ${this.wireMode === 'energy' ? 'Материальную' : 'Энергетическую'} связь`;
            btn1.classList.toggle('energy-mode', this.wireMode === 'energy');
            this.updateActiveButton();
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
                if (!popup.matches(':hover')) popup.style.display = 'none';
            }, 1000);
        });
        popup.addEventListener('mouseenter', () => clearTimeout(hideTimer));
        popup.addEventListener('mouseleave', () => { popup.style.display = 'none'; });
        popup.addEventListener('click', (e) => {
            e.stopPropagation();
            this.toggleSlot2();
            popup.style.display = 'none';
        });
        this._updateSlot2Button();
    }

    _initSlot3Popup() {
        const btn3 = this.buttons['connector'];
        const wrapper = document.createElement('div');
        wrapper.style.position = 'relative';
        wrapper.style.display = 'inline-block';
        btn3.parentNode.insertBefore(wrapper, btn3);
        wrapper.appendChild(btn3);

        const popup = document.createElement('div');
        popup.className = 'slot3-popup';
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
        popup.title = 'Переключить на Коннектор энергии';
        wrapper.appendChild(popup);

        let hideTimer = null;
        wrapper.addEventListener('mouseenter', () => {
            clearTimeout(hideTimer);
            popup.style.display = 'block';
        });
        wrapper.addEventListener('mouseleave', () => {
            hideTimer = setTimeout(() => {
                if (!popup.matches(':hover')) popup.style.display = 'none';
            }, 1000);
        });
        popup.addEventListener('mouseenter', () => clearTimeout(hideTimer));
        popup.addEventListener('mouseleave', () => { popup.style.display = 'none'; });
        popup.addEventListener('click', (e) => {
            e.stopPropagation();
            this.toggleSlot3();
            popup.style.display = 'none';
        });
        this._updateSlot3Button();
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

        const btn2 = document.querySelector('#toolbar button[data-key="2"]');
        if (btn2) {
            btn2.classList.toggle('energy-mode', this.slot2Main === 'energy_buffer');
            delete this.buttons[this.slot2Alt];
            this.buttons[this.slot2Main] = btn2;
        }

        if (this.slot2Active) {
            this.game.selectedType = this.slot2Main;
            this.game.buildingManager._updateGhostFromLastMouse();
        }
        this.updateActiveButton();
    }

    toggleSlot3() {
        const tmp = this.slot3Main;
        this.slot3Main = this.slot3Alt;
        this.slot3Alt = tmp;
        this._updateSlot3Button();

        const popup = document.querySelector('.slot3-popup');
        if (popup) {
            popup.innerHTML = this.slot3Alt === 'connector_energy' ? '⚡' : '🔹';
            popup.title = `Переключить на ${this.slot3Alt === 'connector_energy' ? 'Коннектор материи' : 'Коннектор энергии'}`;
        }

        const btn3 = document.querySelector('#toolbar button[data-key="3"]');
        if (btn3) {
            btn3.classList.toggle('energy-mode', this.slot3Main === 'connector_energy');
            delete this.buttons[this.slot3Alt];
            this.buttons[this.slot3Main] = btn3;
        }

        if (this.slot3Active) {
            this.game.selectedType = this.slot3Main;
            this.game.buildingManager._updateGhostFromLastMouse();
        }
        this.updateActiveButton();
    }

    _updateSlot2Button() {
        const btn2 = document.querySelector('#toolbar button[data-key="2"]');
        if (btn2) {
            btn2.dataset.type = this.slot2Main;
            btn2.innerHTML = `2<br>${this.slot2Main === 'node' ? 'Узел' : 'Буфер'}`;
        }
    }

    _updateSlot3Button() {
        const btn3 = document.querySelector('#toolbar button[data-key="3"]');
        if (btn3) {
            btn3.dataset.type = this.slot3Main;
            btn3.innerHTML = `3<br>${this.slot3Main === 'connector' ? 'Коннект' : 'ЭнергоКон'}`;
        }
    }

    _bindHotkeys() {
        window.addEventListener('keydown', (e) => {
            const key = e.key;
            if (['1','2','3','4','5','6','7','8','9','0','r','R','к','К','q','Q','й','Й','Escape'].includes(key)) {
                e.preventDefault();
            }
            if (key === '1') {
                if (this.game.selectedType === 'wire') {
                    this.wireMode = this.wireMode === 'matter' ? 'energy' : 'matter';
                    const btn1 = this.buttons['wire'];
                    if (btn1) btn1.classList.toggle('energy-mode', this.wireMode === 'energy');
                    this.updateActiveButton();
                } else {
                    this.selectBuilding('wire');
                }
            }
            else if (key === '2') {
                if (this.game.selectedType === this.slot2Main || this.game.selectedType === this.slot2Alt) {
                    this.toggleSlot2();
                } else {
                    this.selectBuilding(this.slot2Main);
                }
            }
            else if (key === '3') {
                if (this.game.selectedType === this.slot3Main || this.game.selectedType === this.slot3Alt) {
                    this.toggleSlot3();
                } else {
                    this.selectBuilding(this.slot3Main);
                }
            }
            else if (key === '4') this.selectBuilding('quantum_resonator');
            else if (key === '5') this.selectBuilding('gluon_extractor');
            else if (key === '6') this.selectBuilding('lepton_extractor');
            else if (key === '7') this.selectBuilding('hadron_synthesizer');
            else if (key === '8') this.selectBuilding('electron_capture');
            else if (key === '9') this.selectBuilding('fusion_press');
            else if (key === 'r' || key === 'R' || key === 'к' || key === 'К') {
                const reverse = e.shiftKey;
                if (this.game.selectedType) {
                    this.game.buildingManager.rotateGhost(reverse);
                } else {
                    this.game.buildingManager.rotateBuildingUnderCursor(reverse);
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
        this.slot2Active = (type === this.slot2Main || type === this.slot2Alt);
        this.slot3Active = (type === this.slot3Main || type === this.slot3Alt);

        this.game.selectedType = type;
        this.updateActiveButton();
        if (type) this.game.buildingManager._updateGhostFromLastMouse();
    }

    updateActiveButton() {
        Object.values(this.buttons).forEach(btn => {
            btn.classList.remove('active');
        });

        if (this.slot2Active) {
            const btn2 = this.buttons[this.slot2Main];
            if (btn2) btn2.classList.add('active');
        }
        if (this.slot3Active) {
            const btn3 = this.buttons[this.slot3Main];
            if (btn3) btn3.classList.add('active');
        }

        if (this.game.selectedType && this.buttons[this.game.selectedType]) {
            this.buttons[this.game.selectedType].classList.add('active');
        }
    }
}