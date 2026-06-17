class UIManager {
  constructor(engine) {
    this.engine = engine;
    this.canvas = document.getElementById('gameCanvas');
    this.ctx = this.canvas.getContext('2d');
    this.wrapper = document.getElementById('canvas-wrapper');
    this.goalCanvas = document.getElementById('goalCanvas');
    this.goalCtx = this.goalCanvas.getContext('2d');
    this.cameraX = engine.WORLD_W / 2 - 400;
    this.cameraY = engine.WORLD_H / 2 - 300;
    this.zoom = 1.0;
    this.selectedTool = null;
    this.direction = 0;
    this.isDragging = false;
    this.dragStart = { x: 0, y: 0, camX: 0, camY: 0 };
    this.mouseGrid = { x: -1, y: -1 };
    this.inventoryOpen = false;
    this.localizer = new Localizer('ru');
  }

  init() {
    this.bindEvents();
    this.updateHUD();
    this.drawGoalPreview();
    this.applyLocalization();
  }

  applyLocalization() {
    document.querySelectorAll('[data-loc]').forEach(el => {
      el.textContent = this.localizer.t(el.dataset.loc);
    });
  }

  bindEvents() {
    this.canvas.addEventListener('mousemove', e => this.onMouseMove(e));
    this.canvas.addEventListener('mousedown', e => this.onMouseDown(e));
    this.canvas.addEventListener('mouseup', e => this.onMouseUp(e));
    this.canvas.addEventListener('mouseleave', e => this.onMouseLeave(e));
    this.canvas.addEventListener('contextmenu', e => e.preventDefault());
    this.canvas.addEventListener('wheel', e => this.onWheel(e));
    window.addEventListener('keydown', e => this.onKeyDown(e));

    // Кнопки инвентаря
    document.querySelectorAll('.inv-btn').forEach(btn => {
      btn.addEventListener('click', () => {
        this.selectTool(btn.dataset.tool);
        this.closeInventory();
      });
    });
  }

  selectTool(toolId) {
    if (this.selectedTool === toolId) {
      this.selectedTool = null;
    } else {
      this.selectedTool = toolId;
    }
    this.updateToolbarUI();
  }

  updateToolbarUI() {
    document.querySelectorAll('.inv-btn').forEach(btn => {
      btn.classList.toggle('active', btn.dataset.tool === this.selectedTool);
    });
    // Можно обновить иконку на кнопке E? Не требуется.
  }

  openInventory() {
    this.inventoryOpen = true;
    document.getElementById('inventory-menu').style.display = 'block';
  }
  closeInventory() {
    this.inventoryOpen = false;
    document.getElementById('inventory-menu').style.display = 'none';
  }

  // Ввод
  screenToWorld(sx, sy) {
    const rect = this.canvas.getBoundingClientRect();
    return { x: (sx - rect.left) / this.zoom + this.cameraX, y: (sy - rect.top) / this.zoom + this.cameraY };
  }
  worldToGrid(wx, wy) {
    return { gx: Math.floor(wx / this.engine.TILE_SIZE), gy: Math.floor(wy / this.engine.TILE_SIZE) };
  }

  onMouseMove(e) {
    const world = this.screenToWorld(e.clientX, e.clientY);
    const grid = this.worldToGrid(world.x, world.y);
    this.mouseGrid = grid;
    if (this.isDragging) {
      const dx = e.clientX - this.dragStart.x;
      const dy = e.clientY - this.dragStart.y;
      this.cameraX = this.dragStart.camX - dx / this.zoom;
      this.cameraY = this.dragStart.camY - dy / this.zoom;
    }
  }

  onMouseDown(e) {
    if (e.button === 0) {
      if (this.inventoryOpen) {
        this.closeInventory();
        return;
      }
      this.isDragging = true;
      this.dragStart = { x: e.clientX, y: e.clientY, camX: this.cameraX, camY: this.cameraY };
      this.canvas.style.cursor = 'grabbing';
      return;
    }
    if (e.button === 2) {
      if (this.selectedTool) {
        this.selectedTool = null;
        this.updateToolbarUI();
      } else {
        const b = this.engine.getBuildingAt(this.mouseGrid.gx, this.mouseGrid.gy);
        if (b && b.type !== 'hub') {
          b.direction = (b.direction + 1) % 4;
        }
      }
    }
  }

  onMouseUp(e) {
    if (e.button === 0 && this.isDragging) {
      // Если не было перетаскивания, то это клик
      const dx = Math.abs(e.clientX - this.dragStart.x);
      const dy = Math.abs(e.clientY - this.dragStart.y);
      if (dx < 3 && dy < 3 && this.selectedTool) {
        // клик для размещения
        const gx = this.mouseGrid.gx;
        const gy = this.mouseGrid.gy;
        if (gx >= 0 && gy >= 0 && gx < this.engine.GRID_COLS && gy < this.engine.GRID_ROWS) {
          if (this.selectedTool === 'demolish') {
            this.engine.removeBuilding(gx, gy);
          } else {
            this.engine.placeBuilding(this.selectedTool, gx, gy, this.direction);
          }
        }
      }
    }
    this.isDragging = false;
    this.canvas.style.cursor = 'crosshair';
  }

  onMouseLeave() {
    this.isDragging = false;
    this.canvas.style.cursor = 'crosshair';
  }

  onWheel(e) {
    e.preventDefault();
    const worldBefore = this.screenToWorld(e.clientX, e.clientY);
    this.zoom = e.deltaY < 0 ? Math.min(3.0, this.zoom * 1.08) : Math.max(0.3, this.zoom / 1.08);
    const worldAfter = this.screenToWorld(e.clientX, e.clientY);
    this.cameraX += worldBefore.x - worldAfter.x;
    this.cameraY += worldBefore.y - worldAfter.y;
  }

  onKeyDown(e) {
    // WASD камера
    const speed = 32 / this.zoom;
    if (e.key === 'w' || e.key === 'W') this.cameraY -= speed;
    if (e.key === 's' || e.key === 'S') this.cameraY += speed;
    if (e.key === 'a' || e.key === 'A') this.cameraX -= speed;
    if (e.key === 'd' || e.key === 'D') this.cameraX += speed;

    if (e.key === 'Escape') {
      this.selectedTool = null;
      this.updateToolbarUI();
      this.closeInventory();
    }
    if (e.key === 'e' || e.key === 'E') {
      e.preventDefault();
      if (this.inventoryOpen) this.closeInventory();
      else this.openInventory();
    }
    if (e.key === 'r' || e.key === 'R') {
      e.preventDefault();
      if (this.mouseGrid.x >= 0 && this.mouseGrid.y >= 0) {
        const b = this.engine.getBuildingAt(this.mouseGrid.x, this.mouseGrid.y);
        if (b && b.type !== 'hub') {
          b.direction = (b.direction + 1) % 4;
        }
      }
    }
    // Выбор инструмента цифрами? оставим как было
  }

  // Рендеринг
  updateHUD() {
    document.getElementById('progress').textContent = `${this.engine.goalDelivered} / ${this.engine.goalRequired}`;
    document.getElementById('level-indicator').textContent = `${this.localizer.t('level')} ${this.engine.level}`;
    this.drawGoalPreview();
  }

  drawGoalPreview() {
    this.goalCtx.clearRect(0, 0, 40, 40);
    this.goalCtx.save();
    this.goalCtx.translate(20, 20);
    drawShape(this.goalCtx, this.engine.goalShape, this.engine.goalColor, 16);
    this.goalCtx.restore();
  }

  render() {
    this.canvas.width = this.wrapper.clientWidth;
    this.canvas.height = this.wrapper.clientHeight;
    const ctx = this.ctx;
    ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);
    ctx.save();
    ctx.translate(-this.cameraX * this.zoom, -this.cameraY * this.zoom);
    ctx.scale(this.zoom, this.zoom);

    const TILE = this.engine.TILE_SIZE;
    const startCol = Math.max(0, Math.floor(this.cameraX / TILE) - 1);
    const endCol = Math.min(this.engine.GRID_COLS, Math.ceil((this.cameraX + this.canvas.width / this.zoom) / TILE) + 1);
    const startRow = Math.max(0, Math.floor(this.cameraY / TILE) - 1);
    const endRow = Math.min(this.engine.GRID_ROWS, Math.ceil((this.cameraY + this.canvas.height / this.zoom) / TILE) + 1);

    // Фон (пока тёмно-синий, позже сделаем релакс)
    for (let gx = startCol; gx <= endCol; gx++) {
      for (let gy = startRow; gy <= endRow; gy++) {
        const x = gx * TILE, y = gy * TILE;
        ctx.fillStyle = (gx + gy) % 2 === 0 ? '#1a1c2e' : '#1f2138';
        ctx.fillRect(x, y, TILE, TILE);
        ctx.strokeStyle = 'rgba(255,255,255,0.03)';
        ctx.strokeRect(x, y, TILE, TILE);

        const patch = this.engine.worldPatches[gx]?.[gy];
        if (patch && !this.engine.getBuildingAt(gx, gy)) {
          ctx.save();
          ctx.translate(x + TILE/2, y + TILE/2);
          ctx.globalAlpha = 0.3;
          drawShape(ctx, patch.shape, patch.color, TILE * 0.3);
          ctx.globalAlpha = 1;
          ctx.restore();
        }
      }
    }

    // Здания
    this.engine.buildings.forEach(b => {
      const x = b.gridX * TILE + TILE/2;
      const y = b.gridY * TILE + TILE/2;
      drawBuilding(ctx, x, y, b, TILE);
    });

    // Подсветка под мышью
    if (this.mouseGrid.gx >= 0 && this.mouseGrid.gy >= 0 &&
        this.mouseGrid.gx < this.engine.GRID_COLS && this.mouseGrid.gy < this.engine.GRID_ROWS) {
      const hx = this.mouseGrid.gx * TILE;
      const hy = this.mouseGrid.gy * TILE;
      ctx.strokeStyle = 'rgba(255,215,0,0.6)';
      ctx.lineWidth = 2;
      ctx.strokeRect(hx + 1, hy + 1, TILE - 2, TILE - 2);

      if (this.selectedTool && this.selectedTool !== 'demolish' && this.engine.canPlaceBuilding(this.mouseGrid.gx, this.mouseGrid.gy, this.selectedTool)) {
        ctx.globalAlpha = 0.4;
        drawBuilding(ctx, hx + TILE/2, hy + TILE/2, { type: this.selectedTool, direction: this.direction }, TILE);
        ctx.globalAlpha = 1;
      }
      if (this.selectedTool === 'demolish' && this.engine.getBuildingAt(this.mouseGrid.gx, this.mouseGrid.gy)) {
        ctx.fillStyle = 'rgba(255,0,0,0.35)';
        ctx.fillRect(hx, hy, TILE, TILE);
      }
    }

    ctx.restore();
  }
}

