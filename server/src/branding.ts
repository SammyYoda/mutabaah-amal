export type Branding = { appName: string; orgName: string | null };

export const DEFAULT_BRANDING: Branding = { appName: "Mutaba'ah Amal", orgName: null };

const MAX_LEN = 80;

function clean(name: string, raw: string | undefined): string | null {
  const v = (raw ?? '').trim();
  if (v === '') return null;
  if (v.length > MAX_LEN) throw new Error(`${name} terlalu panjang (maksimum ${MAX_LEN} aksara).`);
  if (/[\r\n]/.test(v)) throw new Error(`${name} tidak boleh mengandungi baris baharu.`);
  return v;
}

export function parseBranding(env: { APP_NAME?: string; ORG_NAME?: string }): Branding {
  return {
    appName: clean('APP_NAME', env.APP_NAME) ?? DEFAULT_BRANDING.appName,
    orgName: clean('ORG_NAME', env.ORG_NAME),
  };
}

const ESCAPES: Record<string, string> = { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' };
const escapeHtml = (s: string) => s.replace(/[&<>"']/g, (c) => ESCAPES[c]);

export function renderIndexHtml(template: string, b: Branding): string {
  const app = escapeHtml(b.appName);
  const org = escapeHtml(b.orgName ?? '');
  return template.replace(/\{\{APP_NAME\}\}/g, () => app).replace(/\{\{ORG_NAME\}\}/g, () => org);
}
