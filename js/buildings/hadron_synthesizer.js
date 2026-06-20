// js/buildings/hadron_synthesizer.js
import { createFactory } from '../FactoryBase.js';

const QUARK_COLORS = {
    u: '#e74c3c', d: '#3498db', g: '#ff44cc', p: '#ffaa00', n: '#aa00ff'
};

export const hadronSynthesizerBuilding = createFactory({
    type: 'hadron_synthesizer',
    size: { w: 2, h: 2 },
    recipes: {
        proton: { inputs: { u: 2, d: 1, g: 1 }, output: 'p', time: 1.5 },
        neutron: { inputs: { u: 1, d: 2, g: 1 }, output: 'n', time: 1.5 }
    },
    recipeColors: { proton: '#ffaa00', neutron: '#aa00ff' },
    inputColors: QUARK_COLORS,

    getItemPorts() {
        const config = this._factoryConfig;
        const recipe = this.recipe || Object.keys(config.recipes)[0];
        const inputs = config.recipes[recipe].inputs;
        const inputKeys = Object.keys(inputs);
        return [
            { type: 'in', x: 0, y: 0.25, accepts: [inputKeys[0]] },
            { type: 'in', x: 0, y: 0.5,  accepts: [inputKeys[1]] },
            { type: 'in', x: 0, y: 0.75, accepts: [inputKeys[2]] },
            { type: 'out', x: 1, y: 0.5, produces: config.recipes[recipe].output }
        ];
    },
    getEnergyPorts() {
        return [];
    },

    rotateGhost(ghost, game, reverse) {
        ghost.rotation = (ghost.rotation + 1) % 4;
    },

    changeMode(ghost, game, reverse) {
        const config = this._factoryConfig;
        if (!ghost.recipe) ghost.recipe = Object.keys(config.recipes)[0];
        const keys = Object.keys(config.recipes);
        let idx = keys.indexOf(ghost.recipe);
        idx = reverse ? (idx - 1 + keys.length) % keys.length : (idx + 1) % keys.length;
        ghost.recipe = keys[idx];
        ghost.outputResources = {};
        if (ghost.inputResources) {
            const newInputs = config.recipes[ghost.recipe].inputs;
            const newInputKeys = Object.keys(newInputs);
            for (const key of Object.keys(ghost.inputResources)) {
                if (!newInputKeys.includes(key)) {
                    delete ghost.inputResources[key];
                }
            }
        }
        ghost.craftTimer = 0;
        if (game && game.network) {
            game.network.refreshOutgoingResourceTypes(ghost);
        }
    },

    render(ctx, b, tileSize, isGhost, game) {
        const config = this._factoryConfig;
        const x = b.tx * tileSize, y = b.ty * tileSize;
        const size = b.getSize();
        const w = size.w * tileSize, h = size.h * tileSize;
        const cx = x + w/2, cy = y + h/2;
        const maxR = Math.min(w, h) * 0.4;
        const animTimer = game.globalAnimTime || 0;
        const zoom = game.camera.zoom;

        if (zoom < 0.5 && !isGhost) {
            const col = b.recipe === 'proton' ? QUARK_COLORS.p : QUARK_COLORS.n;
            ctx.fillStyle = col;
            ctx.fillRect(x + w*0.25, y + h*0.25, w*0.5, h*0.5);
            return;
        }

        if (!isGhost) {
            const recipe = config.recipes[b.recipe];
            const progress = b.craftTimer ? Math.min(b.craftTimer / recipe.time, 1.0) : 0;
            const phase = animTimer;

            const numDots = 12;
            for (let i = 0; i < numDots; i++) {
                const angle = (i / numDots) * Math.PI * 2 + phase * 2;
                const r = maxR * (0.6 + 0.3 * Math.sin(phase * 3 + i));
                const px = cx + Math.cos(angle) * r;
                const py = cy + Math.sin(angle) * r;
                const colorIndex = i % 3;
                const color = colorIndex === 0 ? QUARK_COLORS.u :
                              colorIndex === 1 ? QUARK_COLORS.d : QUARK_COLORS.g;
                ctx.beginPath();
                ctx.arc(px, py, 3, 0, Math.PI*2);
                ctx.fillStyle = color;
                ctx.fill();
            }

            if (progress > 0) {
                const coreR = maxR * 0.5 * progress;
                ctx.beginPath();
                ctx.arc(cx, cy, coreR, 0, Math.PI*2);
                ctx.fillStyle = '#ffffff';
                ctx.globalAlpha = 0.6;
                ctx.fill();
                ctx.globalAlpha = 1;
            }

            const recipeCol = b.recipe === 'proton' ? QUARK_COLORS.p : QUARK_COLORS.n;
            ctx.fillStyle = recipeCol;
            ctx.beginPath();
            ctx.arc(cx + maxR*0.8, cy - maxR*0.8, 5, 0, Math.PI*2);
            ctx.fill();
        } else {
            const recipe = b.recipe || 'proton';
            const col = recipe === 'proton' ? QUARK_COLORS.p : QUARK_COLORS.n;
            ctx.fillStyle = col;
            ctx.font = `bold ${tileSize*0.5}px "Segoe UI"`;
            ctx.textAlign = 'center';
            ctx.textBaseline = 'middle';
            ctx.fillText(recipe === 'proton' ? 'P' : 'N', cx, cy);
        }
    }
});