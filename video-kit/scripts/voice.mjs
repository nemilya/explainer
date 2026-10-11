/* Voice-over: lines from film.js → TTS (OpenRouter, Gemini) → one track voice/<lang>.m4a
 * (voice + music + sound effects) + manifest voice/<lang>.json (line durations — the timeline
 * fits the action to them) + subtitles voice/<lang>.vtt.
 *
 *   node scripts/voice.mjs --lang ru                   # another language (default — the first in LANGS)
 *
 * Run from the project folder (film.js, voice.config.json there; output goes to its voice/)
 * or with --project <folder>; usually via make voice in the project.
 *
 * Settings — voice.config.json: shared ones on top, per-language overrides in langs.<lang> (voice, manner,
 * tempo — speeding up the finished speech, gap — pause between lines, pace — multiplier for scene pauses).
 * A second voice (a character): s.say(text, { voice: 'wolf' }) in film.js and "voices": { "wolf": { voice,
 * instructions, tempo?, speed?, model? } } in the settings — overrides of the main voice for such lines.
 *
 *   OPENROUTER_API_KEY=… node scripts/voice.mjs        # synthesize new lines + mix
 *   node scripts/voice.mjs --mix                       # only remix (no network, from the cache)
 *   node scripts/voice.mjs --redo "What could go"      # regenerate the lines containing this string
 *
 * Lines are cached in voice/clips/<hash>.wav (hash of the text, voice, model and manner):
 * after editing the script only the changed ones are synthesized again. Every new line
 * is transcribed back and compared with the text (missing words → synthesize again).
 * The key is read only from the environment and never written anywhere. Proxy — OPENROUTER_PROXY
 * (socks5h://…, http://…; requests then go through curl). */
