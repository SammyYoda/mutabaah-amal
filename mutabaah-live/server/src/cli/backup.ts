import { mkdirSync, readdirSync, rmSync, existsSync } from 'node:fs';
import { dirname, join } from 'node:path';
import Database from 'better-sqlite3';

const KEEP = 14;

/** YYYYMMDD-HHmm in Asia/Kuala_Lumpur. */
export function klStamp(d: Date): string {
  const p = Object.fromEntries(
    new Intl.DateTimeFormat('en-GB', {
      timeZone: 'Asia/Kuala_Lumpur',
      year: 'numeric', month: '2-digit', day: '2-digit',
      hour: '2-digit', minute: '2-digit', hourCycle: 'h23',
    })
      .formatToParts(d)
      .map((x) => [x.type, x.value]),
  );
  return `${p.year}${p.month}${p.day}-${p.hour}${p.minute}`;
}

export function dbPathFromUrl(url: string): string {
  return url.startsWith('file:') ? url.slice('file:'.length) : url;
}

async function main() {
  const src = dbPathFromUrl(process.env.DATABASE_URL ?? 'file:./data/mutabaah.db');
  if (!existsSync(src)) throw new Error(`Pangkalan data tidak dijumpai: ${src}`);
  const dir = join(dirname(src), 'backups');
  mkdirSync(dir, { recursive: true });
  const dest = join(dir, `mutabaah-${klStamp(new Date())}.db`);
  const db = new Database(src, { readonly: true, fileMustExist: true });
  try {
    await db.backup(dest);
  } finally {
    db.close();
  }
  const old = readdirSync(dir)
    .filter((f) => /^mutabaah-\d{8}-\d{4}\.db$/.test(f))
    .sort()
    .reverse()
    .slice(KEEP);
  for (const f of old) rmSync(join(dir, f));
  console.log(`Sandaran dicipta: ${dest}${old.length ? ` (${old.length} lama dipadam)` : ''}`);
}

main().catch((err) => {
  console.error(`Gagal: ${(err as Error).message}`);
  process.exit(1);
});
