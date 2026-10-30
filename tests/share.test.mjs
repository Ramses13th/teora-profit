import test from 'node:test';
import assert from 'node:assert/strict';
import { DEFAULTS, LIMITS, simulate, economics, batch } from '../model.js';
import { buildShareUrl, readSharedScenario, SHARE_KEYS, SHARE_KEYS_V1, SHARE_VERSION, MAX_SHARE_TOKEN_LENGTH } from '../share.js';

const BASE = 'https://ramses13th.github.io/teora-profit/';
const rawToken = value => Buffer.from(JSON.stringify(value), 'utf8').toString('base64url');
const payload = settings => [SHARE_VERSION, ...SHARE_KEYS.map(key => settings[key])];
const link = token => `${BASE}#calculator?calc=${token}`;

test('all version 2 defaults round-trip without depending on omitted defaults', () => {
  assert.equal(SHARE_VERSION, 2);
  assert.equal(SHARE_KEYS.length, 30);
  assert.equal(SHARE_KEYS_V1.length, 26);
  assert.deepEqual(SHARE_KEYS.slice().sort(), Object.keys(DEFAULTS).sort());
  const url = buildShareUrl(DEFAULTS, { baseUrl: BASE });
  assert.deepEqual(readSharedScenario(url), { settings: { ...DEFAULTS }, view: 'calculator' });
  assert.ok(url.length < 500);
  assert.equal(new URL(url).search, '');
  assert.ok(new URL(url).hash.startsWith('#calculator?calc='));
});

test('old version 1 snapshots remain readable and use frozen buy-now defaults', () => {
  // Literal pre-owned-stock wire data, independent of today's key list/defaults.
  const oldPayload = [1,9,70,6.5,45,9,true,35,30,true,25,40,false,2,false,0,15,false,5,0,200,70,8,90,18,0,'demand'];
  const oldSettings = {packSize:9,packCost:70,lighterCost:6.5,salePrice:45,batchSize:9,chromeEnabled:true,chromePrice:35,chromeYield:30,lacquerEnabled:true,lacquerPrice:25,lacquerYield:40,packagingEnabled:false,packagingCost:2,shippingEnabled:false,shippingCost:0,purchaseShipping:15,feesEnabled:false,feePercent:5,feeFixed:0,capital:200,reinvest:70,cycles:8,capacity:90,demand:18,demandGrowth:0,productionMode:'demand',chromeOwned:false,chromeStock:30,lacquerOwned:false,lacquerStock:40};
  const read = readSharedScenario(link(rawToken(oldPayload)));
  assert.deepEqual(read.settings, oldSettings);
  assert.equal(batch(read.settings).total, 188.5);
  assert.deepEqual(simulate(read.settings), simulate(oldSettings));
  const upgraded = buildShareUrl(read.settings, {baseUrl: BASE});
  assert.equal(JSON.parse(Buffer.from(new URL(upgraded).hash.split('calc=')[1], 'base64url'))[0], 2);
  assert.deepEqual(readSharedScenario(upgraded).settings, oldSettings);
});

test('version 2 owned and partial-stock links reproduce cash, assets and simulation', () => {
  const settings = {...DEFAULTS,chromeEnabled:true,chromeOwned:true,chromeStock:13,lacquerEnabled:true,lacquerOwned:true,lacquerStock:47,capital:700,capacity:20,demand:17,demandGrowth:10,cycles:6};
  const restored = readSharedScenario(buildShareUrl(settings,{baseUrl:BASE,view:'scalare'}));
  assert.deepEqual(restored.settings, settings);
  assert.deepEqual(simulate(restored.settings), simulate(settings));
  assert.deepEqual(batch(restored.settings), batch(settings));
  const disabled = {...settings,chromeEnabled:false,chromeStock:1000000,lacquerOwned:false,lacquerStock:0};
  assert.deepEqual(readSharedScenario(buildShareUrl(disabled,{baseUrl:BASE})).settings, disabled);
});

