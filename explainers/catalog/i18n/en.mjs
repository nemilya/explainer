/* Catalog, English (the main language). Keys — as in ru.mjs. */
export default {
  langName: 'English',
  ogLocale: 'en_US',
  suggest: 'This page is available in English',
  suggestGo: 'Open',
  meta: {
    title: 'Explainer — how things work',
    description: 'How-things-work explainers: a live isometric machine, a narrated dialogue video and a landing page, all from one model.',
  },
  nav: { language: 'Language' },
  hero: {
    h1: 'How things <em>work</em>',
    lede: 'Every topic is a machine whose working is the idea: you can play with it on the page, and in the video two people explain it while it runs. Every number on screen, on the counters and in the captions comes from one model.',
  },
  topics: 'Topics',
  how: {
    kicker: 'What it is made of',
    list: [
      ['anatomy', 'The figure', 'An isometric machine of dozens of parts — <a href="https://github.com/wheresryan22/anatomy">wheresryan22/anatomy</a>.'],
      ['video-kit', 'The video', 'Gemini TTS voice-over, a two-voice dialogue, camera moves, 16:9 and 9:16, several languages.'],
      ['model.js', 'One model', 'Pure functions of time: frame-by-frame rendering, a live page, honest numbers.'],
    ],
  },
  foot: 'A new topic: <code>make new SLUG=my-topic TITLE="How … works"</code> or <code>/explain</code> in Claude Code.',
  js: {},
};
