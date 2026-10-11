/* Проект ролика для скриптов video-kit: папка с film.js (по умолчанию — текущая, или --project <папка>).
 *
 * Имя роликов (out/<имя>[-en][-vertical][-captions].mp4) — поле "name" в voice.config.json,
 * иначе по папке: <инфографика>/video → <инфографика>. Языки — LANGS из film.js, первый — основной. */
import { existsSync, readFileSync } from 'node:fs';
import { basename, dirname, join, resolve } from 'node:path';
import { pathToFileURL } from 'node:url';

export const KIT = resolve(import.meta.dirname, '..');
/** корень, который отдаёт локальный сервер: папка над video-kit (корень репозитория) */
export const SERVE_ROOT = resolve(KIT, '..');

export async function project(args = process.argv.slice(2)) {
  const i = args.indexOf('--project');
  const dir = resolve(i >= 0 ? args[i + 1] : process.cwd());
  if (!existsSync(join(dir, 'film.js'))) {
    throw new Error(`нет film.js в ${dir}: запускайте из папки проекта (make …) или укажите --project <папка>`);
  }
  if (!dir.startsWith(`${SERVE_ROOT}/`)) throw new Error(`проект должен лежать внутри ${SERVE_ROOT}`);
  const cfgFile = join(dir, 'voice.config.json');
  const cfg = existsSync(cfgFile) ? JSON.parse(readFileSync(cfgFile, 'utf8')) : {};
  const name = cfg.name ?? (basename(dir) === 'video' ? basename(dirname(dir)) : basename(dir));
  const mod = await import(pathToFileURL(join(dir, 'film.js')).href);
  return { dir, name, cfg, makeFilm: mod.default, langs: mod.LANGS ?? ['ru'], url: dir.slice(SERVE_ROOT.length + 1) };
}
