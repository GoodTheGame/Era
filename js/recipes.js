const RECIPES = {
  // Резак: для красного - вертикально (left/right), для синего - горизонтально (top/bottom)
  cutter: (resource) => {
    if (!resource.isHalf && resource.shape === 'circle') {
      if (resource.color === 'red') {
        return [
          ResourceItem.createHalf('circle', 'left', resource.color),
          ResourceItem.createHalf('circle', 'right', resource.color)
        ];
      } else if (resource.color === 'blue') {
        return [
          ResourceItem.createHalf('circle', 'top', resource.color),
          ResourceItem.createHalf('circle', 'bottom', resource.color)
        ];
      }
    }
    return null;
  },
  // Вращатель: меняет суффикс по часовой стрелке
  rotator: (resource) => {
    if (!resource.isHalf) return resource.clone();
    const cycle = ['top', 'right', 'bottom', 'left'];
    const idx = cycle.indexOf(resource.halfSuffix);
    if (idx === -1) return resource.clone();
    const newSuffix = cycle[(idx + 1) % 4];
    return ResourceItem.createHalf(resource.baseShape, newSuffix, resource.color);
  },
  // Смеситель: принимает левую и правую половинки одного цвета и формы
  mixer: (a, b) => {
    if (a.color !== b.color) return null;
    if (a.baseShape !== b.baseShape) return null;
    const valid =
      (a.halfSuffix === 'left' && b.halfSuffix === 'right') ||
      (a.halfSuffix === 'right' && b.halfSuffix === 'left');
    if (valid) {
      return ResourceItem.createFull(a.baseShape, a.color);
    }
    return null;
  }
};