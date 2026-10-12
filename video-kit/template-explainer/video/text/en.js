/* English texts — same keys and list lengths as ru.js. */
export default {
  ui: { title: '{{TITLE}}', brand: 'Explainer · {{TITLE}}', chapters: { hook: 'Question', end: 'Finale' }, watch: 'Watch', menu: 'Chapters' },
  speakers: { she: { name: 'Vera', role: 'explains' }, he: { name: 'Max', role: 'asks' } },
  cover: { eyebrow: 'Explainer', h1: ['{{TITLE}}'], sub: 'One line on why to watch.', foot: 'the key idea' },
  hook: {
    say: [['he', 'The viewer’s main question, in one line?'], ['she', 'Let me show you on a machine.']],
    eyebrow: 'Explainer', h1: '{{TITLE}}',
  },
  part: {
    kicker: 'A part',
    say: [['she', 'This is the carriage: its position is the quantity we are talking about.'], ['he', 'And what moves it?']],
    cue: ['carriage'],
    pin: 'carriage — the quantity',
  },
  end: { say: [['he', 'Got it, thanks!']], h1: '{{TITLE}}', cta: 'The model is live — on the page' },
};
