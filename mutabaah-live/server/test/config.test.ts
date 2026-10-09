import { parseTrustProxy, productionWarnings } from '../src/config.js';

describe('parseTrustProxy (TRUST_PROXY env)', () => {
  it.each([undefined, '', '0', 'false', 'FALSE', ' false '])('%j -> off', (raw) => {
    expect(parseTrustProxy(raw)).toEqual({ trustProxy: false });
  });

  it.each([
    ['1', 1],
    ['2', 2],
    [' 3 ', 3],
  ])('hop count %j -> %d', (raw, n) => {
    expect(parseTrustProxy(raw)).toEqual({ trustProxy: n });
  });

  it('"true" is treated as one hop, with a startup warning', () => {
    const r = parseTrustProxy('true');
    expect(r.trustProxy).toBe(1);
    expect(r.warning).toContain('TRUST_PROXY=true ditafsir sebagai 1 hop proxy');
    expect(parseTrustProxy('TRUE').trustProxy).toBe(1);
  });

  it('a comma-separated list of IPs / CIDRs is passed through as a list', () => {
    expect(parseTrustProxy('127.0.0.1, 10.0.0.0/8,::1')).toEqual({ trustProxy: ['127.0.0.1', '10.0.0.0/8', '::1'] });
    expect(parseTrustProxy('192.168.1.10')).toEqual({ trustProxy: ['192.168.1.10'] });
  });

  it.each(['yes', '-1', '1.5', '10.0.0.0/99', 'not-an-ip,127.0.0.1', 'loopback'])('rejects %j', (raw) => {
    expect(() => parseTrustProxy(raw)).toThrow(/TRUST_PROXY/);
  });
});

describe('productionWarnings (APP_ORIGIN in production)', () => {
  it('warns when NODE_ENV=production and APP_ORIGIN is unset', () => {
    const w = productionWarnings({ NODE_ENV: 'production' });
    expect(w).toHaveLength(1);
    expect(w[0]).toMatch(/APP_ORIGIN/);
    expect(w[0]).toMatch(/403/);
  });

  it('warns when APP_ORIGIN is not https: in production', () => {
    expect(productionWarnings({ NODE_ENV: 'production', APP_ORIGIN: 'http://mutabaah.example.org' })[0]).toMatch(/https/);
  });

  it('is quiet for an https origin in production, and outside production', () => {
    expect(productionWarnings({ NODE_ENV: 'production', APP_ORIGIN: 'https://mutabaah.example.org' })).toEqual([]);
    expect(productionWarnings({ APP_ORIGIN: 'http://localhost:3000' })).toEqual([]);
    expect(productionWarnings({})).toEqual([]);
  });
});

describe('package.json (production install, R34)', () => {
  it('tsx is a runtime dependency, so npm start works after npm ci --omit=dev', async () => {
    const { readFileSync } = await import('node:fs');
    const pkg = JSON.parse(readFileSync(new URL('../../package.json', import.meta.url), 'utf8'));
    expect(pkg.dependencies.tsx).toBeDefined();
    expect(pkg.devDependencies.tsx).toBeUndefined();
    expect(pkg.scripts.start).toContain('tsx ');
  });
});
