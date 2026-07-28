// Renders the social cards the page head points at, plus the Apple touch icon,
// into static/og/ and static/. Run it with `pnpm og` and commit what it writes.
//
// This is deliberately not part of `pnpm build`. The deployed site is static, so
// an og:image has to exist as a file before the Action uploads build/ — but it
// only ever changes when a trip's GPX or name does, and folding a headless
// browser and a few hundred tile requests into every deploy would make a photo
// refresh (the workflow_dispatch run) slow and able to fail on someone else's
// uptime. Generating on demand and committing the PNGs keeps deploys offline.
//
// Requires Node 23.6+ (it imports .ts directly) and `pnpm install` for puppeteer.

import { bbox } from '@turf/bbox';
import { gpx } from '@tmcw/togeojson';
import { DOMParser } from '@xmldom/xmldom';
import type { FeatureCollection } from 'geojson';
import { mkdirSync, readdirSync, readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import puppeteer, { type Browser, type Page } from 'puppeteer';
import { DAY_COLORS } from '../src/lib/geo.ts';
import { OG_HEIGHT, OG_WIDTH, SITE_NAME, SITE_DESCRIPTION } from '../src/lib/seo.ts';
import { TRIPS } from '../src/lib/trips.ts';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');

/** Basemap for the trip cards. Vector, so it needs a real GL renderer to become a PNG. */
const STYLE_URL = 'https://tiles.openfreemap.org/styles/liberty';

/** Required by the tiles' licence, and there is no live map under a PNG to carry it. */
const ATTRIBUTION = '© OpenStreetMap contributors · OpenFreeMap';

/** Space left around the fitted route. Extra at the bottom, where the title sits. */
const FIT_PADDING = { top: 72, right: 72, bottom: 200, left: 72 };
/** How far a short trip may zoom in, so one day's loop does not fill the frame. */
const FIT_MAX_ZOOM = 10.5;

/** Apple renders this one on a home screen, where transparency comes out black. */
const TOUCH_ICON_PX = 180;

/** Once the map says it is idle, how long to let the last tiles paint, in ms. */
const SETTLE_MS = 1200;

// --- palette, matching src/routes/layout.css -------------------------------

const HAZY_IPA = '#aa953a';
const HAZY_50 = '#fbf9ef';
const HAZY_200 = '#e9e1b9';
const HAZY_950 = '#312811';
const INK = '#404040'; // neutral-700, the colour the h1 shadow is built from

// --- assets inlined into the page ------------------------------------------

const dataUri = (path: string, mime: string) =>
  `data:${mime};base64,${readFileSync(join(ROOT, path)).toString('base64')}`;

const font = (family: string, file: string) => `@font-face {
  font-family: '${family}';
  font-weight: 100 900;
  font-display: block;
  src: url(${dataUri(file, 'font/woff2')}) format('woff2-variations');
}`;

const FONTS = [
  font(
    'League Spartan',
    'node_modules/@fontsource-variable/league-spartan/files/league-spartan-latin-wght-normal.woff2'
  ),
  font(
    'DM Sans',
    'node_modules/@fontsource-variable/dm-sans/files/dm-sans-latin-wght-normal.woff2'
  ),
  font(
    'Geist Mono',
    'node_modules/@fontsource-variable/geist-mono/files/geist-mono-latin-wght-normal.woff2'
  )
].join('\n');

const WHEEL = dataUri('src/lib/assets/favicon.png', 'image/png');

/** The stacked shadow the site's h1 wears, as an inline style value. */
const blockShadow = (depth: number) =>
  Array.from({ length: depth * 2 }, (_, i) => {
    const o = (i + 1) * 0.5;
    return `${o}px ${o}px 0px ${INK}`;
  }).join(', ');

// --- trip geometry ---------------------------------------------------------

/** Great-circle distance in km, matching what @turf/distance reports. */
const haversineKm = (a: [number, number], b: [number, number]): number => {
  const R = 6371.0088;
  const rad = Math.PI / 180;
  const dLat = (b[1] - a[1]) * rad;
  const dLng = (b[0] - a[0]) * rad;
  const h =
    Math.sin(dLat / 2) ** 2 + Math.cos(a[1] * rad) * Math.cos(b[1] * rad) * Math.sin(dLng / 2) ** 2;
  return 2 * R * Math.asin(Math.sqrt(h));
};

/** Every day of a trip as one 2D LineString, ordered day_1 first. */
const dayLines = (folder: string): [number, number][][] => {
  const dir = join(ROOT, 'src/lib/assets/gpx', folder);

  return readdirSync(dir)
    .filter((f) => f.endsWith('.gpx'))
    .sort((a, b) => a.localeCompare(b, undefined, { numeric: true }))
    .map((file) => {
      const fc = gpx(
        new DOMParser().parseFromString(readFileSync(join(dir, file), 'utf8'), 'text/xml')
      ) as FeatureCollection;

      const coords: [number, number][] = [];
      for (const feature of fc.features) {
        const g = feature.geometry;
        if (g.type === 'LineString') coords.push(...(g.coordinates as [number, number][]));
        else if (g.type === 'MultiLineString')
          for (const seg of g.coordinates) coords.push(...(seg as [number, number][]));
      }
      // Dropped to two dimensions: elevation would put a z on every vertex of a
      // GeoJSON blob that has to survive being serialised into page.evaluate.
      return coords.map(([lng, lat]) => [lng, lat] as [number, number]);
    })
    .filter((line) => line.length > 0);
};

const boundsOf = (lines: [number, number][][]): [number, number, number, number] =>
  bbox({
    type: 'FeatureCollection',
    features: lines.map((coordinates) => ({
      type: 'Feature',
      properties: {},
      geometry: { type: 'LineString', coordinates }
    }))
  } as FeatureCollection) as [number, number, number, number];

// --- page scaffolding ------------------------------------------------------

const shell = (body: string, extraCss = '') => `<!doctype html>
<html><head><meta charset="utf-8"><style>
  ${FONTS}
  * { margin: 0; padding: 0; box-sizing: border-box; }
  html, body { width: 100%; height: 100%; overflow: hidden; background: ${HAZY_50}; }
  ${extraCss}
</style></head><body>${body}</body></html>`;

/** The title block every card carries, over whatever is behind it. */
const caption = (title: string, subtitle: string) => `
  <div class="caption">
    <img class="wheel" src="${WHEEL}" alt="">
    <div class="words">
      <div class="title">${title}</div>
      <div class="subtitle">${subtitle}</div>
    </div>
  </div>`;

const CAPTION_CSS = `
  .caption {
    position: absolute; left: 0; right: 0; bottom: 0;
    display: flex; align-items: center; gap: 28px;
    padding: 40px 56px 44px;
    background: linear-gradient(to top, ${HAZY_50} 0%, ${HAZY_50}f2 62%, ${HAZY_50}00 100%);
  }
  .wheel { width: 96px; height: 96px; flex: none; }
  .title {
    font-family: 'League Spartan'; font-weight: 700; font-size: 68px; line-height: 1;
    text-transform: uppercase; letter-spacing: 3px; color: ${HAZY_IPA};
    text-shadow: ${blockShadow(7)};
  }
  .subtitle {
    font-family: 'Geist Mono'; font-weight: 500; font-size: 26px; letter-spacing: 1px;
    color: ${HAZY_950}; margin-top: 18px;
  }
  .attribution {
    position: absolute; right: 14px; top: 12px;
    font-family: 'DM Sans'; font-size: 15px; color: #1c1c1c;
    background: #ffffffcc; border-radius: 6px; padding: 3px 9px;
  }`;

// --- rendering -------------------------------------------------------------

const MAPLIBRE_JS = readFileSync(
  join(ROOT, 'node_modules/maplibre-gl/dist/maplibre-gl.js'),
  'utf8'
);
const MAPLIBRE_CSS = readFileSync(
  join(ROOT, 'node_modules/maplibre-gl/dist/maplibre-gl.css'),
  'utf8'
);

const shot = (page: Page, path: string) => page.screenshot({ path: join(ROOT, path), type: 'png' });

const renderTripCard = async (
  page: Page,
  trip: (typeof TRIPS)[number],
  lines: [number, number][][],
  subtitle: string
) => {
  await page.setContent(
    shell(
      `<div id="map"></div>
       <div class="attribution">${ATTRIBUTION}</div>
       ${caption(trip.name, subtitle)}`,
      `#map { position: absolute; inset: 0; }
       ${CAPTION_CSS}`
    ),
    { waitUntil: 'domcontentloaded' }
  );

  await page.addStyleTag({ content: MAPLIBRE_CSS });
  await page.addScriptTag({ content: MAPLIBRE_JS });

  await page.evaluate(
    async (lines, bounds, styleUrl, colors, padding, maxZoom) => {
      const maplibregl = (window as any).maplibregl;

      const map = new maplibregl.Map({
        container: 'map',
        style: styleUrl,
        bounds,
        fitBoundsOptions: { padding, maxZoom },
        interactive: false,
        attributionControl: false,
        fadeDuration: 0,
        preserveDrawingBuffer: true
      });

      await new Promise((resolve) => map.once('load', resolve));

      lines.forEach((coordinates, i) => {
        map.addSource(`day-${i}`, {
          type: 'geojson',
          data: { type: 'Feature', properties: {}, geometry: { type: 'LineString', coordinates } }
        });
        // A pale casing under each line, so a route stays legible where it
        // crosses a road the basemap has already drawn in a similar colour.
        map.addLayer({
          id: `day-${i}-casing`,
          type: 'line',
          source: `day-${i}`,
          layout: { 'line-cap': 'round', 'line-join': 'round' },
          paint: { 'line-color': '#ffffff', 'line-width': 11, 'line-opacity': 0.9 }
        });
        map.addLayer({
          id: `day-${i}-line`,
          type: 'line',
          source: `day-${i}`,
          layout: { 'line-cap': 'round', 'line-join': 'round' },
          paint: { 'line-color': colors[i % colors.length], 'line-width': 6 }
        });
      });

      await new Promise((resolve) => {
        const done = () => {
          if (!map.areTilesLoaded()) return;
          map.off('idle', done);
          resolve(undefined);
        };
        map.on('idle', done);
      });
    },
    lines,
    boundsOf(lines),
    STYLE_URL,
    DAY_COLORS,
    FIT_PADDING,
    FIT_MAX_ZOOM
  );

  // The idle event fires when nothing is left to request, one frame before the
  // last of it is on screen.
  await new Promise((r) => setTimeout(r, SETTLE_MS));
  await shot(page, `static/og/${trip.slug}.png`);
};

const renderDefaultCard = async (page: Page) => {
  await page.setContent(
    shell(
      `<div class="sheet">
         <img class="mark" src="${WHEEL}" alt="">
         <div class="name">${SITE_NAME}</div>
         <div class="tagline">${SITE_DESCRIPTION}</div>
       </div>`,
      `.sheet {
         position: absolute; inset: 0;
         display: flex; flex-direction: column; align-items: center; justify-content: center;
         gap: 12px; padding: 0 96px; text-align: center;
         background: radial-gradient(120% 120% at 50% 0%, ${HAZY_200} 0%, ${HAZY_50} 70%);
       }
       .mark { width: 168px; height: 168px; margin-bottom: 18px; }
       .name {
         font-family: 'League Spartan'; font-weight: 700; font-size: 92px; line-height: 1;
         text-transform: uppercase; letter-spacing: 4px; color: ${HAZY_IPA};
         text-shadow: ${blockShadow(7)};
       }
       .tagline {
         font-family: 'DM Sans'; font-weight: 500; font-size: 27px; line-height: 1.45;
         color: ${HAZY_950}; max-width: 820px; margin-top: 26px;
       }`
    ),
    { waitUntil: 'domcontentloaded' }
  );

  await page.evaluate(() => document.fonts.ready);
  await shot(page, 'static/og/default.png');
};

const renderTouchIcon = async (browser: Browser) => {
  const page = await browser.newPage();
  await page.setViewport({ width: TOUCH_ICON_PX, height: TOUCH_ICON_PX });
  await page.setContent(
    shell(
      `<img class="mark" src="${WHEEL}" alt="">`,
      `body { display: flex; align-items: center; justify-content: center; background: ${HAZY_50}; }
       .mark { width: 78%; height: 78%; }`
    ),
    { waitUntil: 'domcontentloaded' }
  );
  await shot(page, 'static/apple-touch-icon.png');
  await page.close();
};

// --- entry point -----------------------------------------------------------

const run = async () => {
  mkdirSync(join(ROOT, 'static/og'), { recursive: true });

  const browser = await puppeteer.launch({
    // SwiftShader gives the CI runner a GL context; a Mac ignores these and uses
    // the real GPU. Without one, MapLibre renders a blank canvas rather than failing.
    args: [
      '--use-gl=angle',
      '--use-angle=swiftshader',
      '--enable-unsafe-swiftshader',
      '--hide-scrollbars'
    ]
  });

  const page = await browser.newPage();
  await page.setViewport({ width: OG_WIDTH, height: OG_HEIGHT, deviceScaleFactor: 1 });

  await renderDefaultCard(page);
  console.log('wrote static/og/default.png');

  for (const trip of TRIPS) {
    const lines = dayLines(trip.gpx_folder);
    if (!lines.length) {
      console.warn(`skipped ${trip.slug}: no GPX points in ${trip.gpx_folder}`);
      continue;
    }

    const km = lines.reduce((total, line) => {
      let d = 0;
      for (let i = 1; i < line.length; i++) d += haversineKm(line[i - 1], line[i]);
      return total + d;
    }, 0);

    await renderTripCard(page, trip, lines, `${lines.length} days · ${Math.round(km)} km`);
    console.log(`wrote static/og/${trip.slug}.png`);
  }

  await page.close();
  await renderTouchIcon(browser);
  console.log('wrote static/apple-touch-icon.png');

  await browser.close();
};

await run();
