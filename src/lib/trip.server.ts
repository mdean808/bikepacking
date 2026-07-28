import { gpx } from '@tmcw/togeojson';
import { DOMParser } from '@xmldom/xmldom';
import type { Feature, FeatureCollection } from 'geojson';
import type { DayWindow, Trip, TripMeta } from './trips';

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
 * Returns the times togeojson recorded for a feature's points. It stores them at
 * `properties.coordinateProperties.times`, flat for a single-segment track and
 * one array per segment for a multi-segment one.
 */
const featureTimes = (properties: Feature['properties']): unknown[] => {
  const coordinateProperties = properties?.coordinateProperties as { times?: unknown } | undefined;
  const times = coordinateProperties?.times;
  return Array.isArray(times) ? times.flat() : [];
};

/** Returns the span a day's track was recording over, or null if it has no times. */
const timeWindow = (fc: FeatureCollection): DayWindow | null => {
  let startedAt = Infinity;
  let endedAt = -Infinity;

  for (const feature of fc.features) {
    for (const entry of featureTimes(feature.properties)) {
      const t = typeof entry === 'string' ? Date.parse(entry) : NaN;
      if (Number.isNaN(t)) continue;
      if (t < startedAt) startedAt = t;
      if (t > endedAt) endedAt = t;
    }
  }

  return startedAt <= endedAt ? { startedAt, endedAt } : null;
};

/**
 * Drops the per-point arrays togeojson attaches under `coordinateProperties`.
 * A day's track carries tens of thousands of timestamps, and once `timeWindow`
 * has read the ends nothing reads them again — leaving them on the features ships
 * megabytes of JSON to the browser for nothing.
 */
const stripCoordinateProperties = (fc: FeatureCollection): FeatureCollection => ({
  ...fc,
  features: fc.features.map((feature) => {
    if (!feature.properties?.coordinateProperties) return feature;
    const { coordinateProperties: _drop, ...properties } = feature.properties;
    return { ...feature, properties };
  })
});

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
      window: timeWindow(geoJSON),
      geoJSON: stripCoordinateProperties(geoJSON)
    }))
  };

  parsed.set(meta.gpx_folder, trip);
  return trip;
};
