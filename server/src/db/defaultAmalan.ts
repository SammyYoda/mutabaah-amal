import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { z } from 'zod';
import type { NewAmalan } from './client.js';

export type DefaultAmalan = Omit<NewAmalan, 'id' | 'usrahId' | 'createdOn'>;

/** Neutral starter set used when AMALAN_FILE is not configured. */
export const STARTER_AMALAN: DefaultAmalan[] = [
  { code: '01', name: "Tilawah Al-Quran", description: "Bacaan Al-Quran harian", freq: 'harian', inputType: 'count', targetVal: 5, unit: "muka surat / hari", icon: 'menu_book', active: true, sort: 0 },
  { code: '02', name: "Solat Fardhu Berjamaah", description: "Sasaran 5 waktu sehari", freq: 'harian', inputType: 'prayers', targetVal: 5, unit: "waktu", icon: 'mosque', active: true, sort: 1 },
  { code: '03', name: "Beristighfar", description: "Sasaran 70 kali sehari", freq: 'harian', inputType: 'count', targetVal: 70, unit: "kali / hari", icon: 'counter_3', active: true, sort: 2 },
  { code: '04', name: "Solat Dhuha", description: "Minimum 2 rakaat", freq: 'harian', inputType: 'check', targetVal: 2, unit: "rakaat / hari", icon: 'light_mode', active: true, sort: 3 },
  { code: '05', name: "Qiamullail", description: "Sasaran 1 kali seminggu", freq: 'mingguan', inputType: 'check', targetVal: 1, unit: "kali / minggu", icon: 'bedtime', active: true, sort: 4 },
  { code: '06', name: "Berpuasa Sunat", description: "Sasaran 1 hari sebulan", freq: 'bulanan', inputType: 'check', targetVal: 1, unit: "hari / bulan", icon: 'restaurant', active: true, sort: 5 },
];

const itemSchema = z.object({
  code: z.string().nullable().optional(),
  name: z.string().min(1),
  description: z.string().nullable().optional(),
  freq: z.enum(['harian', 'mingguan', 'bulanan']),
  inputType: z.enum(['count', 'check', 'prayers']),
  targetVal: z.number().int().positive(),
  unit: z.string().nullable().optional(),
  icon: z.string().min(1).default('check_circle'),
  active: z.boolean().default(true),
  sort: z.number().int(),
});

/** Loads default amalan from a JSON file (relative paths resolve from cwd); no path gives the starter set. */
export function loadDefaultAmalan(path?: string): DefaultAmalan[] {
  if (path === undefined) return STARTER_AMALAN;
  const abs = resolve(process.cwd(), path);
  const fail = (msg: string): never => {
    throw new Error(`AMALAN_FILE ${abs}: ${msg}`);
  };
  let raw: string;
  try {
    raw = readFileSync(abs, 'utf8');
  } catch (e) {
    return fail((e as Error).message);
  }
  let json: unknown;
  try {
    json = JSON.parse(raw);
  } catch (e) {
    return fail(`invalid JSON (${(e as Error).message})`);
  }
  const parsed = z.array(itemSchema).min(1, 'must be a non-empty array').safeParse(json);
  if (!parsed.success) {
    const i = parsed.error.issues[0];
    return fail(`${i.path.join('.') || '(root)'}: ${i.message}`);
  }
  const list = parsed.data;
  const sorts = new Set<number>();
  const codes = new Set<string>();
  for (const a of list) {
    if (sorts.has(a.sort)) fail(`duplicate sort ${a.sort}`);
    sorts.add(a.sort);
    if (a.code != null) {
      if (codes.has(a.code)) fail(`duplicate code ${a.code}`);
      codes.add(a.code);
    }
  }
  return list;
}
