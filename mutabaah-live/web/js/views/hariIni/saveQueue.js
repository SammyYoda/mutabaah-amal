/**
 * Debounced, serial save queue for one day's log (Hari Ini).
 *
 * - `set(key, value)` records a changed amalan value and (re)starts the debounce timer.
 * - `setNotes(text)` records changed notes (no timer; the caller flushes on blur).
 * - `flush(options?)` sends everything pending in ONE `save({ values?, notes? }, options?)` call
 *   (changed keys only), after any save already in flight. Resolves true, or rejects with the save error.
 *   On a retryable error (network, 5xx, anything but the two below) the unsent keys are put back
 *   (newer edits win) so a retry sends them again. A non-retryable error drops keys instead (R32):
 *   - 400 VALIDATION_ERROR: the keys the server names in `fields` (`values.<id>…`, `notes`) are dropped
 *     and the rest are put back and re-scheduled; without usable field names the whole batch is dropped.
 *   - 403 LOG_LOCKED: the whole batch is dropped.
 * - `snapshot()` returns everything not yet confirmed saved (pending + in flight), for persisting.
 * - `close()` drops everything and ignores further changes (page left or log locked).
 *
 * onState('saving' | 'saved' | 'error', payload) reports progress (payload: saved log or error).
 */

/** @param {any} err */
const isRetryable = (err) => !(err?.status === 400 || err?.code === 'LOG_LOCKED');

/**
 * The batch keys a 400 names: amalan ids from `values.<id>[.…]` and 'notes'. null = none identifiable.
 * @param {any} err
 * @returns {{ values: Set<string>, notes: boolean } | null}
 */
function offendingKeys(err) {
  const fields = err?.fields && typeof err.fields === 'object' ? Object.keys(err.fields) : [];
  const values = new Set();
  let notes = false;
  for (const f of fields) {
    const parts = f.split('.');
    if (parts[0] === 'values' && parts[1]) values.add(parts[1]);
    else if (parts[0] === 'notes') notes = true;
  }
  return values.size || notes ? { values, notes } : null;
}

/**
 * @param {{ save: (body: { values?: Record<string, unknown>, notes?: string }, options?: { keepalive?: boolean }) => Promise<any>,
 *           delay?: number, onState?: (kind: 'saving'|'saved'|'error', payload?: any) => void }} opts
 */
export function createSaveQueue({ save, delay = 800, onState = () => {} }) {
  /** @type {Record<string, unknown>} */
  let values = {};
  /** @type {string | undefined} */
  let notes;
  let hasNotes = false;
  /** the batch currently being sent (for snapshot) */
  /** @type {{ values: Record<string, unknown>, hasNotes: boolean, notes: string | undefined } | null} */
  let sending = null;
  /** @type {ReturnType<typeof setTimeout> | null} */
  let timer = null;
  /** @type {Promise<unknown>} */
  let chain = Promise.resolve();
  let inflight = 0;
  let closed = false;

  const hasPending = () => Object.keys(values).length > 0 || hasNotes;

  function clearTimer() {
    if (timer !== null) clearTimeout(timer);
    timer = null;
  }

  function schedule() {
    clearTimer();
    timer = setTimeout(() => {
      timer = null;
      flush().catch(() => {}); // the error is reported through onState
    }, delay);
  }

  /** @param {string} key @param {unknown} value */
  function set(key, value) {
    if (closed) return;
    values[key] = value;
    schedule();
  }

  /** @param {string} text */
  function setNotes(text) {
    if (closed) return;
    notes = text;
    hasNotes = true;
  }

  /** Puts a failed batch back (minus `skip`); edits made meanwhile are newer and win. */
  function putBack(sentValues, sentHasNotes, sentNotes, skip = { values: new Set(), notes: false }) {
    const keep = Object.fromEntries(Object.entries(sentValues).filter(([k]) => !skip.values.has(k)));
    values = { ...keep, ...values };
    if (sentHasNotes && !skip.notes && !hasNotes) {
      notes = sentNotes;
      hasNotes = true;
    }
  }

  /** @param {{ keepalive?: boolean }} [options] passed through to save() @returns {Promise<boolean>} */
  function flush(options) {
    clearTimer();
    inflight++;
    const run = chain.then(async () => {
      if (closed || !hasPending()) return true;
      const sentValues = values;
      const sentHasNotes = hasNotes;
      const sentNotes = notes;
      values = {};
      hasNotes = false;
      notes = undefined;
      sending = { values: sentValues, hasNotes: sentHasNotes, notes: sentNotes };
      /** @type {{ values?: Record<string, unknown>, notes?: string }} */
      const body = {};
      if (Object.keys(sentValues).length) body.values = sentValues;
      if (sentHasNotes) body.notes = sentNotes;
      onState('saving');
      try {
        const res = options ? await save(body, options) : await save(body);
        sending = null;
        onState('saved', res);
        return true;
      } catch (err) {
        sending = null;
        if (!closed) {
          if (isRetryable(err)) {
            putBack(sentValues, sentHasNotes, sentNotes);
          } else if (err?.status === 400) {
            const bad = offendingKeys(err);
            if (bad) {
              putBack(sentValues, sentHasNotes, sentNotes, bad);
              if (hasPending()) schedule();
            }
          }
        }
        onState('error', err);
        throw err;
      }
    });
    const settled = run.finally(() => inflight--);
    chain = settled.catch(() => {});
    return settled;
  }

  /** Everything not yet confirmed saved: the batch in flight plus newer pending edits. */
  function snapshot() {
    /** @type {{ values: Record<string, unknown>, notes?: string }} */
    const out = { values: { ...(sending?.values ?? {}), ...values } };
    if (hasNotes) out.notes = notes;
    else if (sending?.hasNotes) out.notes = sending.notes;
    return out;
  }

  function close() {
    closed = true;
    clearTimer();
    values = {};
    hasNotes = false;
    notes = undefined;
  }

  return {
    set,
    setNotes,
    flush,
    close,
    hasPending,
    snapshot,
    /** true while anything is pending, scheduled or in flight */
    busy: () => hasPending() || inflight > 0,
  };
}
