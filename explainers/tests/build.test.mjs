/* Site build (explainers/build.mjs): dictionary keys, links between languages, and a dist/ without broken links. */
import { test } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { build, checkKeys, linkBetween, pages } from '../build.mjs';

test('dictionaries with different keys fail the build', () => {
  assert.throws(() => checkKeys({ en: { a: '1', b: { c: '2' } }, ru: { a: '1', b: {} } }, 'x'), /missing \[b\.c:string\]/);
  assert.throws(() => checkKeys({ en: { l: ['a', 'b'] }, ru: { l: ['a'] } }, 'x'), /arr2/);
  assert.doesNotThrow(() => checkKeys({ en: { a: '1', l: ['x'] }, ru: { a: '2', l: ['y'] } }, 'x'));
});

test('links between locales: relative on one domain, absolute across domains', () => {
  assert.equal(linkBetween('https://e.x/t/', 'https://e.x/t/ru/'), 'ru/');
  assert.equal(linkBetween('https://e.x/t/ru/', 'https://e.x/t/'), '../');
  assert.equal(linkBetween('https://e.x/t/', 'https://e.x/t/'), './');
  assert.equal(linkBetween('https://e.x/', 'https://e.x.ru/'), 'https://e.x.ru/');
});

test('pages: canonical, hreflang, x-default, no unfilled keys', async () => {
  const { files } = await pages();
  const html = files.filter((p) => p.file.endsWith('.html'));
  assert.ok(html.length >= 4, 'the catalog and at least one topic in two languages');
  for (const { file, html: h } of html) {
    assert.match(h, /<link rel="canonical" href="https:\/\//, file);
    assert.match(h, /hreflang="x-default"/, file);
    assert.match(h, /<html lang="(en|ru)">/, file);
    assert.doesNotMatch(h, /\{\{|<!--if|<!--each/, `${file}: unfilled template`);
  }
});

test('dist: every local link, stylesheet url() and module import resolves to a file', async () => {
  const out = fs.mkdtempSync(path.join(os.tmpdir(), 'explainer-dist-'));
  try {
    await build(out);
    const all = [];
    const walk = (d) => { for (const f of fs.readdirSync(d)) { const p = path.join(d, f); fs.statSync(p).isDirectory() ? walk(p) : all.push(p); } };
    walk(out);
    const broken = [];
    const check = (from, ref) => {
      if (!ref || /^(https?:|data:|mailto:|#|\/\/)/.test(ref) || ref.includes('${')) return;
      let p = path.resolve(path.dirname(from), decodeURIComponent(ref.split(/[?#]/)[0]));
      if (ref.split(/[?#]/)[0].endsWith('/') || (fs.existsSync(p) && fs.statSync(p).isDirectory())) p = path.join(p, 'index.html');
      if (!fs.existsSync(p)) broken.push(`${path.relative(out, from)} → ${ref}`);
    };
    for (const f of all) {
      const s = fs.readFileSync(f, 'utf8');
      if (f.endsWith('.html')) for (const m of s.matchAll(/\s(?:src|href|poster|data-href|data-live-[hv])="([^"]+)"/g)) check(f, m[1]);
      if (f.endsWith('.css')) for (const m of s.matchAll(/url\(([^)'"]+)\)/g)) check(f, m[1]);
      if (/\.m?js$/.test(f)) for (const m of s.matchAll(/(?:^|\s)(?:import|export)\b[^'"]*?from\s*['"](\.{1,2}\/[^'"]+)['"]|import\(\s*['"](\.{1,2}\/[^'"]+)['"]/gm)) check(f, m[1] ?? m[2]);
    }
    assert.deepEqual(broken, [], 'broken references in dist/');
    assert.ok(all.some((f) => f.endsWith('.mp4')), 'the videos are in dist/');
  } finally {
    fs.rmSync(out, { recursive: true, force: true });
  }
});
