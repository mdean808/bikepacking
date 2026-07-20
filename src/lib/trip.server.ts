import { gpx } from '@tmcw/togeojson';
import { DOMParser } from '@xmldom/xmldom';
import type { FeatureCollection } from 'geojson';
import type { Trip, TripMeta } from './trips';

// Server-only half of the trip data. The .server.ts suffix is load-bearing:
// SvelteKit refuses to let this reach the client, which is what keeps 8.3 MB of
// raw GPX and the xmldom parser out of the browser bundle.

// Every GPX file as raw text, keyed by path. Eager is fine here — it costs a
// read at module eval on the server, and the parse below is what actually hurts.
const gpxFiles = import.meta.glob('$lib/assets/gpx/**/*.gpx', {
  query: '?raw',
  import: 'default',
  eager: true
}) as Record<string, string>;

const toGeoJSON = (raw: string): FeatureCollection =>
  gpx(new DOMParser().parseFromString(raw, 'text/xml'));

// Parsing every track is ~1.4s for the Haida Gwaii trip's 73,863 points. That
// used to be amortised because it happened once at module eval; now that it
// happens per request, it MUST be memoised or every page load pays it again.
// Keyed by folder, which is what determines the parse result.
const parsed = new Map<string, Trip>();

/** All GeoJSON for one trip folder, ordered day_1, day_2, … day_10. */
const dayTracks = (folder: string): FeatureCollection[] =>
  Object.entries(gpxFiles)
    .filter(([path]) => path.includes(`/gpx/${folder}/`))
    .sort(([a], [b]) => a.localeCompare(b, undefined, { numeric: true }))
    .map(([, raw]) => toGeoJSON(raw));

/**
 * Zip hand-authored day metadata with the GPX tracks loaded from the trip's
 * folder, matched by order (day_1 → days[0], …). Missing metadata falls back to
 * a generic title so an added GPX file never breaks the build.
 */
export const buildTrip = (meta: TripMeta): Trip => {
  const cached = parsed.get(meta.folder);
  if (cached) return cached;

  const trip: Trip = {
    ...meta,
    days: dayTracks(meta.folder).map((geoJSON, i) => ({
      title: meta.days[i]?.title ?? `Day ${i + 1}`,
      description: meta.days[i]?.description ?? '',
      geoJSON
    }))
  };

  parsed.set(meta.folder, trip);
  return trip;
};