test('wire versions cannot exchange old and new field counts', () => {
  const v2=payload(DEFAULTS),v1=[1,...SHARE_KEYS_V1.map(key=>DEFAULTS[key])];
  assert.throws(()=>readSharedScenario(link(rawToken([1,...v2.slice(1)]))),/Linkul/);
  assert.throws(()=>readSharedScenario(link(rawToken([2,...v1.slice(1)]))),/Linkul/);
});

test('all optional parameters and disabled values are kept exactly', () => {
  const settings = { ...DEFAULTS, packSize: 13, packCost: 91.125, lighterCost: 7.95, salePrice: 62.875, batchSize: 23, chromeEnabled: true, chromePrice: 44.37, chromeYield: 21, lacquerEnabled: false, lacquerPrice: 39.83, lacquerYield: 47, packagingEnabled: true, packagingCost: 4.25, shippingEnabled: true, shippingCost: 6.5, purchaseShipping: 22.45, feesEnabled: true, feePercent: 4.8, feeFixed: .37, capital: 1873.529, reinvest: 68.4, cycles: 17, capacity: 333, demand: 27, demandGrowth: -4.2, productionMode: 'capacity' };
  const restored = readSharedScenario(buildShareUrl(settings, { baseUrl: BASE, view: 'scalare' }));
  assert.equal(restored.view, 'scalare');
  assert.deepEqual(restored.settings, settings);
  assert.deepEqual(simulate(restored.settings), simulate(settings));
  assert.deepEqual(economics(restored.settings), economics(settings));
  assert.deepEqual(batch(restored.settings), batch(settings));
});

test('zero, false and numeric extremes survive links', () => {
  for (const boundary of [0, 1]) {
    const settings = { ...DEFAULTS };
    for (const [key, limits] of Object.entries(LIMITS)) settings[key] = limits[boundary];
    for (const key of ['chromeEnabled', 'lacquerEnabled', 'packagingEnabled', 'shippingEnabled', 'feesEnabled', 'chromeOwned', 'lacquerOwned']) settings[key] = !!boundary;
    assert.deepEqual(readSharedScenario(buildShareUrl(settings, { baseUrl: BASE })).settings, settings);
  }
});

test('sharing is deterministic regardless of object key insertion order', () => {
  const reversed = Object.fromEntries(Object.entries(DEFAULTS).reverse());
  assert.equal(buildShareUrl(reversed, { baseUrl: BASE }), buildShareUrl(DEFAULTS, { baseUrl: BASE }));
});

test('a new snapshot replaces old hash and query without leaking unrelated URL data', () => {
  const url = new URL(buildShareUrl(DEFAULTS, { baseUrl: `${BASE}?source=old#metoda?calc=old`, view: 'scalare' }));
  assert.equal(url.pathname, '/teora-profit/');
  assert.equal(url.search, '');
  assert.equal(readSharedScenario(url).view, 'scalare');
  assert.equal(url.hash.includes('old'), false);
});

test('ordinary route links have no shared scenario', () => {
  for (const suffix of ['', '#calculator', '#scalare', '#metoda', '#calculator?other=1', '?calc=ignored#calculator']) assert.equal(readSharedScenario(BASE + suffix), null);
});

test('rejects unsupported versions, counts, envelopes and nested values', () => {
  const valid = payload(DEFAULTS);
  const invalid = [
    [3, ...valid.slice(1)], ['2', ...valid.slice(1)], valid.slice(0, -1), [...valid, 0],
    { version: 1, settings: DEFAULTS }, null, {}, 'text', [1],
    [SHARE_VERSION, ...valid.slice(1, 3), { __proto__: null }, ...valid.slice(4)],
  ];
  for (const value of invalid) assert.throws(() => readSharedScenario(link(rawToken(value))), /Linkul/);
});

test('rejects invalid model values and types from shared payloads', () => {
  for (const edit of [{ packSize: 0 }, { capital: -1 }, { salePrice: '45' }, { chromeEnabled: 1 }, { capacity: 1.5 }, { productionMode: 'anything' }, { lacquerYield: 0 }, { reinvest: 101 }, {chromeOwned:1}, {chromeStock:-1}, {lacquerOwned:null}, {lacquerStock:1.5}, {chromeStock:1000001}]) {
    const malformed = { ...DEFAULTS, ...edit };
    assert.throws(() => readSharedScenario(link(rawToken(payload(malformed)))), /Linkul/);
  }
});

