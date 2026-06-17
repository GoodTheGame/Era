class GameEngine {
  constructor() {
    this.TILE_SIZE = 64;
    this.GRID_COLS = 60;
    this.GRID_ROWS = 40;
    this.buildings = [];
    this.items = []; // теперь предметы на конвейерах хранятся в самом здании, а items - только для анимации перемещения?
    // В этой версии предметы будут храниться в зданиях-конвейерах, а для перемещения будем использовать отдельную логику.
    // Пока оставим совместимость: предметы на конвейерах внутри items, но с привязкой к клетке.
    this.worldPatches = [];
    this.level = 1;
    this.goalDelivered = 0;
    this.goalRequired = 20;
    this.goalShape = 'circle';
    this.goalColor = 'red';
    this.tickRate = 30;
    this.tickCounter = 0;
    this.running = false;
    this.ui = null;
  }

  init() {
    this.initPatches();
    const cx = Math.floor(this.GRID_COLS / 2);
    const cy = Math.floor(this.GRID_ROWS / 2);
    this.addBuilding(new Hub(cx, cy, 0));
    this.generateGoal();
  }

  initPatches() {
    this.worldPatches = Array.from({length: this.GRID_COLS}, () => new Array(this.GRID_ROWS).fill(null));
    const cx = Math.floor(this.GRID_COLS / 2);
    const cy = Math.floor(this.GRID_ROWS / 2);
    // Красный круг
    this.worldPatches[cx - 7][cy] = { shape: 'circle', color: 'red' };
    // Синий круг
    this.worldPatches[cx + 7][cy] = { shape: 'circle', color: 'blue' };
  }

  addBuilding(b) { this.buildings.push(b); }
  getBuildingAt(gx, gy) { return this.buildings.find(b => b.gridX === gx && b.gridY === gy); }
  removeBuilding(gx, gy) {
    const idx = this.buildings.findIndex(b => b.gridX === gx && b.gridY === gy);
    if (idx !== -1 && this.buildings[idx].type !== 'hub') {
      this.buildings.splice(idx, 1);
      return true;
    }
    return false;
  }

  canOutputTo(gx, gy, fromDir) {
    const b = this.getBuildingAt(gx, gy);
    if (!b) return false;
    if (b instanceof Conveyor) return b.canAccept(fromDir);
    if (b instanceof Hub || b instanceof Cutter || b instanceof Rotator || b instanceof Mixer) return b.canAccept(fromDir);
    return false;
  }

  spawnItem(gx, gy, resource, fromDir) {
    // Предмет появляется на конвейере или сразу в здании
    const b = this.getBuildingAt(gx, gy);
    if (b instanceof Conveyor) {
      // Определить сторону
      const backDir = (b.direction + 2) % 4;
      let side = 'left';
      if (fromDir === backDir) {
        // если сзади, кладём на дальнюю сторону? По механике Factorio сзади кладёт на дальнюю (от входа) сторону.
        // Упростим: всегда на левую, если она свободна, иначе на правую.
        if (b.itemsLeft.length <= b.itemsRight.length) side = 'left';
        else side = 'right';
      } else {
        side = b.getSideForDir(fromDir);
      }
      if (side === 'left' && b.itemsLeft.length < 4) {
        b.itemsLeft.push(resource);
        // запускаем анимацию? Пока предмет хранится в массиве.
      } else if (side === 'right' && b.itemsRight.length < 4) {
        b.itemsRight.push(resource);
      }
      // Иначе предмет теряется (нет места)
    } else if (b instanceof Cutter || b instanceof Rotator || b instanceof Mixer) {
      // Попытка вставить
      this.tryInsertIntoBuilding(b, resource, fromDir);
    } else if (b instanceof Hub) {
      this.deliverToHub(resource);
    }
  }

  tryInsertIntoBuilding(b, resource, fromDir) {
    if (b instanceof Cutter && !b.processing) {
      b.processing = { resource, timer: 40 };
      return true;
    }
    if (b instanceof Rotator && !b.processing) {
      b.processing = { resource, timer: 30 };
      return true;
    }
    if (b instanceof Mixer) {
      if (fromDir === b.leftDir && !b.inputA) { b.inputA = resource; return true; }
      if (fromDir === b.rightDir && !b.inputB) { b.inputB = resource; return true; }
    }
    return false;
  }

  deliverToHub(resource) {
    if (resource.shape === this.goalShape && resource.color === this.goalColor) {
      this.goalDelivered++;
      if (this.ui) this.ui.updateHUD();
      if (this.goalDelivered >= this.goalRequired) {
        this.level++;
        this.generateGoal();
        this.buildings.forEach(b => { if (b instanceof Extractor) b.cooldownMax = Math.max(15, 60 - this.level * 5); });
      }
    }
  }

  generateGoal() {
    this.goalShape = RESOURCE_SHAPES[Math.floor(Math.random() * RESOURCE_SHAPES.length)];
    this.goalColor = RESOURCE_COLORS[Math.floor(Math.random() * RESOURCE_COLORS.length)];
    this.goalDelivered = 0;
    this.goalRequired = 15 + this.level * 5;
    if (this.ui) this.ui.updateHUD();
  }

  canPlaceBuilding(gx, gy, type) {
    if (gx < 0 || gx >= this.GRID_COLS || gy < 0 || gy >= this.GRID_ROWS) return false;
    if (this.getBuildingAt(gx, gy)) return false;
    if (type === 'extractor') return !!this.worldPatches[gx]?.[gy];
    return true;
  }

  placeBuilding(type, gx, gy, direction) {
    if (type === 'extractor') {
      const patch = this.worldPatches[gx]?.[gy];
      if (!patch) return false;
      if (this.getBuildingAt(gx, gy)) return false;
      this.addBuilding(new Extractor(gx, gy, direction, patch.shape, patch.color));
      return true;
    }
    if (!this.canPlaceBuilding(gx, gy, type)) return false;
    let b;
    switch (type) {
      case 'conveyor': b = new Conveyor(gx, gy, direction); break;
      case 'cutter': b = new Cutter(gx, gy, direction); break;
      case 'rotator': b = new Rotator(gx, gy, direction); break;
      case 'mixer': b = new Mixer(gx, gy, direction); break;
      case 'hub':
        const existing = this.buildings.find(b => b.type === 'hub');
        if (existing) this.buildings = this.buildings.filter(b => b !== existing);
        b = new Hub(gx, gy, direction);
        break;
      default: return false;
    }
    this.addBuilding(b);
    return true;
  }

  // === Главный тик ===
  tick() {
    // Обновление зданий
    this.buildings.forEach(b => b.update(this));

    // Движение предметов на конвейерах
    for (const b of this.buildings) {
      if (b instanceof Conveyor) {
        this.processConveyor(b);
      }
    }
  }

  processConveyor(conv) {
    // Перемещаем предметы вперёд по ленте: продвигаем все предметы на 1 позицию, если впереди есть место
    const nextPos = {
      x: conv.gridX + dirToOffset(conv.direction).dx,
      y: conv.gridY + dirToOffset(conv.direction).dy
    };
    const nextBuilding = this.getBuildingAt(nextPos.x, nextPos.y);

    // Для левой стороны
    if (conv.itemsLeft.length > 0) {
      const item = conv.itemsLeft[0];
      if (nextBuilding instanceof Conveyor) {
        // Попытка передать на левую сторону следующего конвейера
        if (nextBuilding.itemsLeft.length < 4) {
          nextBuilding.itemsLeft.push(item);
          conv.itemsLeft.shift();
        }
        // Если левая занята, возможно попробовать правую? По механике Factorio нет, остаёмся на месте.
      } else if (nextBuilding && nextBuilding.canAccept(conv.direction)) {
        // Фабрика или хаб
        if (this.tryInsertIntoBuilding(nextBuilding, item, conv.direction)) {
          conv.itemsLeft.shift();
        } else if (nextBuilding instanceof Hub) {
          this.deliverToHub(item);
          conv.itemsLeft.shift();
        }
      }
    }
    // Для правой стороны аналогично
    if (conv.itemsRight.length > 0) {
      const item = conv.itemsRight[0];
      if (nextBuilding instanceof Conveyor) {
        if (nextBuilding.itemsRight.length < 4) {
          nextBuilding.itemsRight.push(item);
          conv.itemsRight.shift();
        }
      } else if (nextBuilding && nextBuilding.canAccept(conv.direction)) {
        if (this.tryInsertIntoBuilding(nextBuilding, item, conv.direction)) {
          conv.itemsRight.shift();
        } else if (nextBuilding instanceof Hub) {
          this.deliverToHub(item);
          conv.itemsRight.shift();
        }
      }
    }
    // Также предметы могут продвигаться внутри ленты? Упростим: только передача на следующую клетку.
  }

  start() {
    this.running = true;
    const loop = () => {
      if (!this.running) return;
      this.tickCounter++;
      if (this.tickCounter >= this.tickRate) {
        this.tickCounter = 0;
        this.tick();
      }
      if (this.ui) this.ui.render();
      requestAnimationFrame(loop);
    };
    loop();
  }
}