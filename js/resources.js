class ResourceItem {
  constructor(shape, color) {
    this.shape = shape;
    this.color = color;
  }
  get baseShape() { return this.shape.split('_')[0]; }
  get isHalf() { return this.shape.includes('_'); }
  get halfSuffix() {
    const parts = this.shape.split('_');
    return parts.length > 1 ? parts[1] : null;
  }
  equals(other) {
    return this.shape === other.shape && this.color === other.color;
  }
  clone() { return new ResourceItem(this.shape, this.color); }
}

const RESOURCE_SHAPES = ['circle'];
const RESOURCE_COLORS = ['red', 'blue'];

ResourceItem.createHalf = (base, suffix, color) => new ResourceItem(`${base}_${suffix}`, color);
ResourceItem.createFull = (shape, color) => new ResourceItem(shape, color);

const COLOR_HEX = {
  red: '#e94560',
  blue: '#4d80e4',
  green: '#4ecca3',
  yellow: '#ffd700',
  cyan: '#00d4ff',
  magenta: '#ff6ec7',
  white: '#ffffff',
  uncolored: '#cccccc'
};