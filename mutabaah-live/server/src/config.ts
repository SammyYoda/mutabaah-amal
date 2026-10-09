import { isIP } from 'node:net';

/** What buildApp accepts for `trustProxy`: off, a hop count, or a list of trusted proxy IPs/CIDRs. */
export type TrustProxySetting = false | number | string[];

const TRUE_WARNING =
  'TRUST_PROXY=true ditafsir sebagai 1 hop proxy (bukan "percaya semua"). Tetapkan bilangan hop (cth. 1) atau senarai IP/CIDR proxy secara jelas.';

function isIpOrCidr(entry: string): boolean {
  const [ip, bits, ...rest] = entry.split('/');
  if (rest.length > 0) return false;
  const family = isIP(ip);
  if (family === 0) return false;
  if (bits === undefined) return true;
  if (!/^\d{1,3}$/.test(bits)) return false;
  return Number(bits) <= (family === 4 ? 32 : 128);
}

/**
 * Parses the TRUST_PROXY env var (Ruling R30).
 * - unset / "" / "0" / "false" → off
 * - "1", "2", … → that many proxy hops in front of the app
 * - "true" → treated as 1 hop, with a startup warning (trusting every hop lets clients spoof their IP)
 * - "10.0.0.1, 10.1.0.0/16" → only those proxies are trusted
 * Anything else throws, so a typo fails at startup instead of silently trusting the wrong thing.
 */
export function parseTrustProxy(raw: string | undefined): { trustProxy: TrustProxySetting; warning?: string } {
  const v = (raw ?? '').trim();
  const lower = v.toLowerCase();
  if (lower === '' || lower === '0' || lower === 'false') return { trustProxy: false };
  if (lower === 'true') return { trustProxy: 1, warning: TRUE_WARNING };
  if (/^\d+$/.test(v)) return { trustProxy: Number(v) };
  const list = v.split(',').map((s) => s.trim()).filter(Boolean);
  if (list.length > 0 && list.every(isIpOrCidr)) return { trustProxy: list };
  throw new Error(`TRUST_PROXY tidak sah: "${raw}". Gunakan 0/false, bilangan hop (cth. 1) atau senarai IP/CIDR proxy.`);
}

/**
 * Turns the setting into Fastify's `trustProxy` option. A hop count becomes a trust function
 * (`i < hops`, the Express semantic) because Fastify 5.12+ deliberately ignores X-Forwarded-For
 * entirely for a numeric value.
 */
export function fastifyTrustProxy(tp: TrustProxySetting | undefined): false | string[] | ((addr: string, i: number) => boolean) {
  if (tp === undefined || tp === false || tp === 0) return false;
  if (typeof tp === 'number') return (_addr: string, i: number) => i < tp;
  return tp;
}