// --- Функции отрисовки ---
function drawBuilding(ctx, x, y, b, TILE) {
  const s = TILE * 0.7;
  ctx.save();
  ctx.translate(x, y);
  if (b.type === 'conveyor') {
    // Рисуем ленту конвейера
    ctx.fillStyle = '#2a3045';
    ctx.fillRect(-s/2, -s/2, s, s);
    ctx.strokeStyle = '#556080';
    ctx.lineWidth = 1.5;
    ctx.strokeRect(-s/2, -s/2, s, s);
    // Стрелки направления (маленькие треугольники по центру)
    ctx.fillStyle = '#8899cc';
    for (let i = 0; i < 3; i++) {
      const offset = (i - 1) * s * 0.3;
      ctx.beginPath();
      if (b.direction === 0) { // right
        ctx.moveTo(-s*0.2, offset - s*0.1);
        ctx.lineTo(s*0.15, offset);
        ctx.lineTo(-s*0.2, offset + s*0.1);
      } else if (b.direction === 1) { // down
        ctx.moveTo(offset - s*0.1, -s*0.2);
        ctx.lineTo(offset, s*0.15);
        ctx.lineTo(offset + s*0.1, -s*0.2);
      } else if (b.direction === 2) { // left
        ctx.moveTo(s*0.2, offset - s*0.1);
        ctx.lineTo(-s*0.15, offset);
        ctx.lineTo(s*0.2, offset + s*0.1);
      } else { // up
        ctx.moveTo(offset - s*0.1, s*0.2);
        ctx.lineTo(offset, -s*0.15);
        ctx.lineTo(offset + s*0.1, s*0.2);
      }
      ctx.closePath();
      ctx.fill();
    }
    // Отображаем предметы на ленте
    if (b instanceof Conveyor) {
      // Левая сторона
      b.itemsLeft.forEach((res, i) => {
        const lx = -s*0.25;
        const ly = (i - 1.5) * s*0.25; // равномерно
        ctx.save();
        ctx.translate(lx, ly);
        drawShape(ctx, res.shape, res.color, s*0.18);
        ctx.restore();
      });
      // Правая сторона
      b.itemsRight.forEach((res, i) => {
        const rx = s*0.25;
        const ry = (i - 1.5) * s*0.25;
        ctx.save();
        ctx.translate(rx, ry);
        drawShape(ctx, res.shape, res.color, s*0.18);
        ctx.restore();
      });
    }
  } else if (b.type === 'extractor') {
    ctx.fillStyle = '#4a3f35';
    ctx.fillRect(-s/2, -s/2, s, s);
    ctx.strokeStyle = '#8b7355';
    ctx.lineWidth = 2;
    ctx.strokeRect(-s/2, -s/2, s, s);
    ctx.fillStyle = '#ccc';
    ctx.font = `${s*0.5}px sans-serif`;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText('⛏', 0, -s*0.1);
    drawShape(ctx, b.shape, b.color, s*0.22);
    // Выходная стрелка
    drawOutputArrow(ctx, s, b.direction);
  } else if (b.type === 'cutter') {
    ctx.fillStyle = '#4a4a6a';
    ctx.fillRect(-s/2, -s/2, s, s);
    ctx.strokeStyle = '#888';
    ctx.lineWidth = 2;
    ctx.strokeRect(-s/2, -s/2, s, s);
    ctx.fillStyle = '#ddd';
    ctx.font = `${s*0.5}px sans-serif`;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText('✂', 0, 0);
    if (b.processing) {
      ctx.fillStyle = 'rgba(255,255,0,0.4)';
      ctx.beginPath(); ctx.arc(0, 0, s*0.3, 0, Math.PI*2); ctx.fill();
    }
    // Входы и выходы
    drawInputArrow(ctx, s, b.direction); // вход сзади
    const outDirs = b.getOutputDirections();
    outDirs.forEach(d => drawOutputArrow(ctx, s, d));
  } else if (b.type === 'rotator') {
    ctx.fillStyle = '#3a4a3a';
    ctx.fillRect(-s/2, -s/2, s, s);
    ctx.strokeStyle = '#6a8';
    ctx.lineWidth = 2;
    ctx.strokeRect(-s/2, -s/2, s, s);
    ctx.fillStyle = '#ddd';
    ctx.font = `${s*0.5}px sans-serif`;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText('🔄', 0, 0);
    drawInputArrow(ctx, s, b.direction);
    drawOutputArrow(ctx, s, b.direction);
  } else if (b.type === 'mixer') {
    ctx.fillStyle = '#4a3a4a';
    ctx.fillRect(-s/2, -s/2, s, s);
    ctx.strokeStyle = '#a6a';
    ctx.lineWidth = 2;
    ctx.strokeRect(-s/2, -s/2, s, s);
    ctx.fillStyle = '#ddd';
    ctx.font = `${s*0.5}px sans-serif`;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText('🎨', 0, 0);
    // Левый и правый входы
    drawInputArrow(ctx, s, b.leftDir);
    drawInputArrow(ctx, s, b.rightDir);
    drawOutputArrow(ctx, s, b.direction);
  } else if (b.type === 'hub') {
    ctx.fillStyle = '#4a3a2a';
    ctx.fillRect(-s/2, -s/2, s, s);
    ctx.strokeStyle = '#daa520';
    ctx.lineWidth = 3;
    ctx.strokeRect(-s/2, -s/2, s, s);
    ctx.fillStyle = '#ffd700';
    ctx.font = `${s*0.6}px sans-serif`;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText('🏠', 0, 0);
    drawInputArrow(ctx, s, b.direction);
  }
  ctx.restore();
}

