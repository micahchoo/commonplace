/**
 * Resolve which channels the site shows.
 * Precedence: ?channel=/?channels=a,b,c  →  config.json  →  empty ('configure me').
 * Plain module; fetchJson is injectable for tests.
 */
import { extractSlug } from './model.js';

async function defaultFetchJson(url) {
  const res = await fetch(url);
  if (!res.ok) throw new Error(`config ${res.status}`);
  return res.json();
}

const toSlugs = (list) =>
  list
    .map((s) => extractSlug(String(s).trim()))
    .filter(Boolean);

/**
 * @param {string} search - location.search
 * @param {(url:string)=>Promise<any>} [fetchJson]
 * @returns {Promise<{title?:string, about?:string, logo?:string, theme?:object, channels:string[], source:'params'|'config'|'empty'}>}
 */
export async function resolveConfig(search = '', fetchJson = defaultFetchJson) {
  const params = new URLSearchParams(search);
  const fromParams = params.get('channels') || params.get('channel');
  if (fromParams) {
    const channels = toSlugs(fromParams.split(','));
    if (channels.length) return { channels, source: 'params' };
  }

  let cfg = null;
  try {
    cfg = await fetchJson('config.json');
  } catch {
    cfg = null;
  }

  if (cfg && Array.isArray(cfg.channels) && cfg.channels.length) {
    const channels = toSlugs(cfg.channels);
    if (channels.length) {
      return {
        title: cfg.title,
        about: cfg.about,
        logo: cfg.logo,
        theme: cfg.theme,
        channels,
        source: 'config',
      };
    }
  }

  return { channels: [], source: 'empty' };
}
