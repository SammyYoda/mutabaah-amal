import { vi } from 'vitest';

vi.mock('../api.js', async (importOriginal) => {
  const orig = await importOriginal();
  return { ...orig, getGuidance: vi.fn(), getSummary: vi.fn(), sendGuidance: vi.fn(), replyGuidance: vi.fn(), markGuidanceRead: vi.fn() };
});

import { getGuidance, getSummary, sendGuidance, replyGuidance, markGuidanceRead } from '../api.js';
import { bimbinganRoute } from './bimbingan.js';
import { setSession, clearSession } from '../session.js';

const item = (o) => ({ id: 1, category: 'peribadi', title: 'Tajuk', body: 'Isi', reference: null, toUserId: 2, toName: 'Faiz', fromName: 'Ustaz', createdAt: '2026-10-08T01:00:00.000Z', read: false, replies: [], ...o });
const ITEMS = [
  item({ id: 3, category: 'tilawah', title: 'Umum', toUserId: null, toName: null, read: true, replies: [{ id: 1, userName: 'Faiz', body: 'Baik', createdAt: '2026-10-08T02:00:00.000Z' }] }),
  item({ id: 2, category: 'riadah', title: 'Jogging', read: true }),
  item({ id: 1, category: 'peribadi', title: 'Nota', body: 'Baris 1\nBaris 2', reference: 'Al-Baqarah 2:45', read: false }),
];
const ROSTER = [{ id: 2, name: 'Faiz', initials: 'F', percentage4w: 80, level: 'A', lastLogDate: null }, { id: 4, name: 'Aisyah', initials: 'A', percentage4w: 50, level: 'C', lastLogDate: null }];
const flush = () => new Promise((r) => setTimeout(r, 0));
const $ = (s) => document.querySelector(s);
const $$ = (s) => [...document.querySelectorAll(s)];

const me = (role) => setSession({ user: { id: role === 'naqib' ? 1 : 2, name: 'Pengguna', email: 'a@b.my', phone: null, isAdmin: false, mustChangePassword: false }, usrah: { id: 1, name: 'U', naqibName: 'Naqib Ujian' }, role });
async function mount() {
  const data = await bimbinganRoute.load(new URLSearchParams());
  document.body.innerHTML = `<main id="app-main">${bimbinganRoute.render(data)}</main>`;
  bimbinganRoute.init(data);
  return data;
}

beforeEach(() => {
  vi.clearAllMocks();
  clearSession();
  me('member');
  window.showToast = vi.fn();
  window.router = { renderCurrent: vi.fn(), refreshNotifications: vi.fn() };
  getGuidance.mockResolvedValue(ITEMS.map((i) => ({ ...i, replies: [...i.replies] })));
  getSummary.mockResolvedValue({ roster: ROSTER });
  markGuidanceRead.mockResolvedValue(null);
  $$('.filter-tab-btn').forEach(() => {});
});

