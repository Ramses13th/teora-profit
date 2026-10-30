import { parseScenario, validate } from './model.js?v=20261030';

// These orders are wire formats. Do not derive them from future defaults.
export const SHARE_KEYS_V1 = Object.freeze([
  'packSize', 'packCost', 'lighterCost', 'salePrice', 'batchSize',
  'chromeEnabled', 'chromePrice', 'chromeYield',
  'lacquerEnabled', 'lacquerPrice', 'lacquerYield',
  'packagingEnabled', 'packagingCost', 'shippingEnabled', 'shippingCost',
  'purchaseShipping', 'feesEnabled', 'feePercent', 'feeFixed',
  'capital', 'reinvest', 'cycles', 'capacity', 'demand', 'demandGrowth',
  'productionMode',
]);
export const SHARE_KEYS = Object.freeze([...SHARE_KEYS_V1, 'chromeOwned', 'chromeStock', 'lacquerOwned', 'lacquerStock']);
export const SHARE_VERSION = 2;
// Old links predate owned consumables. Keep their upgrade independent of defaults.
const V1_OWNED_DEFAULTS = Object.freeze({chromeOwned:false,chromeStock:30,lacquerOwned:false,lacquerStock:40});
export const MAX_SHARE_TOKEN_LENGTH = 2048;
const MAX_URL_LENGTH = 8192;
const VIEWS = new Set(['calculator', 'scalare']);
const INVALID_LINK = 'Linkul de calcul nu este valid. Cere un link nou.';

function urlFrom(value) {
  if (value instanceof URL) value = value.href;
  if (typeof value !== 'string' || value.length > MAX_URL_LENGTH) throw Error(INVALID_LINK);
  let url;
  try { url = new URL(value); } catch { throw Error(INVALID_LINK); }
  if (!['http:', 'https:'].includes(url.protocol) || url.username || url.password) throw Error(INVALID_LINK);
  return url;
}

function checkedSettings(input) {
  if (!input || typeof input !== 'object' || Array.isArray(input)) throw Error(INVALID_LINK);
  const prototype = Object.getPrototypeOf(input);
  if (prototype !== Object.prototype && prototype !== null) throw Error(INVALID_LINK);
  const keys = Reflect.ownKeys(input);
  if (keys.length !== SHARE_KEYS.length || keys.some(key => !SHARE_KEYS.includes(key))) throw Error(INVALID_LINK);
  const safe = {};
  for (const key of SHARE_KEYS) {
    const descriptor = Object.getOwnPropertyDescriptor(input, key);
    if (!descriptor || !Object.hasOwn(descriptor, 'value')) throw Error(INVALID_LINK);
    safe[key] = descriptor.value;
  }
  if (Object.keys(validate(safe)).length) throw Error(INVALID_LINK);
  return parseScenario(safe);
}

function base64url(bytes) {
  let binary = '';
  for (const byte of bytes) binary += String.fromCharCode(byte);
  return btoa(binary).replaceAll('+', '-').replaceAll('/', '_').replace(/=+$/, '');
}

function encode(settings) {
  const payload = JSON.stringify([SHARE_VERSION, ...SHARE_KEYS.map(key => settings[key])]);
  const token = base64url(new TextEncoder().encode(payload));
  if (token.length > MAX_SHARE_TOKEN_LENGTH) throw Error(INVALID_LINK);
  return token;
}

function decode(token) {
  if (!token || token.length > MAX_SHARE_TOKEN_LENGTH || !/^[A-Za-z0-9_-]+$/.test(token) || token.length % 4 === 1) throw Error(INVALID_LINK);
  let payload;
  try {
    const padded = token.replaceAll('-', '+').replaceAll('_', '/') + '='.repeat((4 - token.length % 4) % 4);
    const bytes = Uint8Array.from(atob(padded), char => char.charCodeAt(0));
    // Reject alternate encodings of the same bytes and invalid UTF-8.
    if (base64url(bytes) !== token) throw Error(INVALID_LINK);
    payload = JSON.parse(new TextDecoder('utf-8', { fatal: true }).decode(bytes));
  } catch { throw Error(INVALID_LINK); }
  if (!Array.isArray(payload)) throw Error(INVALID_LINK);
  const keys=payload[0]===1?SHARE_KEYS_V1:payload[0]===SHARE_VERSION?SHARE_KEYS:null;
  if (!keys || payload.length !== keys.length + 1) throw Error(INVALID_LINK);
  const safe = {...(payload[0]===1?V1_OWNED_DEFAULTS:{}),...Object.fromEntries(keys.map((key, index) => [key, payload[index + 1]]))};
  return checkedSettings(safe);
}

/** Snapshot every calculation parameter into a self-contained URL fragment. */
export function buildShareUrl(settings, { baseUrl = globalThis.location?.href, view = 'calculator' } = {}) {
  if (!VIEWS.has(view)) throw Error(INVALID_LINK);
  const safe = checkedSettings(settings);
  const url = urlFrom(baseUrl);
  url.search = '';
  url.hash = `${view}?calc=${encode(safe)}`;
  return url.href;
}

/** Null means an ordinary navigation URL; malformed shared links throw Error. */
export function readSharedScenario(value) {
  const url = urlFrom(value);
  const hash = url.hash.slice(1);
  const separator = hash.indexOf('?');
  if (separator < 0) return null;
  const view = hash.slice(0, separator);
  const params = new URLSearchParams(hash.slice(separator + 1));
  if (!params.has('calc')) return null;
  if (!VIEWS.has(view) || params.getAll('calc').length !== 1 || [...params.keys()].some(key => key !== 'calc')) throw Error(INVALID_LINK);
  return { settings: decode(params.get('calc')), view };
}
