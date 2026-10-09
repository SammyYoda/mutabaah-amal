import { createInterface } from 'node:readline';
import { realpathSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { eq } from 'drizzle-orm';
import { z } from 'zod';
import { openDb, migrateDb, closeDb, type Db } from '../db/client.js';
import { users } from '../db/schema.js';
import { hashPassword } from '../auth/password.js';

const AdminInput = z.object({
  name: z.string().trim().min(1, 'Nama wajib diisi'),
  email: z.string().trim().toLowerCase().pipe(z.email('Emel tidak sah')),
  password: z.string().min(8, 'Kata laluan sekurang-kurangnya 8 aksara'),
});

/** Inserts an admin user (isAdmin=true). Email is normalised. Throws on invalid input or duplicate email. */
export async function createAdmin(db: Db, input: { name: string; email: string; password: string }): Promise<number> {
  const parsed = AdminInput.safeParse(input);
  if (!parsed.success) throw new Error(parsed.error.issues.map((i) => i.message).join('; '));
  const { name, email, password } = parsed.data;
  if (db.select({ id: users.id }).from(users).where(eq(users.email, email)).get()) {
    throw new Error('Emel sudah didaftarkan');
  }
  return db
    .insert(users)
    .values({
      name,
      email,
      passwordHash: await hashPassword(password),
      isAdmin: true,
      mustChangePassword: false,
      createdAt: new Date(),
    })
    .returning()
    .get().id;
}

async function main() {
  const db = openDb(process.env.DATABASE_URL ?? 'file:./data/mutabaah.db');
  migrateDb(db);
  const rl = createInterface({ input: process.stdin, terminal: false });
  // A buffered line iterator (rather than rl.question) so piped input isn't lost between prompts.
  const lines = rl[Symbol.asyncIterator]();
  const ask = async (prompt: string) => {
    process.stdout.write(prompt);
    const next = await lines.next();
    if (next.done) throw new Error('Input tamat sebelum semua maklumat diberi');
    return next.value as string;
  };
  try {
    const name = await ask('Nama: ');
    const email = await ask('Emel: ');
    const password = await ask('Kata laluan (min 8 aksara): ');
    const id = await createAdmin(db, { name, email, password });
    console.log(`Admin dicipta (id ${id}).`);
  } catch (err) {
    console.error(`Gagal: ${(err as Error).message}`);
    process.exitCode = 1;
  } finally {
    rl.close();
    closeDb(db);
  }
}

// Only prompt when executed directly (e.g. `npm run create-admin`), never on import.
const isMain = (() => {
  try {
    return !!process.argv[1] && realpathSync(process.argv[1]) === realpathSync(fileURLToPath(import.meta.url));
  } catch {
    return false;
  }
})();
if (isMain) await main();