describe('Bimbingan view (member)', () => {
  it('renders items, hides the send form, does not fetch the summary', async () => {
    await mount();
    expect(bimbinganRoute.roles).toEqual(['member', 'naqib']);
    expect($$('article').map((a) => a.dataset.id)).toEqual(['3', '2', '1']);
    expect($('#formSendGuidance')).toBeNull();
    expect(getSummary).not.toHaveBeenCalled();
  });

  it('category tabs filter client-side without refetching', async () => {
    await mount();
    $('[data-filter="riadah"]').click();
    expect($$('article').map((a) => a.dataset.id)).toEqual(['2']);
    $('[data-filter="semua"]').click();
    expect($$('article')).toHaveLength(3);
    expect(getGuidance).toHaveBeenCalledTimes(1);
  });

  it('expanding an unread item marks it read exactly once', async () => {
    await mount();
    const toggle = $('[data-action="toggle"][data-id="1"]');
    toggle.click();
    await flush();
    toggle.click();
    toggle.click();
    await flush();
    expect(markGuidanceRead).toHaveBeenCalledTimes(1);
    expect(markGuidanceRead).toHaveBeenCalledWith(1);
    // already-read item is never marked
    $('[data-action="toggle"][data-id="2"]').click();
    await flush();
    expect(markGuidanceRead).toHaveBeenCalledTimes(1);
  });

  it('labels group threads "Perbincangan usrah" and personal ones "Maklum Balas Ahli"', async () => {
    getGuidance.mockResolvedValue([
      ...ITEMS.slice(0, 1),
      item({ id: 7, read: true, replies: [{ id: 5, userName: 'Faiz', body: 'x', createdAt: '2026-10-08T02:00:00.000Z' }] }),
    ]);
    await mount();
    expect($('article[data-id="3"]').textContent).toContain('Perbincangan usrah');
    expect($('article[data-id="3"]').textContent).not.toContain('Maklum Balas Ahli');
    expect($('article[data-id="7"]').textContent).toContain('Maklum Balas Ahli');
  });

  it('replying calls replyGuidance then reloads; empty reply is refused', async () => {
    await mount();
    $('.btn-send-reply[data-id="2"]').click();
    expect(replyGuidance).not.toHaveBeenCalled();
    $('#reply-text-2').value = ' Terima kasih ';
    replyGuidance.mockResolvedValue({});
    $('.btn-send-reply[data-id="2"]').click();
    await flush();
    expect(replyGuidance).toHaveBeenCalledWith(2, 'Terima kasih');
    expect(window.router.renderCurrent).toHaveBeenCalledTimes(1);
  });

  it('shows the API message when a reply fails', async () => {
    await mount();
    $('#reply-text-2').value = 'x';
    replyGuidance.mockRejectedValue(Object.assign(new Error('Gagal'), { message: 'Tidak ditemui' }));
    $('.btn-send-reply[data-id="2"]').click();
    await flush();
    expect($('#reply-error-2').textContent).toBe('Tidak ditemui');
    expect(window.router.renderCurrent).not.toHaveBeenCalled();
  });

  it('shows the empty state', async () => {
    getGuidance.mockResolvedValue([]);
    await mount();
    expect(document.body.textContent).toContain('Tiada bimbingan lagi.');
  });

  it('escapes hostile strings and turns newlines into <br> after escaping', async () => {
    const evil = '<img src=x onerror=alert(1)>';
    getGuidance.mockResolvedValue([
      item({ id: 1, category: evil, title: evil, body: `${evil}\nbaris dua`, reference: evil, fromName: evil, toName: evil, read: true,
        replies: [{ id: 1, userName: evil, body: `${evil}\nx`, createdAt: 'bukan-tarikh' }] }),
    ]);
    setSession({ user: { id: 2, name: evil, email: 'a@b.my', phone: null, isAdmin: false, mustChangePassword: false }, usrah: { id: 1, name: evil, naqibName: evil }, role: 'member' });
    await mount();
    expect(document.querySelector('img')).toBeNull();
    expect($('article p').innerHTML).toBe('&lt;img src=x onerror=alert(1)&gt;<br>baris dua');
  });
});

describe('Bimbingan view (naqib)', () => {
  beforeEach(() => me('naqib'));

  it('shows the send form with whole usrah + roster options', async () => {
    await mount();
    expect(getSummary).toHaveBeenCalled();
    expect($$('#gTo option').map((o) => [o.value, o.textContent])).toEqual([['', 'Seluruh usrah'], ['2', 'Faiz'], ['4', 'Aisyah']]);
  });

  it('sends to the whole usrah (toUserId null, no reference) and to a member with a reference', async () => {
    await mount();
    sendGuidance.mockResolvedValue({});
    $('#gTitle').value = ' Tajuk ';
    $('#gBody').value = ' Isi\nmesej ';
    $('#gCategory').value = 'qiamullail';
    $('#formSendGuidance').dispatchEvent(new Event('submit', { cancelable: true }));
    await flush();
    expect(sendGuidance).toHaveBeenLastCalledWith({ toUserId: null, category: 'qiamullail', title: 'Tajuk', body: 'Isi\nmesej' });
    $('#gTo').value = '4';
    $('#gReference').value = 'HR Muslim';
    $('#formSendGuidance').dispatchEvent(new Event('submit', { cancelable: true }));
    await flush();
    expect(sendGuidance).toHaveBeenLastCalledWith({ toUserId: 4, category: 'qiamullail', title: 'Tajuk', body: 'Isi\nmesej', reference: 'HR Muslim' });
    expect(window.router.renderCurrent).toHaveBeenCalled();
  });

  it('refuses an empty title/body without calling the API', async () => {
    await mount();
    $('#formSendGuidance').dispatchEvent(new Event('submit', { cancelable: true }));
    await flush();
    expect(sendGuidance).not.toHaveBeenCalled();
    expect($('[data-field-error="title"]').textContent).not.toBe('');
  });

  it('escapes roster names', async () => {
    getSummary.mockResolvedValue({ roster: [{ ...ROSTER[0], name: '"><img src=x>' }] });
    await mount();
    expect(document.querySelector('img')).toBeNull();
    expect($('#gTo option:nth-child(2)').textContent).toBe('"><img src=x>');
  });
});
