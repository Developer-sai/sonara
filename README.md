# SONARA — Your Music. Your Aura.

A music-visualization studio: turn songs, playlists, and listening history into
shareable story-ready visuals (grids, stickers, kinetic word clouds, and more).

## Stack

- **Next.js 16** (App Router, TypeScript, Turbopack) + React 19
- **Tailwind CSS v4** with a custom AMOLED/aura design system
- **Radix UI primitives** (hand-assembled shadcn-style components in `src/components/ui`)
- **motion** (motion.dev) for UI animation, plus a hand-rolled Canvas 2D rendering
  engine (`src/lib/canvas`) for the actual aura visuals and PNG export
- **zustand** for client state (`src/store`)
- **Postgres** via [`@neondatabase/serverless`](https://neon.tech) — HTTP-based, no
  connection pooling to manage, works natively on Vercel's serverless runtime
- PWA: `app/manifest.ts` + `public/sw.js` (installable, works offline for the shell)

## Getting started

1. Provision a Postgres database and set `DATABASE_URL` — see [Deploying to
   Vercel](#deploying-to-vercel) below (a local Postgres or a free Neon branch
   both work fine for development).
2. Copy `.env.example` to `.env.local` and fill in `DATABASE_URL` and `JWT_SECRET`
   (any random string).
3. Install and run:

```bash
npm install
npm run dev
```

Open **http://localhost:3005/studio**. The database schema is created automatically
on first request — no separate migration step.

## Deploying to Vercel

1. Push this repo to GitHub and import it in [vercel.com/new](https://vercel.com/new).
2. In the project's **Storage** tab, create a **Neon** Postgres database (one click) —
   Vercel injects `DATABASE_URL` into the project automatically.
3. Add `JWT_SECRET` (any random string) under **Settings → Environment Variables**.
   Optionally add the Spotify/Google OAuth vars from `.env.example`.
4. Deploy. Every push to the connected branch redeploys automatically.

No other configuration is needed — the app has no persistent local disk usage and
runs entirely as Vercel serverless functions + static assets.

### Works immediately, no setup required

- Paste any Spotify / Apple Music / YouTube / YouTube Music / SoundCloud link — resolved
  via each platform's public oEmbed (or an Open Graph fallback), then enriched with
  real artwork + 30s previews from the iTunes Search API.
- Search any song live (iTunes Search API, no key needed).
- Load a curated demo set (Telugu classics + global hits) with one click.
- Build and export a cloud as a guest — no account needed to use the Studio or
  download a PNG.

### Optional: real OAuth for Spotify / YouTube Music

Copy values into `.env` to enable real "Connect" flows (both are free, self-serve
developer accounts):

```
SPOTIFY_CLIENT_ID=...
SPOTIFY_CLIENT_SECRET=...
# redirect URI to whitelist: http://localhost:3005/api/accounts/callback/spotify
# (or https://<your-domain>/api/accounts/callback/spotify once deployed)

GOOGLE_CLIENT_ID=...
GOOGLE_CLIENT_SECRET=...
# redirect URI to whitelist: http://localhost:3005/api/accounts/callback/google
# (or https://<your-domain>/api/accounts/callback/google once deployed)
```

Without these set, "Connect" for every provider (Spotify, YouTube Music, Apple Music,
SoundCloud, Deezer, Amazon Music, TIDAL) falls back to an instant 1-click **demo
connection** — the account shows as linked and "Import" pulls a curated, artwork-enriched
seed list, so the whole flow works end-to-end with zero configuration. Apple Music,
SoundCloud, Deezer, Amazon Music and TIDAL don't offer public self-serve developer
OAuth at all, so those always use demo mode regardless of env vars.

## Project layout

```
src/app/            Next.js routes (pages + API routes under app/api/**)
src/components/      UI: ui/ (primitives), studio/, landing/, layout/, auth/, share/
src/lib/             db.ts, auth.ts, musicProviders.ts, accountProviders.ts, canvas/
src/store/           zustand stores (auth, studio)
public/sample-assets Reference screenshots used as demo art / landing gallery
```

## Scripts

```bash
npm run dev      # start dev server (Turbopack)
npm run build    # production build + typecheck
npm run start    # run the production build
npm run lint     # ESLint
npm run generate-icons  # regenerate PWA icons from scripts/generate-icons.mjs
```
