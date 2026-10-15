/**
 * Runtime branding: app name and (optional) organisation name served by GET /api/config.
 * Defaults apply until loadBranding() succeeds, and stay if it fails.
 */

import { getConfig } from './api.js';

const DEFAULT_APP_NAME = "Mutaba'ah Amal";
/** The literal used in every route title; brandTitle() swaps it for the configured name. */
const TITLE_TOKEN = "Mutaba'ah Amal";

let branding = { appName: DEFAULT_APP_NAME, orgName: null };

export function getBranding() {
  return { ...branding };
}

/** Restores defaults (for tests). */
export function resetBranding() {
  branding = { appName: DEFAULT_APP_NAME, orgName: null };
}

/** Fetches /api/config; on any error keeps the current values. Never throws. */
export async function loadBranding() {
  try {
    const cfg = await getConfig();
    const appName = typeof cfg?.appName === 'string' && cfg.appName.trim() ? cfg.appName : DEFAULT_APP_NAME;
    const orgName = typeof cfg?.orgName === 'string' && cfg.orgName.trim() ? cfg.orgName : null;
    branding = { appName, orgName };
  } catch {
    /* keep defaults */
  }
}

export function brandTitle(title) {
  return String(title).split(TITLE_TOKEN).join(branding.appName);
}
