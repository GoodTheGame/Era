class Localizer {
  constructor(lang = 'en') {
    this.lang = lang;
    this.translations = {};
    this.loadTranslations();
  }

  loadTranslations() {
    if (typeof LANG_EN !== 'undefined') Object.assign(this.translations, LANG_EN);
    if (this.lang === 'ru' && typeof LANG_RU !== 'undefined') Object.assign(this.translations, LANG_RU);
  }

  t(key) {
    return this.translations[key] || key;
  }
}