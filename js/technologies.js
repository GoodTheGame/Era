/**
 * Место для технологий (пока заглушка).
 */
class TechnologyTree {
  constructor() {
    this.unlocked = new Set();
  }

  isUnlocked(techId) {
    return this.unlocked.has(techId);
  }

  unlock(techId) {
    this.unlocked.add(techId);
  }
}