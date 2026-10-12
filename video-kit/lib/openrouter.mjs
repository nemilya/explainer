/* OpenRouter requests for the scripts (voice-over — scripts/voice.mjs, images — scripts/art.mjs).
 * Key — only from OPENROUTER_API_KEY in the environment, never written anywhere. Proxy — OPENROUTER_PROXY
 * (socks5h://…, http://…; requests then go through curl). Retries on 429 and 5xx — up to 4 attempts. */
import { execFileSync } from 'node:child_process';
import { existsSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { basename, join } from 'node:path';

export const ENDPOINT = 'https://openrouter.ai/api/v1';
const PROXY = process.env.OPENROUTER_PROXY || '';

/** POST directly or through curl with a proxy → { status, type, body: Buffer } */
async function send(url, headers, json, form = null, timeout = 180) {
  if (!PROXY) {
    let body = json;
    if (form) {
      body = new FormData();
      for (const [k, v] of Object.entries(form)) {
        if (v.file) body.append(k, new Blob([readFileSync(v.file)]), basename(v.file));
        else body.append(k, v);
      }
    }
    const res = await fetch(url, { method: 'POST', headers, body, signal: AbortSignal.timeout(timeout * 1000) });
    return { status: res.status, type: res.headers.get('content-type') || '', body: Buffer.from(await res.arrayBuffer()) };
  }
  const tmp = mkdtempSync(join(tmpdir(), 'video-kit-or-'));
  const conf = join(tmp, 'curl.conf');
  const out = join(tmp, 'body');
  const q = (v) => `"${String(v).replace(/\\/g, '\\\\').replace(/"/g, '\\"')}"`;
  writeFileSync(conf, [
    `url = ${q(url)}`, `proxy = ${q(PROXY)}`, 'request = "POST"', 'silent', 'show-error',
    `max-time = ${timeout}`, `output = ${q(out)}`, 'write-out = "%{http_code} %{content_type}"',
    ...(form ? Object.entries(form).map(([k, v]) => `form = ${q(v.file ? `${k}=@${v.file}` : `${k}=${v}`)}`) : ['data-binary = "@-"']),
    ...Object.entries(headers).map(([k, v]) => `header = ${q(`${k}: ${v}`)}`),
  ].join('\n'), { mode: 0o600 });
  try {
    const [code, type = ''] = execFileSync('curl', ['--config', conf], { input: form ? '' : json, maxBuffer: 1 << 26 }).toString().trim().split(' ');
    return { status: Number(code), type, body: existsSync(out) ? readFileSync(out) : Buffer.alloc(0) };
  } finally {
    rmSync(tmp, { recursive: true, force: true });
  }
}

/** POST {endpoint}{path}: a JSON body or multipart (form: { field: string | { file } }) */
export async function post(path, body, { form = null, endpoint = ENDPOINT, timeout = 180 } = {}) {
  const key = process.env.OPENROUTER_API_KEY;
  if (!key) throw new Error('no OPENROUTER_API_KEY in the environment (video-kit/README.md)');
  const headers = { authorization: `Bearer ${key}`, 'x-title': 'Explainer video' };
  if (!form) headers['content-type'] = 'application/json';
  let res;
  for (let attempt = 1; ; attempt++) {
    try {
      res = await send(`${endpoint}${path}`, headers, form ? '' : JSON.stringify(body), form, timeout);
    } catch (e) {
      // a dropped connection or a timeout — treated as 5xx
      res = { status: 599, type: '', body: Buffer.from(String(e.message)) };
    }
    if (!(res.status === 429 || res.status >= 500) || attempt >= 4) break;
    console.warn(`  … ${path}: HTTP ${res.status}, retrying in ${5 * attempt} s`);
    await new Promise((ok) => setTimeout(ok, 5000 * attempt));
  }
  if (res.status < 200 || res.status >= 300) throw new Error(`${path}: HTTP ${res.status} ${res.body.toString('utf8').slice(0, 300)}`);
  return res;
}
