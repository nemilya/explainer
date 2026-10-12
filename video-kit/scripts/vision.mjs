/* vision.mjs — ask a vision model (OpenRouter) about an image. For checking video frames
 * when the environment doesn't show images to the agent directly (Read returns "Unsupported Image").
 *
 *   node video-kit/scripts/vision.mjs <image.png|jpg> "<question>" [--model M] [--local path/to/local.mk]
 *
 * Key/proxy — from OPENROUTER_API_KEY / OPENROUTER_PROXY in the environment or from local.mk (looked up in cwd,
 * or a path via --local). Default model — anthropic/claude-haiku-5.5 (or CHECK_MODEL).
 * One request with the image as a data URI (max_tokens: 1000). */
import { readFileSync, writeFileSync, mkdtempSync, rmSync, existsSync } from 'node:fs';
import { execFileSync } from 'node:child_process';
import { join, resolve } from 'node:path';
import { tmpdir } from 'node:os';

const args = process.argv.slice(2);
const flag = (n) => (args.includes(n) ? args[args.indexOf(n) + 1] : null);
const localArg = flag('--local');
const modelArg = flag('--model');
const pos = args.filter((a, i) => !a.startsWith('--') && args[i - 1] !== '--local' && args[i - 1] !== '--model');
const [image, question] = pos;
if (!image || !question) {
  console.error('usage: node vision.mjs <image.png|jpg> "<question>" [--model M] [--local path/local.mk]');
  process.exit(2);
}

let KEY = process.env.OPENROUTER_API_KEY || '';
let PROXY = process.env.OPENROUTER_PROXY || '';
const lmPath = localArg ? resolve(localArg) : resolve('local.mk');
if ((!KEY || !PROXY) && existsSync(lmPath)) {
  const lm = readFileSync(lmPath, 'utf8');
  // make syntax: NAME = v, NAME := v, NAME ?= v, export NAME = v; commented-out lines are skipped
  const mkVar = (name) => lm.match(new RegExp(`^[ \\t]*(?:export[ \\t]+)?${name}[ \\t]*[:?]?=(.*)$`, 'm'))?.[1]?.trim() ?? '';
  KEY ||= mkVar('OPENROUTER_API_KEY');
  PROXY ||= mkVar('OPENROUTER_PROXY');
}
if (!KEY) { console.error('no key: set OPENROUTER_API_KEY or local.mk'); process.exit(3); }

const MODEL = modelArg || process.env.CHECK_MODEL || 'anthropic/claude-haiku-5.5';
const mime = /\.jpe?g$/i.test(image) ? 'image/jpeg' : 'image/png';
const img = readFileSync(resolve(image));
const body = JSON.stringify({
  model: MODEL, max_tokens: 1000,
  messages: [{ role: 'user', content: [
    { type: 'text', text: question },
    { type: 'image_url', image_url: { url: `data:${mime};base64,${img.toString('base64')}` } },
  ] }],
});

const tmp = mkdtempSync(join(tmpdir(), 'vision-'));
const bodyFile = join(tmp, 'body.json'), outFile = join(tmp, 'out.json');
writeFileSync(bodyFile, body);
const cargs = ['-s', '--max-time', '180', '-o', outFile, '-w', '%{http_code}',
  '-H', `Authorization: Bearer ${KEY}`, '-H', 'Content-Type: application/json', '--data-binary', `@${bodyFile}`];
if (PROXY) cargs.push('--proxy', PROXY);
cargs.push('https://openrouter.ai/api/v1/chat/completions');
try {
  const code = execFileSync('curl', cargs, { timeout: 200000, killSignal: 'SIGKILL' }).toString().trim();
  if (/^20\d$/.test(code)) {
    const c = JSON.parse(readFileSync(outFile, 'utf8')).choices?.[0]?.message?.content ?? '';
    console.log(Array.isArray(c) ? c.map((x) => x?.text ?? '').join(' ') : String(c));
  } else {
    console.log(`HTTP ${code}: ${readFileSync(outFile, 'utf8').slice(0, 400)}`);
    process.exitCode = 1;
  }
} finally { rmSync(tmp, { recursive: true, force: true }); }
