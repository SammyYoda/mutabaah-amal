import { parseTrustProxy } from '../src/config.js';

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
