# Curxx Admin (Angular)

Admin panel for the Curxx website. Add and edit everything the site shows — doctors (with weekly
schedules that become bookable slots), hospitals & clinics (19 facility types), specialties, reviews,
labs, lab tests & scans, medicines, blog articles — and work through appointments, orders, leads
and patient accounts.

## Project commands

```bash
npm run format
npm run format:check
npm run lint
npm run test
```

## Run locally

```bash
# 1. API (from ../backend): set ADMIN_EMAIL and ADMIN_PASSWORD in backend/.env, then
npm --prefix ../backend run dev

# 2. Admin panel on http://localhost:4200
npm install
npm start
```

`src/environments/environment.ts` points at `http://localhost:4000/api/v1`; production builds
(`npm run build`) use `environment.production.ts` (the Railway API).

## Sign-in

There is one admin account, configured on the API server with two environment variables:

| Variable         | Example                                 |
| ---------------- | --------------------------------------- |
| `ADMIN_EMAIL`    | `ops@curxx.in`                          |
| `ADMIN_PASSWORD` | a long random password (10+ characters) |

Without them, admin sign-in is disabled (the API answers 503). Sessions last 12 hours.

## How edits reach the website

- Changes are written straight to MongoDB through `/api/v1/admin/*`, so the site shows them
  within a few minutes (public pages are cached briefly).
- Records created or edited here are flagged `managed`. The catalogue sync that runs on every
  backend deploy never overwrites or deletes managed records. Deleting a _seed_ record here removes it
  until the next catalogue data update re-seeds it.
- Surgeries, conditions and cities are defined in `backend/src/db/data` because they drive public
  URLs; they are listed read-only under _Surgeries & conditions_.

## Deploy

`npm run build` → static files in `dist/admin/browser`. Host them anywhere (e.g. a separate Vercel
project with the framework preset "Angular"), then add the admin URL to the API's `CORS_ORIGIN`
(comma-separated) so the browser may call it.

## Structure

- `src/app/core/resources.ts` — one config per section: table columns, filters, form fields.
  Adding a field to a section is usually a one-line change here.
- `src/app/pages/resource-list.ts` / `resource-form.ts` — the generic table and form.
- `src/app/core/api.ts`, `auth.ts` — API client, session, interceptor and route guard.
