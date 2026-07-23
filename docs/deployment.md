# Deployment options

Two viable shapes for this app. Both keep `IMMICH_API_KEY` out of the browser;
they differ in **when** the Immich fetch happens — at build time or per request.

Read this alongside the "Data flow" section of `CLAUDE.md`.

---

## The one constraint that drives everything

`src/lib/immich.ts` reads `$env/static/private` and talks to Immich with an API
key. That call can never happen in the browser, so it has to run *somewhere
trusted*. The only real question is whether that somewhere is a CI runner that
exists for a minute, or a host that stays up.

Everything else — the map, the modals, the hover coordination — is static assets
either way.

---

## Option A — GitHub Pages (static, prerendered)

**Recommended.** No runtime server, no hosting bill, no cold starts.

### How it works

`export const prerender = true` makes SvelteKit run every `load` once during
`pnpm build` and write the result to disk:

```
build/
  index.html                 ← landing / wheel
  haida-gwaii/index.html     ← map, photo markers already baked in
  haida-gwaii/__data.json    ← serialized load() output for client-side nav
  _app/…                     ← JS, CSS, fonts
```

GitHub Pages serves those files verbatim. Nothing executes at request time. The
API key is used by the Actions runner during the build and never appears in the
output — only the resulting image URLs and the album share `key`, which is
already public by design (that's the whole point of `getAlbumShareKey` in
`src/lib/immich.ts`).

At runtime the browser talks to exactly two hosts: GitHub Pages for the app,
`photos.mogdan.xyz` for thumbnails.

### Required changes

Starting point is a clean tree at `43b6faf`: `adapter-auto`, no `prerender`, no
workflow. All of the below is from scratch.

- `pnpm add -D @sveltejs/adapter-static`, then swap it for `adapter-auto` in
  `vite.config.ts`. Note it may already be present in `node_modules/` as a
  leftover from an earlier attempt while *absent* from `package.json` — that
  works locally and breaks under CI's `pnpm install --frozen-lockfile`, so
  confirm it lands in `package.json`.
- Create `src/routes/+layout.ts` with `export const prerender = true`
- **Trips must move from `?trip=` to a route param.** `url.searchParams` throws
  during prerendering — see `node_modules/@sveltejs/kit/src/utils/url.js:184`,
  _"Cannot access url.search on a page with prerendering enabled"_. This is a
  hard build failure, not a degradation.
- Use an **optional** param, `src/routes/[[trip]]/`, not `src/routes/[trip]/`.
  The wheel→map crossfade in `+page.svelte` works because both branches live in
  one `{#if}` inside one component instance. Splitting them across two routes
  tears down one page component and mounts another, and the `in:fly`/`out:fade`
  pair stops coordinating. An optional param keeps `/` and `/haida-gwaii` on the
  same route, so navigation re-runs `load` with the component still mounted —
  structurally identical to today's `?trip=`.
- `export function entries()` in `+page.server.ts`, returning one object per
  trip. `/` is covered for free by the default `entries: ['*']`, which includes
  routes with no *required* params.
- An explicit `slug` field on `TripMeta`. Deriving it from `name` means renaming
  a trip silently breaks every shared link, and `"Haida Gwaii"` needs encoding.
- `kit.paths.base` set from a `BASE_PATH` env var **unless** the repo is
  `<user>.github.io` or you're on a custom domain. Otherwise every asset 404s.
- Write `.github/workflows/deploy.yml` (checkout → pnpm → build →
  `upload-pages-artifact` on `build/` → `deploy-pages`). Two things to get
  right: trigger on **`main`**, and pass `IMMICH_URL` / `IMMICH_API_KEY` as repo
  secrets through an `env:` block on the build step, or the build dies on
  `$env/static/private`. An empty `.github/workflows/` directory currently
  exists as a leftover; git doesn't track empty dirs, so it shows up in neither
  `git status` nor a fresh clone.

Do **not** set `fallback: '404.html'` on the adapter. With everything
prerendered it's dead weight, and it downgrades "a route failed to prerender"
from a loud build error into a silent client-side fetch in production.

### Trade-offs

| | |
|---|---|
| ✅ | No server, no cold starts, no bill, no scaling story |
| ✅ | GPX parsing (~1.4s for 73,863 points) happens once in CI, never for a visitor |
| ✅ | Immich only needs to be reachable from the CI runner at build time |
| ⚠️ | **Photo data is frozen at build time.** Adding a photo to an album does nothing until you redeploy |
| ⚠️ | Every trip's data is generated on every build, whether or not it changed |

The staleness is the only real cost. If it bites, add a `repository_dispatch`
trigger or a nightly `schedule:` to the workflow — that's a few lines and
recovers most of the freshness without giving up static hosting.

---

## Option B — hosted with a running server

Worth it only if you want data that's live without a redeploy: an Immich album
you keep adding to, or eventually anything user-specific.

### What changes

- Swap the adapter (below), drop `prerender`
- `$env/static/private` → `$env/dynamic/private`, since values are no longer
  known at build time
- `?trip=` can stay as-is — the route refactor from Option A becomes optional
  (still nicer for shareable URLs, but no longer forced)

### Two things that get worse

**GPX parsing moves onto the request path.** The memo cache in
`src/lib/trip.server.ts` is per-instance. On serverless, a cold start means an
empty `Map` and a visitor eating the full parse. The comment in that file
already flags this — it stopped being amortised at module eval once rendering
went per-request, and hosting makes the blast radius bigger.

**The GPX has to ship inside the server bundle.** `import.meta.glob(…, { eager:
true })` inlines all of it: currently **8.3 MB raw, ~856 KB gzipped** for one
trip. That's fine on most hosts and tight on one (see below). It also scales
linearly with trips, so it's a budget you spend rather than a fixed cost.

### Free providers

Free tiers move around; check current limits before committing.

**Cloudflare Workers** — `@sveltejs/adapter-cloudflare`. Best free tier of the
three and the fastest cold starts (V8 isolates, not containers). **Caveat:** the
free plan caps compressed Worker size at 3 MiB, and one trip's GPX is already
~856 KB of that. Two or three more trips and you're negotiating with the limit.
Fixable by moving GPX to R2 or serving it as a static asset and fetching it, but
that's a real refactor of `trip.server.ts`.

**Netlify** — `@sveltejs/adapter-netlify`. Functions have a ~50 MB bundle limit,
so the GPX is a non-issue. Free tier includes bandwidth and function invocations
that a personal site won't approach. Cold starts are slower than Cloudflare.
Probably the least friction if you want Option B without rearchitecting.

**Vercel** — `@sveltejs/adapter-vercel`. Best SvelteKit integration, generous
Hobby tier, same ~50 MB function limit. Note the Hobby plan is
non-commercial-use only; a personal trip journal qualifies, anything with
ads/sponsorship doesn't.

All three do zero-config git deploys, so the Actions workflow goes away.

---

## Recommendation

**Option A.** The app is a read-only journal of finished trips. Nothing about it
needs per-request compute, and prerendering turns the one genuinely slow thing —
GPX parsing — into a build-time cost a visitor never pays. Photo staleness is
the only downside, and a scheduled rebuild handles it.

Reach for Option B only if "I added photos and want them live now" becomes a
recurring annoyance. If it does, Netlify is the shortest path; Cloudflare is
better on latency but wants the GPX out of the bundle first.
