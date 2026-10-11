/* Landing page "{{TITLE}}", Russian. Keys are the same in every language (checked by the build: make dist). Values are HTML. */
export default {
  langName: 'Русский',
  ogLocale: 'ru_RU',
  suggest: 'Эта страница есть на русском',
  suggestGo: 'Открыть',
  meta: { title: '{{TITLE}} · Explainer', description: '{{TITLE}}: a live isometric figure, a narrated video and the explanation.' },
  nav: { language: 'Язык' },
  hero: { eyebrow: 'Explainer', h1: '{{TITLE}}', lede: '…' },
  questions: ['…?', '…?'],
  machine: { kicker: 'Машина', h: 'Как это устроено', sub: '…', figTitle: '{{TITLE}}', figHint: '…', caption: '…' },
  video: { kicker: 'Ролик', h: 'Объяснение в диалоге', sub: '…', format: 'формат', live: 'Живой плеер ↗' },
  facts: { kicker: 'Суть', h: 'Главное', list: [['…', '…', '…']] },
  foot: 'Built with <a href="https://github.com/wheresryan22/anatomy">anatomy</a> and video-kit.',
  card: { title: '{{TITLE}}', text: '…', meta: 'explainer', alt: '{{TITLE}}' },
  js: { readout: 'reads {reading}', figLabel: '{{TITLE}}' },
};
