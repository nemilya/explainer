/* Page build (explainers/build.mjs): dictionary keys, links between languages, built pages are up to date. */
import { test } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import { checkKeys, linkBetween, pages } from '../build.mjs';

test('словари с разными ключами — ошибка сборки', () => {
  assert.throws(() => checkKeys({ en: { a: '1', b: { c: '2' } }, ru: { a: '1', b: {} } }, 'x'), /нет \[b\.c:string\]/);
  assert.throws(() => checkKeys({ en: { l: ['a', 'b'] }, ru: { l: ['a'] } }, 'x'), /arr2/);
  assert.doesNotThrow(() => checkKeys({ en: { a: '1', l: ['x'] }, ru: { a: '2', l: ['y'] } }, 'x'));
});

test('ссылки между локалями: относительные на одном домене, абсолютные между доменами', () => {
  assert.equal(linkBetween('https://e.x/t/', 'https://e.x/t/ru/'), 'ru/');
  assert.equal(linkBetween('https://e.x/t/ru/', 'https://e.x/t/'), '../');
  assert.equal(linkBetween('https://e.x/t/', 'https://e.x/t/'), './');
  assert.equal(linkBetween('https://e.x/', 'https://e.ru/'), 'https://e.ru/');
});

test('страницы: canonical, hreflang, x-default, нет незаполненных ключей; собранное актуально (make landing)', async () => {
  const list = await pages();
  const html = list.filter((p) => p.file.endsWith('.html'));
  assert.ok(html.length >= 4, 'каталог и хотя бы одна тема на двух языках');
  for (const { file, html: h } of html) {
    assert.match(h, /<link rel="canonical" href="https:\/\//, file);
    assert.match(h, /hreflang="x-default"/, file);
    assert.match(h, /<html lang="(en|ru)">/, file);
    assert.doesNotMatch(h, /\{\{|<!--if|<!--each/, `${file}: незаполненный шаблон`);
  }
  for (const { file, html: h } of list) assert.equal(fs.existsSync(file) && fs.readFileSync(file, 'utf8'), h, `${file} устарел — make landing`);
});
