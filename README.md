# Toledo Feeder Bids 2026

Dashboard for UPS Teamsters feeder drivers to view annual bid routes posted in
the shared Google Sheet. Built for Samuel — Toledo, OH hub.

## Run locally

```sh
npm install
npm run dev          # localhost:5173
npm run build        # production build → dist/
npm run preview      # preview the production build
npm test             # parser unit tests (vitest)
```

## How it works

- The sheet is fetched at runtime as CSV from
  `docs.google.com/spreadsheets/d/<id>/export?format=csv&gid=<gid>`.
- Three-tier fallback: direct fetch → corsproxy.io → "paste CSV" textarea.
- Last fetch is cached in `localStorage` so cold-start shows the previous
  snapshot instantly while the live request is in flight.
- Auto-refreshes every 60 s (configurable in Settings).

## Updating tab GIDs

Only the **Toledo Annual** tab has a known GID baked in (`1758902346`). For
the rest:

1. Open the Google Sheet, switch to the desired tab.
2. Copy the number after `gid=` in the URL.
3. Open the dashboard → Settings (gear icon) → Tab GIDs → paste.
4. Save. The new tab will load immediately.

## Updating location codes

Routes use compact codes (`TOLOH` = Toledo, OH). Click any code rendered with
an amber dot — the inline editor lets you type the real name. Stored in
`localStorage` per browser. To bake a code into the seed dictionary for all
users, add it to `src/data/locations.ts → SEED_LOCATIONS` and redeploy.

## Adding a new tab

1. Add an entry to `TAB_SOURCES` in `src/data/sources.ts` with `kind:
   "annualBid"` (uses the multi-row legged parser) or `kind: "table"` (simple
   header-row table).
2. Add an icon mapping in `src/components/TabStrip.tsx → ICONS`.
3. Done. The tab will show up in the strip with a "needs gid" prompt until
   you set one.

## Deploying to the internet (step-by-step)

The repo ships with `netlify.toml` so Netlify will set up itself. From scratch:

### 1. Put the code on GitHub

```sh
cd "/Users/samueldevos/Bidsheet website"
git init
git add .
git commit -m "Toledo Feeder Bids — initial release"
```

Then on github.com → New repository → name it something like
`toledo-feeder-bids` → "create repository". It will show you two lines to
paste back in the terminal:

```sh
git remote add origin https://github.com/<your-username>/toledo-feeder-bids.git
git branch -M main
git push -u origin main
```

### 2. Create a Netlify site

1. Sign up / log in at [netlify.com](https://app.netlify.com) (free).
2. **Add new site → Import from Git → GitHub**. Authorize and pick the repo.
3. Leave the defaults (build `npm run build`, publish `dist`) — the
   `netlify.toml` already has them. Click **Deploy**.
4. First deploy takes ~1 minute. You'll get a URL like
   `https://zippy-cobbler-123abc.netlify.app`.
5. **Site configuration → Change site name** to pick something memorable
   like `toledo-bids` → final URL becomes `toledo-bids.netlify.app`.

### 3. Share it with coworkers

Text the URL. On iPhone: Safari → Share → **Add to Home Screen** installs it
like an app (icon + full-screen, no browser chrome). Works the same on
Android via Chrome.

### 4. Pushing updates

Any `git push` to `main` on GitHub auto-rebuilds the site. Typical flow:

```sh
git add -A && git commit -m "update location codes"
git push
```

Netlify rebuilds and redeploys within ~1 minute. No other steps.

## Project layout

```
src/
  parse/        CSV parser, day/route/schedule/time helpers, vitest suite
  data/         CSV loader (3-tier fallback), localStorage caches,
                seed dictionaries, settings, useCsv hook
  components/   TopBar, TabStrip, FilterBar, BidRow, BidDetail,
                RouteRender, SettingsModal, LocationEditor, PasteFallback
  views/        AnnualBidView (two-pane bid browser),
                TableView (Seniority / On-Call / Bid Times)
  App.tsx       Top-level layout + routing
  main.tsx      Vite entry
```

## Roadmap (Phase 2)

- Map overlay per bid (Leaflet + OpenStreetMap)
- Drive-time estimates (OpenRouteService)
- Watchlist + browser notifications when a starred bid becomes available
- Server-side CSV proxy (Netlify Function) so we don't depend on a public
  CORS proxy
- Seniority tab: timeline + "you are #X, currently calling #Y" countdown