import { execFileSync } from 'node:child_process';
import { createHash } from 'node:crypto';
import { existsSync, mkdirSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';

import { post as send } from '../lib/openrouter.mjs';
import { compile } from '../lib/timeline.js';
import { synth, wav } from '../lib/sound.mjs';
import { project } from './project.mjs';

const args = process.argv.slice(2);
const P = await project(args);
const ROOT = P.dir;
const LANG = args.includes('--lang') ? args[args.indexOf('--lang') + 1] : P.langs[0];
const BASE = JSON.parse(readFileSync(join(ROOT, 'voice.config.json'), 'utf8'));
const OWN = BASE.langs?.[LANG] ?? {};
const CFG = { ...BASE, ...OWN, verify: { ...BASE.verify, ...OWN.verify }, voices: { ...BASE.voices, ...OWN.voices } };
/** voice settings of a line: the main voice or a role from voices */
function voiceOf(role) {
  if (!role) return CFG;
  if (!CFG.voices[role]) throw new Error(`нет голоса «${role}» в voices (voice.config.json)`);
  return { ...CFG, ...CFG.voices[role] };
}
const film = P.makeFilm(LANG);
const DIR = join(ROOT, 'voice');
const CLIPS = join(DIR, 'clips');
const MIX_ONLY = args.includes('--mix');
const REDO = args.includes('--redo') ? args[args.indexOf('--redo') + 1] : null;
mkdirSync(CLIPS, { recursive: true });

const ff = (...a) => execFileSync('ffmpeg', ['-y', '-loglevel', 'error', ...a]);
const probe = (f) => Number(execFileSync('ffprobe', ['-v', 'error', '-show_entries', 'format=duration', '-of', 'csv=p=0', f]).toString());
const rel = (p) => p.replace(`${ROOT}/`, '');

const post = (path, body, form = null) => send(path, body, { form, endpoint: CFG.endpoint });

async function tts(text, out, V = CFG) {
  const TEMPO = V.tempo ?? 1;
  const res = await post('/audio/speech', {
    model: V.model, input: text, voice: V.voice, response_format: 'pcm', instructions: V.instructions, speed: V.speed,
  });
  const raw = `${out}.raw`;
  writeFileSync(raw, res.body);
  const rate = Number(/rate=(\d+)/.exec(res.type)?.[1]) || 24000;
  if (/pcm/.test(res.type) || !res.type) ff('-f', 's16le', '-ar', String(rate), '-ac', '1', '-i', raw, '-ar', '48000', '-ac', '1', out);
  else ff('-i', raw, '-ar', '48000', '-ac', '1', out);
  rmSync(raw);
  // speed up speech without changing pitch (tempo in the language settings)
  if (TEMPO !== 1) {
    const fast = `${out}.fast.wav`;
    ff('-i', out, '-af', `atempo=${TEMPO}`, fast);
    execFileSync('mv', [fast, out]);
  }
  // trim the silence at both ends (scenes keep their own pauses)
  const trimmed = `${out}.trim.wav`;
  ff('-i', out, '-af', 'silenceremove=start_periods=1:start_threshold=-50dB,areverse,silenceremove=start_periods=1:start_threshold=-50dB,areverse,apad=pad_dur=0.08', trimmed);
  execFileSync('mv', [trimmed, out]);
}

// ---------------------------------------------------------------- check: transcribe and compare
const norm = (s) => s.toLowerCase().replace(/ё/g, 'е').replace(/[’']/g, '').replace(/[^\p{L}\p{N}]+/gu, ' ').trim();
function lev(x, y) {
  const dp = Array.from({ length: y.length + 1 }, (_, j) => j);
  for (let i = 1; i <= x.length; i++) {
    let prev = dp[0];
    dp[0] = i;
    for (let j = 1; j <= y.length; j++) {
      const tmp = dp[j];
      dp[j] = Math.min(dp[j] + 1, dp[j - 1] + 1, prev + (x[i - 1] === y[j - 1] ? 0 : 1));
      prev = tmp;
    }
  }
  return 1 - dp[y.length] / Math.max(x.length, y.length, 1);
}
const near = (w, words) => words.some((g) => lev(w, g) >= 0.6);
const NUMBER = /^(ноль|нол[яюе]|од(ин|на|но|ну|ного|ной)|дв(а|е|ух|ум)|тр(и|ех|ём|ем)|четыр(е|ех)|пят\S*|шест\S*|сем\S*|восем\S*|девят\S*|десят\S*|\S+надцат\S*|двадцат\S*|тридцат\S*|сорок\S*|пятьдесят|шестьдесят|семьдесят|восемьдесят|девяност\S*|сто|ста|двест\S*|трист\S*|четырест\S*|\S+сот|тысяч\S*|zero|one|two|three|four|five|six|seven|eight|nine|ten|eleven|twelve|\S+teen|twenty|thirty|forty|fifty|sixty|seventy|eighty|ninety|hundred|thousand)$/;
async function verify(file, text) {
  const res = await post('/audio/transcriptions', null, { model: CFG.verify.model, language: CFG.language ?? LANG, file: { file } });
  const transcript = JSON.parse(res.body.toString('utf8')).text?.trim() ?? '';
  const skip = new Set(CFG.verify.skip ?? []);
  // transcription writes numbers as digits ("four twenty-nine" → 429): then number words are not compared
  const digits = /\d/.test(transcript);
  const want = norm(text).split(' ').filter((w) => w.length > 1 && !skip.has(w) && !(digits && NUMBER.test(w)));
  const got = norm(transcript).split(' ');
  const score = Math.round((want.filter((w) => near(w, got)).length / Math.max(want.length, 1)) * 100) / 100;
  const tail = near(want.at(-1), got.slice(-3));
  return { transcript, score, tail, ok: score >= CFG.verify.minScore && tail };
}

// ---------------------------------------------------------------- 1. lines
const said = new Map(compile(film).events.filter((e) => e.type === 'voice').map((e) => [e.text, e.voice]));
const lines = {};
for (const [text, role] of said) {
  const V = voiceOf(role);
  const TEMPO = V.tempo ?? 1;
  const hash = createHash('sha256').update(JSON.stringify([V.model, V.voice, V.instructions, V.speed, text, ...(TEMPO !== 1 ? [TEMPO] : [])])).digest('hex').slice(0, 12);
  const file = join(CLIPS, `${hash}.wav`);
  const check = file.replace(/\.wav$/, '.check.json');
  if (REDO && text.includes(REDO)) { rmSync(file, { force: true }); rmSync(check, { force: true }); }
  if (!existsSync(file) && MIX_ONLY) throw new Error(`нет реплики в кеше (запустите без --mix): ${text}`);
  for (let attempt = 1; !MIX_ONLY; attempt++) {
    if (!existsSync(file)) {
      console.log(`tts${attempt > 1 ? ` (попытка ${attempt})` : ''}${role ? ` [${role}]` : ''}: ${text}`);
      await tts(text, file, V);
    }
    if (!CFG.verify.enabled || existsSync(check)) break;
    const v = await verify(file, text);
    if (v.ok) { writeFileSync(check, `${JSON.stringify(v, null, 2)}\n`); break; }
    console.warn(`  ⚠ распознано «${v.transcript}» (совпадение ${v.score}${v.tail ? '' : ', оборван конец'})`);
    if (attempt >= CFG.verify.retries) { writeFileSync(check, `${JSON.stringify(v, null, 2)}\n`); console.warn('  ⚠ оставляю последнюю попытку'); break; }
    rmSync(file);
  }
  lines[text] = { dur: Math.round(probe(file) * 100) / 100, clip: `clips/${hash}.wav`, ...(role ? { voice: role } : {}) };
}

// ---------------------------------------------------------------- 2. timeline from the real durations
const manifest = { model: CFG.model, voice: CFG.voice, ...(CFG.gap !== undefined ? { gap: CFG.gap } : {}), ...(CFG.pace !== undefined ? { pace: CFG.pace } : {}), lines };
const tl = compile(film, manifest);
const cues = tl.events.filter((e) => e.type === 'voice');

// ---------------------------------------------------------------- 3. music, sound effects, mix
const { music, fx } = synth(tl);
wav(join(CLIPS, 'music.wav'), music);
wav(join(CLIPS, 'fx.wav'), fx);
const inputs = cues.flatMap((c) => ['-i', join(DIR, lines[c.text].clip)]);
const delays = cues.map((c, i) => `[${i}]adelay=${Math.round(c.t * 1000)}:all=1[a${i}]`);
const D = tl.duration.toFixed(2);
const n = cues.length;
const chains = [
  `${delays.join(';')};${cues.map((_, i) => `[a${i}]`).join('')}amix=inputs=${n}:normalize=0,apad=whole_dur=${D},loudnorm=I=${CFG.loudness}:TP=-1.5,aresample=48000,asplit=2[v][vs]`,
  `[${n}]highpass=f=40,volume=${CFG.music.gain}dB[mr]`,
  ...(CFG.music.duck ? ['[mr][vs]sidechaincompress=threshold=0.02:ratio=4:attack=30:release=500[m]'] : ['[mr]anull[m]', '[vs]anullsink']),
  `[${n + 1}]volume=${CFG.sfx.gain}dB[f]`,
  `[v][m][f]amix=inputs=3:normalize=0,alimiter=limit=0.89:level=false[out]`,
];
const track = join(DIR, `${LANG}.m4a`);
ff(...inputs, '-i', join(CLIPS, 'music.wav'), '-i', join(CLIPS, 'fx.wav'), '-filter_complex', chains.join(';'),
  '-map', '[out]', '-ar', '48000', '-ac', '1', '-c:a', 'aac', '-b:a', '192k', '-t', D, track);

// ---------------------------------------------------------------- 4. subtitles and manifest
const ts = (x) => new Date(Math.round(x * 1000)).toISOString().slice(11, 23);
writeFileSync(join(DIR, `${LANG}.vtt`), `WEBVTT\n\n${cues.map((c, i) => `${i + 1}\n${ts(c.t)} --> ${ts(c.t + c.dur)}\n${c.text}\n`).join('\n')}`);
writeFileSync(join(DIR, `${LANG}.json`), `${JSON.stringify({ ...manifest, duration: Math.round(tl.duration * 100) / 100 }, null, 2)}\n`);
console.log(`${n} реплик, ролик ${tl.duration.toFixed(1)} с → ${rel(track)}, ${rel(join(DIR, `${LANG}.vtt`))}`);
