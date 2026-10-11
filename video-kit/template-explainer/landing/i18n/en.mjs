/* Лендинг «{{TITLE}}», English. Ключи во всех языках одинаковые (проверяет сборка: make landing). Значения — HTML. */
export default {
  langName: 'English',
  ogLocale: 'en_US',
  suggest: 'This page is available in English',
  suggestGo: 'Open',
  meta: { title: '{{TITLE}} · Explainer', description: '{{TITLE}}: a live isometric figure, a narrated video and the explanation.' },
  nav: { language: 'Language' },
  hero: { eyebrow: 'Explainer', h1: '{{TITLE}}', lede: '…' },
  questions: ['…?', '…?'],
  machine: { kicker: 'The machine', h: 'How it works', sub: '…', figTitle: '{{TITLE}}', figHint: '…', caption: '…' },
  video: { kicker: 'The video', h: 'Explained as a dialogue', sub: '…', format: 'format', live: 'Live player ↗' },
  facts: { kicker: 'The gist', h: 'Key points', list: [['…', '…', '…']] },
  foot: 'Built with <a href="https://github.com/wheresryan22/anatomy">anatomy</a> and video-kit.',
  card: { title: '{{TITLE}}', text: '…', meta: 'explainer', alt: '{{TITLE}}' },
  js: { readout: 'reads {reading}', figLabel: '{{TITLE}}' },
};
