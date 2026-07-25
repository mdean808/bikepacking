import { gpx } from '@tmcw/togeojson';
import { DOMParser } from '@xmldom/xmldom';
import type { FeatureCollection } from 'geojson';
import type { Trip, TripMeta } from './trips';

// .server.ts keeps the raw GPX and xmldom parser out of the client bundle.
const gpxFiles = import.meta.glob('$lib/assets/gpx/**/*.gpx', {
  query: '?raw',
  import: 'default',
  eager: true
}) as Record<string, string>;

const toGeoJSON = (raw: string): FeatureCollection =>
  gpx(new DOMParser().parseFromString(raw, 'text/xml'));

// Cache of trips already built, so a folder's GPX is only parsed once per process.
const parsed = new Map<string, Trip>();

/**
 * Parses every GPX file in one trip folder to GeoJSON, ordered by day number
 * (day_2 before day_10).
 */
const dayTracks = (folder: string): FeatureCollection[] =>
  Object.entries(gpxFiles)
    .filter(([path]) => path.includes(`/gpx/${folder}/`))
    .sort(([a], [b]) => a.localeCompare(b, undefined, { numeric: true }))
    .map(([, raw]) => toGeoJSON(raw));

/**
 * Builds a full Trip by pairing each day's metadata with its GPX track in order,
 * so day_1's track becomes days[0]. Days with no metadata fall back to "Day N".
 */
export const buildTrip = (meta: TripMeta): Trip => {
  const cached = parsed.get(meta.gpx_folder);
  if (cached) return cached;

  const trip: Trip = {
    ...meta,
    days: dayTracks(meta.gpx_folder).map((geoJSON, i) => ({
      title: meta.days[i]?.title ?? `Day ${i + 1}`,
      description: meta.days[i]?.description ?? '',
      geoJSON
    }))
  };

  parsed.set(meta.gpx_folder, trip);
  return trip;
};
