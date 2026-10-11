/* Page build (explainers/build.mjs): dictionary keys, links between languages, built pages are up to date. */
import { test } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import { checkKeys, linkBetween, pages } from '../build.mjs';

test('dictionaries with different keys fail the build', () => {
  assert.throws(() => checkKeys({ en: { a: '1', b: { c: '2' } }, ru: { a: '1', b: {} } }, 'x'), /missing \[b\.c:string\]/);
  assert.throws(() => checkKeys({ en: { l: ['a', 'b'] }, ru: { l: ['a'] } }, 'x'), /arr2/);
  assert.doesNotThrow(() => checkKeys({ en: { a: '1', l: ['x'] }, ru: { a: '2', l: ['y'] } }, 'x'));
});

test('links between locales: relative on one domain, absolute across domains', () => {
  assert.equal(linkBetween('https://e.x/t/', 'https://e.x/t/ru/'), 'ru/');
  assert.equal(linkBetween('https://e.x/t/ru/', 'https://e.x/t/'), '../');
  assert.equal(linkBetween('https://e.x/t/', 'https://e.x/t/'), './');
  assert.equal(linkBetween('https://e.x/', 'https://e.ru/'), 'https://e.ru/');
});

test('pages: canonical, hreflang, x-default, no unfilled keys; built pages are up to date (make landing)', async () => {
  const list = await pages();
  const html = list.filter((p) => p.file.endsWith('.html'));
  assert.ok(html.length >= 4, 'the catalog and at least one topic in two languages');
  for (const { file, html: h } of html) {
    assert.match(h, /<link rel="canonical" href="https:\/\//, file);
    assert.match(h, /hreflang="x-default"/, file);
    assert.match(h, /<html lang="(en|ru)">/, file);
    assert.doesNotMatch(h, /\{\{|<!--if|<!--each/, `${file}: unfilled template`);
  }
  for (const { file, html: h } of list) assert.equal(fs.existsSync(file) && fs.readFileSync(file, 'utf8'), h, `${file} is out of date — make landing`);
});
