import { test, expect, type Browser, type Page } from '@playwright/test';
import { ADMIN } from './constants';

const PASSWORD = 'kata-laluan-ujian';
const stamp = Date.now();

/** A fresh, isolated browser context (own cookies) that records CSP violations and uncaught page errors. */
async function newUser(browser: Browser, baseURL: string, problems: string[]) {
  const context = await browser.newContext({ baseURL });
  const page = await context.newPage();
  page.on('console', (m) => {
    if (m.type() === 'error' && m.text().includes('Content Security Policy')) problems.push(m.text());
  });
  page.on('pageerror', (e) => problems.push(`pageerror: ${e.message}`));
  return { context, page };
}

async function signup(page: Page, url: string, name: string, email: string) {
  await page.goto(url);
  await page.getByLabel('Nama Penuh').fill(name);
  await page.getByLabel('Emel', { exact: true }).fill(email);
  await page.getByLabel('Sahkan Emel').fill(email);
  await page.getByLabel('Kata Laluan', { exact: true }).fill(PASSWORD);
  await page.getByLabel('Sahkan Kata Laluan').fill(PASSWORD);
  await page.locator('#daftarSubmit').click();
}

test('admin → usrah → naqib → member logs a full day → naqib sees 100% Level A', async ({ browser }, testInfo) => {
  const baseURL = testInfo.project.use.baseURL!;
  const problems: string[] = [];
  const naqibEmail = `naqib-${stamp}@e2e.test`;
  const memberEmail = `ahli-${stamp}@e2e.test`;

  // 1. Admin logs in and creates the usrah, then generates the naqib invite link.
  const admin = await newUser(browser, baseURL, problems);
  await admin.page.goto('/');
  await admin.page.locator('#emailInput').fill(ADMIN.email);
  await admin.page.locator('#passwordInput').fill(ADMIN.password);
  await admin.page.locator('#submitBtn').click();
  await expect(admin.page).toHaveURL(/#admin/);
  await admin.page.locator('#usrahName').fill('Usrah Ujian');
  await admin.page.locator('#createUsrahBtn').click();
  const row = admin.page.locator('[data-usrah-row]', { hasText: 'Usrah Ujian' });
  await expect(row).toBeVisible();
  await row.locator('[data-invite]').click();
  const link = await admin.page.locator('[data-invite-link]').inputValue();
  expect(link).toContain('#daftar?jemputan=');
  const naqibHash = link.slice(link.indexOf('#'));

  // 2. Naqib signs up through the invite link and reads the member invite code on Ringkasan.
  const naqib = await newUser(browser, baseURL, problems);
  await signup(naqib.page, `/${naqibHash}`, 'Naqib Ujian', naqibEmail);
  await expect(naqib.page).toHaveURL(/#ringkasan/);
  const code = (await naqib.page.locator('code', { hasText: /^[A-Z0-9]+-\d+$/ }).first().innerText()).trim();
  expect(code).toMatch(/^[A-Z0-9]+-[A-Z0-9]+$/);

  // 3. Member signs up with the code and ticks every daily item on Hari Ini.
  const member = await newUser(browser, baseURL, problems);
  await signup(member.page, `/#daftar?kod=${code}`, 'Ahli Ujian', memberEmail);
  await expect(member.page).toHaveURL(/#hari-ini/);
  const daily = member.page.locator('#seksyen-harian');
  await expect(daily).toBeVisible();

  // Check-type items and the five prayers.
  for (const sel of ['[data-action="toggle-task"]', '[data-action="toggle-prayer"]']) {
    const off = daily.locator(`${sel}[aria-pressed="false"]`);
    for (let n = await off.count(); n > 0; n = await off.count()) {
      await off.first().click();
      await expect(off).toHaveCount(n - 1);
    }
  }
  // Count-type items: press "+" until the card reports its target met ("Tercapai").
  const counters = daily.locator('[data-card-for]', { has: member.page.locator('[data-action="stepper"]') });
  const nCounters = await counters.count();
  for (let i = 0; i < nCounters; i++) {
    const card = counters.nth(i);
    const text = (await card.innerText()).match(/\/\s*(\d+)\s/);
    const target = Number(text?.[1] ?? 1);
    // one in-page burst instead of ~100 round-trips; each click goes through the real handler
    const key = await card.getAttribute('data-card-for');
    await member.page.evaluate(
      ([id, n]) => {
        for (let k = 0; k < Number(n); k++)
          document.querySelector<HTMLElement>(`[data-action="stepper"][data-key="${id}"][data-delta="1"]`)?.click();
      },
      [key, target],
    );
    await expect(card).toContainText('Tercapai');
  }
  await expect(daily.locator('[data-action="toggle-task"][aria-pressed="false"]')).toHaveCount(0);
  await expect(member.page.locator('#save-pill')).toContainText('Disimpan', { timeout: 15_000 });

  // 4. Naqib reloads Ringkasan: the member's roster card shows 100% and Level A.
  await naqib.page.reload();
  const card = naqib.page.locator('[data-member-id]', { hasText: 'Ahli Ujian' });
  await expect(card).toBeVisible();
  await expect(card).toContainText('100%');
  await expect(card.locator('[data-level]')).toHaveText('Level A');

  expect(problems, `console problems:\n${problems.join('\n')}`).toEqual([]);
  await Promise.all([admin, naqib, member].map((u) => u.context.close()));
});
