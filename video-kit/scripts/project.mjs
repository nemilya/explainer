/* A video project for the video-kit scripts: the folder with film.js (the current one by default, or --project <folder>).
 *
 * Video file name (out/<name>[-<lang>][-vertical][-captions].mp4) — the "name" field in voice.config.json,
 * otherwise from the folder: <topic>/video → <topic>. Languages — LANGS from film.js, the first is the main one. */
import { existsSync, readFileSync } from 'node:fs';
import { basename, dirname, join, resolve } from 'node:path';
import { pathToFileURL } from 'node:url';

export const KIT = resolve(import.meta.dirname, '..');
/** the root served by the local server: the folder above video-kit (the repo root) */
export const SERVE_ROOT = resolve(KIT, '..');

export async function project(args = process.argv.slice(2)) {
  const i = args.indexOf('--project');
  const dir = resolve(i >= 0 ? args[i + 1] : process.cwd());
  if (!existsSync(join(dir, 'film.js'))) {
    throw new Error(`no film.js in ${dir}: run from the project folder (make …) or pass --project <folder>`);
  }
  if (!dir.startsWith(`${SERVE_ROOT}/`)) throw new Error(`the project must be inside ${SERVE_ROOT}`);
  const cfgFile = join(dir, 'voice.config.json');
  const cfg = existsSync(cfgFile) ? JSON.parse(readFileSync(cfgFile, 'utf8')) : {};
  const name = cfg.name ?? (basename(dir) === 'video' ? basename(dirname(dir)) : basename(dir));
  const mod = await import(pathToFileURL(join(dir, 'film.js')).href);
  return { dir, name, cfg, makeFilm: mod.default, langs: mod.LANGS ?? ['ru'], url: dir.slice(SERVE_ROOT.length + 1) };
}
