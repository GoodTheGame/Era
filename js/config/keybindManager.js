// js/KeybindManager.js
import { KEYBINDINGS } from './keybindings.js';

export class KeybindManager {
    constructor(game) {
        this.game = game;
        this._handleKeyDown = this._handleKeyDown.bind(this);
        window.addEventListener('keydown', this._handleKeyDown);
    }

    _handleKeyDown(e) {
        const key = e.key.toLowerCase();
        const shift = e.shiftKey;
        const ctrl = e.ctrlKey;
        const alt = e.altKey;

        // Проверяем каждое действие
        if (this._match(key, shift, ctrl, alt, KEYBINDINGS.rotate)) {
            e.preventDefault();
            if (this.game.selectedType === 'wire') {
                this.game.buildingManager.rotateWirePort();
            } else {
                const reverse = shift;
                if (this.game.selectedType) {
                    this.game.buildingManager.rotateGhost(reverse);
                } else {
                    this.game.buildingManager.rotateBuildingUnderCursor(reverse);
                }
            }
            return;
        }

        if (this._match(key, shift, ctrl, alt, KEYBINDINGS.nextMode)) {
            e.preventDefault();
            this.game.buildingManager.changeMode(false); // прямое
            return;
        }

        if (this._match(key, shift, ctrl, alt, KEYBINDINGS.prevMode)) {
            e.preventDefault();
            this.game.buildingManager.changeMode(true); // обратное
            return;
        }

        if (this._match(key, shift, ctrl, alt, KEYBINDINGS.toggleInfo)) {
            e.preventDefault();
            this.game.showRecipeInfo = !this.game.showRecipeInfo;
            return;
        }

        // Остальные клавиши (1-9, Q, Escape) оставим в HUD или тоже перенесём сюда позже.
        // Пока HUD продолжает слушать свои кнопки.
    }

    _match(key, shift, ctrl, alt, bindings) {
        return bindings.some(b => {
            const parts = b.split('+');
            const needShift = parts.includes('shift');
            const needCtrl = parts.includes('ctrl');
            const needAlt = parts.includes('alt');
            const mainKey = parts.find(p => !['shift','ctrl','alt'].includes(p));
            return mainKey === key && needShift === shift && needCtrl === ctrl && needAlt === alt;
        });
    }
}