test('rejects malformed, padded and oversized base64url tokens', () => {
  for (const token of ['', 'a', '!bad!', '%%%%', 'abc=', 'ab+c', 'ab/c', 'A'.repeat(MAX_SHARE_TOKEN_LENGTH + 1), Buffer.from('{not-json').toString('base64url'), '_w']) assert.throws(() => readSharedScenario(link(token)), /Linkul/);
  const valid = rawToken(payload(DEFAULTS));
  assert.throws(() => readSharedScenario(link(valid + '=')), /Linkul/);
});

test('rejects non-canonical trailing bits even when decoded bytes would match', () => {
  let source = JSON.stringify(payload(DEFAULTS));
  while (Buffer.byteLength(source) % 3 === 0) source += ' ';
  const canonical = Buffer.from(source).toString('base64url');
  const alphabet = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789-_';
  const last = alphabet.indexOf(canonical.at(-1));
  const alternate = canonical.slice(0, -1) + alphabet[last + 1];
  assert.deepEqual(Buffer.from(alternate, 'base64url'), Buffer.from(canonical, 'base64url'));
  assert.deepEqual(readSharedScenario(link(canonical)).settings, DEFAULTS);
  assert.throws(() => readSharedScenario(link(alternate)), /Linkul/);
});

test('rejects duplicate parameters, unknown accompanying parameters and views', () => {
  const token = rawToken(payload(DEFAULTS));
  for (const suffix of [`#calculator?calc=${token}&calc=${token}`, `#calculator?calc=${token}&x=1`, `#metoda?calc=${token}`, `#other?calc=${token}`, `#?calc=${token}`, `#calculator?calc=${token}&__proto__=x`]) assert.throws(() => readSharedScenario(BASE + suffix), /Linkul/);
});

test('builder rejects incomplete, unknown, inherited and accessor settings', () => {
  const partial = { ...DEFAULTS }; delete partial.chromeYield;
  const dangerous = { ...DEFAULTS, ['__proto__']: { pollution: true } };
  const inherited = Object.assign(Object.create({ custom: true }), DEFAULTS);
  const getter = { ...DEFAULTS }; Object.defineProperty(getter, 'capital', { enumerable: true, get() { throw Error('getter must not run'); } });
  const symbol = { ...DEFAULTS, [Symbol('unknown')]: 1 };
  for (const settings of [null, [], partial, { ...DEFAULTS, unknown: 1 }, dangerous, inherited, getter, symbol, { ...DEFAULTS, capital: NaN }, { ...DEFAULTS, salePrice: Infinity }]) assert.throws(() => buildShareUrl(settings, { baseUrl: BASE }), /Linkul/);
  assert.equal({}.pollution, undefined);
});

test('rejects unsafe base URLs and unsupported target routes', () => {
  for (const baseUrl of ['not a url', 'javascript:alert(1)', 'data:text/plain,test', 'https://name:password@example.com/', 'https://example.com/' + 'x'.repeat(8200)]) assert.throws(() => buildShareUrl(DEFAULTS, { baseUrl }), /Linkul/);
  assert.throws(() => buildShareUrl(DEFAULTS, { baseUrl: BASE, view: 'metoda' }), /Linkul/);
  assert.throws(() => readSharedScenario('not a url'), /Linkul/);
  assert.throws(() => readSharedScenario('https://example.com/' + 'x'.repeat(8200)), /Linkul/);
});

test('allows local preview HTTP URLs and URL objects', () => {
  const url = buildShareUrl(DEFAULTS, { baseUrl: new URL('http://127.0.0.1:4173/#scalare'), view: 'calculator' });
  assert.deepEqual(readSharedScenario(new URL(url)).settings, DEFAULTS);
});

test('untrusted payload cannot insert HTML, properties or prototype data', () => {
  for (const value of ['<script>alert(1)</script>', { '__proto__': { dangerous: true } }, ['demand'], null]) {
    const altered = payload(DEFAULTS); altered[26] = value;
    assert.throws(() => readSharedScenario(link(rawToken(altered))), /Linkul/);
  }
  assert.equal({}.dangerous, undefined);
});
