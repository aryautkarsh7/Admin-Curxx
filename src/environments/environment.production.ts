/**
 * Production build (ng build). The same build runs on the live admin domain and on Vercel preview
 * deployments, so the API is chosen by hostname: only the live admin talks to the live API.
 * Previews (e.g. the doctar-import staging branch) use STAGING_API, and refuse to start against live data
 * while it is empty.
 */
const LIVE_ADMIN_HOST = 'admin-curxx.vercel.app';
const LIVE_API = 'https://crux-backend-production.up.railway.app/api/v1';
const LIVE_SITE = 'https://curxx-frontend.vercel.app';

/** Staging backend (Railway "staging" environment → curxx-dev), e.g. https://crux-backend-staging.up.railway.app/api/v1. */
const STAGING_API = '';
/** Staging website (the frontend's doctar-import preview). */
const STAGING_SITE = 'https://curxx-frontend-git-doctar-import-aaradhyaarya313-7090s-projects.vercel.app';

const live = typeof location === 'undefined' || location.hostname === LIVE_ADMIN_HOST;

export const environment = {
  production: true,
  // An unset staging API resolves to an address that never answers ("Can't reach the Curxx API"),
  // so a preview can never edit live data by accident.
  apiUrl: live ? LIVE_API : STAGING_API || 'https://staging-api-not-configured.invalid/api/v1',
  siteUrl: live ? LIVE_SITE : STAGING_SITE,
};
