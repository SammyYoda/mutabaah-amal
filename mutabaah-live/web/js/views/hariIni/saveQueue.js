/**
 * Debounced, serial save queue for one day's log (Hari Ini).
 *
 * - `set(key, value)` records a changed amalan value and (re)starts the debounce timer.
 * - `setNotes(text)` records changed notes (no timer; the caller flushes on blur).
 * - `flush()` sends everything pending in ONE `save({ values?, notes? })` call (changed keys only),
 *   after any save already in flight. Resolves true, or rejects with the save error — in which case
 *   the unsent keys are put back (newer edits win) so a retry sends them again.
 * - `close()` drops everything and ignores further changes (page left or log locked).
 *
 * onState('saving' | 'saved' | 'error', payload) reports progress (payload: saved log or error).
 */

/**
 * @param {{ save: (body: { values?: Record<string, unknown>, notes?: string }) => Promise<any>,
 *           delay?: number, onState?: (kind: 'saving'|'saved'|'error', payload?: any) => void }} opts
 */
export function createSaveQueue({ save, delay = 800, onState = () => {} }) {
  /** @type {Record<string, unknown>} */
  let values = {};
  /** @type {string | undefined} */
  let notes;
  let hasNotes = false;
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

  /** @returns {Promise<boolean>} */
  function flush() {
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
      /** @type {{ values?: Record<string, unknown>, notes?: string }} */
      const body = {};
      if (Object.keys(sentValues).length) body.values = sentValues;
      if (sentHasNotes) body.notes = sentNotes;
      onState('saving');
      try {
        const res = await save(body);
        onState('saved', res);
        return true;
      } catch (err) {
        if (!closed) {
          values = { ...sentValues, ...values }; // edits made meanwhile are newer
          if (sentHasNotes && !hasNotes) {
            notes = sentNotes;
            hasNotes = true;
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
    /** true while anything is pending, scheduled or in flight */
    busy: () => hasPending() || inflight > 0,
  };
}