function drawInputArrow(ctx, s, dir) {
  ctx.fillStyle = '#2ecc71';
  ctx.beginPath();
  const offset = s * 0.7;
  const size = s * 0.15;
  if (dir === 0) { // справа налево
    ctx.moveTo(offset, -size);
    ctx.lineTo(offset + size, 0);
    ctx.lineTo(offset, size);
  } else if (dir === 1) { // сверху вниз
    ctx.moveTo(-size, offset);
    ctx.lineTo(0, offset + size);
    ctx.lineTo(size, offset);
  } else if (dir === 2) { // слева направо
    ctx.moveTo(-offset, -size);
    ctx.lineTo(-offset - size, 0);
    ctx.lineTo(-offset, size);
  } else { // снизу вверх
    ctx.moveTo(-size, -offset);
    ctx.lineTo(0, -offset - size);
    ctx.lineTo(size, -offset);
  }
  ctx.closePath();
  ctx.fill();
}

function drawOutputArrow(ctx, s, dir) {
  ctx.fillStyle = '#e67e22';
  ctx.beginPath();
  const offset = s * 0.7;
  const size = s * 0.15;
  if (dir === 0) { // right
    ctx.moveTo(offset - size, -size);
    ctx.lineTo(offset, 0);
    ctx.lineTo(offset - size, size);
  } else if (dir === 1) { // down
    ctx.moveTo(-size, offset - size);
    ctx.lineTo(0, offset);
    ctx.lineTo(size, offset - size);
  } else if (dir === 2) { // left
    ctx.moveTo(-offset + size, -size);
    ctx.lineTo(-offset, 0);
    ctx.lineTo(-offset + size, size);
  } else { // up
    ctx.moveTo(-size, -offset + size);
    ctx.lineTo(0, -offset);
    ctx.lineTo(size, -offset + size);
  }
  ctx.closePath();
  ctx.fill();
}

function drawShape(ctx, shape, color, size) {
  ctx.fillStyle = COLOR_HEX[color] || COLOR_HEX.uncolored;
  ctx.strokeStyle = '#fff';
  ctx.lineWidth = 1.5;
  ctx.beginPath();
  if (shape === 'circle' || shape.includes('circle')) {
    ctx.arc(0, 0, size, 0, Math.PI * 2);
  } else if (shape === 'square') {
    ctx.rect(-size, -size, size * 2, size * 2);
  } else if (shape === 'star') {
    const spikes = 5, outer = size, inner = size * 0.45;
    for (let i = 0; i < spikes * 2; i++) {
      const r = i % 2 === 0 ? outer : inner;
      const a = (i * Math.PI) / spikes - Math.PI / 2;
      if (i === 0) ctx.moveTo(Math.cos(a) * r, Math.sin(a) * r);
      else ctx.lineTo(Math.cos(a) * r, Math.sin(a) * r);
    }
    ctx.closePath();
  }
  ctx.fill();
  ctx.stroke();
}