import { notifications } from '../db/schema.js';
import type { Db } from '../db/client.js';

/** Inserts an unread notification. Safe to call inside a transaction (pass the tx as `db`). */
export function notify(db: Db, userId: number, type: string, text: string, link?: string, now: Date = new Date()): void {
  db.insert(notifications).values({ userId, type, text, link: link ?? null, createdAt: now }).run();
}
