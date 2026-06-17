class Building {
  constructor(type, gx, gy, dir = 0) {
    this.type = type;
    this.gridX = gx;
    this.gridY = gy;
    this.direction = dir;
  }
  canAccept(fromDir, resource = null) { return false; }
  update(engine) {}
  getOutputDirections() { return [this.direction]; }
}

// === Конвейер (лента) ===
class Conveyor extends Building {
  constructor(gx, gy, dir) {
    super('conveyor', gx, gy, dir);
    this.itemsLeft = [];   // ресурсы на левой стороне (макс 4)
    this.itemsRight = [];  // на правой (макс 4)
  }
  canAccept(fromDir, resource = null) {
    // Принимаем сзади и с боков (если есть место)
    const backDir = (this.direction + 2) % 4;
    if (fromDir === backDir) return true; // сзади всегда можно
    // Боковая подача: проверяем, есть ли место на соответствующей стороне
    // Определяем, какая сторона ближе
    const side = this.getSideForDir(fromDir);
    if (side === 'left' && this.itemsLeft.length < 4) return true;
    if (side === 'right' && this.itemsRight.length < 4) return true;
    return false;
  }
  getSideForDir(fromDir) {
    // Направление fromDir относительно направления конвейера
    // Если предмет приходит слева (по ходу движения), то side = 'left' и т.д.
    const rel = (fromDir - this.direction + 4) % 4;
    // 0: совпадает (сзади), обрабатывается отдельно
    // 1: справа? зависит от ориентации
    // Упростим: если fromDir == (this.direction + 1)%4 => right, если (this.direction + 3)%4 => left
    if (fromDir === (this.direction + 1) % 4) return 'right';
    if (fromDir === (this.direction + 3) % 4) return 'left';
    return 'left'; // fallback
  }
  addItem(resource, side) {
    if (side === 'left') this.itemsLeft.push(resource);
    else this.itemsRight.push(resource);
  }
  // Обновление: продвижение предметов (будет в gameEngine)
}

// === Экстрактор ===
class Extractor extends Building {
  constructor(gx, gy, dir, shape, color) {
    super('extractor', gx, gy, dir);
    this.shape = shape;
    this.color = color;
    this.cooldown = 0;
    this.cooldownMax = 60;
  }
  update(engine) {
    this.cooldown--;
    if (this.cooldown <= 0) {
      this.cooldown = this.cooldownMax;
      const off = dirToOffset(this.direction);
      const gx = this.gridX + off.dx;
      const gy = this.gridY + off.dy;
      if (engine.canOutputTo(gx, gy, this.direction)) {
        engine.spawnItem(gx, gy, new ResourceItem(this.shape, this.color), this.direction);
      }
    }
  }
}

// === Резак ===
class Cutter extends Building {
  constructor(gx, gy, dir) {
    super('cutter', gx, gy, dir);
    this.processing = null;
  }
  canAccept(fromDir) { return !this.processing; }
  update(engine) {
    if (!this.processing) return;
    this.processing.timer--;
    if (this.processing.timer <= 0) {
      const outputs = RECIPES.cutter(this.processing.resource);
      this.processing = null;
      if (!outputs) return;
      const dirs = [this.direction, (this.direction + 1) % 4];
      for (let i = 0; i < outputs.length; i++) {
        const off = dirToOffset(dirs[i]);
        const gx = this.gridX + off.dx;
        const gy = this.gridY + off.dy;
        if (engine.canOutputTo(gx, gy, dirs[i])) {
          engine.spawnItem(gx, gy, outputs[i], dirs[i]);
        }
      }
    }
  }
  getOutputDirections() { return [this.direction, (this.direction + 1) % 4]; }
}

// === Вращатель ===
class Rotator extends Building {
  constructor(gx, gy, dir) {
    super('rotator', gx, gy, dir);
    this.processing = null;
  }
  canAccept(fromDir) { return !this.processing; }
  update(engine) {
    if (!this.processing) return;
    this.processing.timer--;
    if (this.processing.timer <= 0) {
      const rotated = RECIPES.rotator(this.processing.resource);
      this.processing = null;
      const off = dirToOffset(this.direction);
      const gx = this.gridX + off.dx;
      const gy = this.gridY + off.dy;
      if (engine.canOutputTo(gx, gy, this.direction)) {
        engine.spawnItem(gx, gy, rotated, this.direction);
      }
    }
  }
}

// === Смеситель ===
class Mixer extends Building {
  constructor(gx, gy, dir) {
    super('mixer', gx, gy, dir);
    this.inputA = null;
    this.inputB = null;
    this.processingTimer = 0;
    this.leftDir = (dir + 3) % 4;
    this.rightDir = (dir + 1) % 4;
  }
  canAccept(fromDir) {
    if (fromDir === this.leftDir && !this.inputA) return true;
    if (fromDir === this.rightDir && !this.inputB) return true;
    return false;
  }
  update(engine) {
    if (this.inputA && this.inputB) {
      if (this.processingTimer > 0) {
        this.processingTimer--;
        if (this.processingTimer <= 0) {
          const result = RECIPES.mixer(this.inputA, this.inputB);
          this.inputA = this.inputB = null;
          if (result) {
            const off = dirToOffset(this.direction);
            const gx = this.gridX + off.dx;
            const gy = this.gridY + off.dy;
            if (engine.canOutputTo(gx, gy, this.direction)) {
              engine.spawnItem(gx, gy, result, this.direction);
            }
          }
        }
      } else {
        this.processingTimer = 50;
      }
    }
  }
}

// === Хаб ===
class Hub extends Building {
  constructor(gx, gy, dir) {
    super('hub', gx, gy, dir);
  }
  canAccept(fromDir) {
    const backDir = (this.direction + 2) % 4;
    return fromDir === backDir;
  }
}

function dirToOffset(dir) {
  return { 0: {dx:1,dy:0}, 1: {dx:0,dy:1}, 2: {dx:-1,dy:0}, 3: {dx:0,dy:-1} }[dir];
}