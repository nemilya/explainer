/* Russian texts. say — lines [who, text]: 'she' — explains (the main voice), 'he' — asks.
 * cue — cue words (verbatim from the lines). Numbers for the voice — in words, on screen — in digits. */
export default {
  ui: { title: '{{TITLE}}', brand: 'Explainer · {{TITLE}}', chapters: { hook: 'Вопрос', end: 'Финал' }, watch: 'Смотреть', menu: 'Главы',
    player: { play: 'Пуск / пауза (пробел)', prev: 'Предыдущая глава (P)', next: 'Следующая глава (N)', seek: 'Перемотка', cc: 'Субтитры (C)', mute: 'Звук (M)', fs: 'Во весь экран (F)', horizontal: 'Горизонтальная версия', vertical: 'Вертикальная версия' } },
  speakers: { she: { name: 'Вера', role: 'объясняет' }, he: { name: 'Макс', role: 'спрашивает' } },
  cover: { eyebrow: 'Explainer', h1: ['{{TITLE}}'], sub: 'Одна фраза — зачем смотреть.', foot: 'главная мысль' },
  hook: {
    say: [['he', 'Главный вопрос зрителя — одной фразой?'], ['she', 'Давай покажу на машине.']],
    eyebrow: 'Explainer', h1: '{{TITLE}}',
  },
  part: {
    kicker: 'Деталь',
    say: [['she', 'Вот каретка: её положение и есть величина, о которой мы говорим.'], ['he', 'А что её двигает?']],
    cue: ['каретка'],
    pin: 'каретка — величина',
  },
  end: { say: [['he', 'Понял, спасибо!']], h1: '{{TITLE}}', cta: 'Модель живая — на странице' },
};
