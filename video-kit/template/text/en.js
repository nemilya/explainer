/* English texts: say — voice lines, cue — sync words (must appear verbatim in the line: the
 * animation fires when they are spoken), the rest — on-screen copy (inline HTML is allowed). */
export default {
  ui: {
    title: 'Video title',
    brand: 'Topic · Project',
    chapters: { title: 'Intro', verdict: 'Conclusion', end: 'Finale' },
    watch: 'Watch',
    menu: 'Chapters',
  },
  cover: {
    eyebrow: 'Topic · Subtopic',
    h1: ['The', '<em>big</em>', '<br>', 'question?'],
    sub: 'One idea worth watching till the end.',
    foot: 'Based on: author, source',
  },
  title: {
    say: ['The big question of this video, in one line.'],
    eyebrow: 'Topic · Subtopic',
    h1: ['The', '<em>big</em>', '<br>', 'question?'],
    by: 'In short: <b>whose ideas</b> and where from',
  },
  points: {
    kicker: 'Three points',
    say: [
      'Here is what matters.',
      'First, the first point. Second, the second one. And finally, the third.',
    ],
    cue: ['first point', 'second one', 'third'],
    h2: 'Three <em>points</em>',
    cards: [['01', 'First point'], ['02', 'Second point'], ['03', 'Third point']],
  },
  verdict: {
    say: ['And the main takeaway, in one strong line.'],
    text: 'The main takeaway, in one strong line.',
  },
  end: {
    say: ['The question stays open.'],
    foot: 'Based on: author, source',
  },
};
