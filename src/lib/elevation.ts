import { lineString } from '@turf/helpers';
import { nearestPointOnLine } from '@turf/nearest-point-on-line';
import { along } from '@turf/along';
import { distance } from '@turf/distance';
import type { Feature, FeatureCollection, LineString, Position } from 'geojson';

// Joins a trip's day tracks, each its own FeatureCollection, onto one continuous
// distance axis. That lets a single elevation profile span the whole trip and
// still say which day any point on it belongs to. Distances are km, elevations m.

export interface ElevationPoint {
  /** Cumulative distance from the trip's start, in km. */
  distanceKm: number;
  elevationM: number;
  dayIndex: number;
}

export interface TripElevation {
  /** Each day flattened to one 2D LineString at full GPX resolution. */
  dayLines: Feature<LineString>[];
  /**
   * The same lines downsampled to a few hundred points each. Photo snapping runs
   * against these, because doing it at full resolution is O(photos × points).
   */
  dayLinesCoarse: Feature<LineString>[];
  /** Cumulative trip distance (km) at the start of each day. */
  dayOffsetsKm: number[];
  /** Length (km) of each day. */
  dayLengthsKm: number[];
  /** The points the chart draws, thinned from `dayLines` and ordered along the trip. */
  series: ElevationPoint[];
  totalKm: number;
  minElevationM: number;
  maxElevationM: number;
}

/** Flattens a day's (Multi)LineString features into one coordinate array. */
const dayCoords = (fc: FeatureCollection): Position[] => {
  const coords: Position[] = [];
  for (const f of fc.features) {
    const g = f.geometry;
    if (g.type === 'LineString') coords.push(...g.coordinates);
    else if (g.type === 'MultiLineString') for (const seg of g.coordinates) coords.push(...seg);
  }
  return coords;
};

/** How many points each day keeps in `dayLinesCoarse`. */
const ANCHOR_PTS_PER_DAY = 400;

/**
 * Builds a trip's elevation model from its day tracks.
 *
 * `targetPoints` caps how many points reach `series`, trading render cost against
 * how much fine relief the drawn curve keeps. Hit-testing is unaffected, as it
 * reads `dayLines` at full resolution.
 *
 * Distance accumulates in one O(n) pass using @turf/distance, which matches the
 * metric nearestPointOnLine reports. turf.length over progressive slices would
 * instead be O(n²).
 */
export const buildTripElevation = (
  days: FeatureCollection[],
  targetPoints = 1000
): TripElevation => {
  const dayLines: Feature<LineString>[] = [];
  const dayLinesCoarse: Feature<LineString>[] = [];
  const dayOffsetsKm: number[] = [];
  const dayLengthsKm: number[] = [];
  const series: ElevationPoint[] = [];

  let cumulative = 0;
  let minE = Infinity;
  let maxE = -Infinity;

  const allCoords = days.map(dayCoords);
  const totalPts = allCoords.reduce((s, c) => s + c.length, 0);
  const stride = Math.max(1, Math.floor(totalPts / Math.max(1, targetPoints)));

  days.forEach((_, di) => {
    const coords = allCoords[di];
    dayOffsetsKm[di] = cumulative;

    // Under two points can't form a line. Store a stub turf accepts but will
    // never match usefully, so the day indexes still line up.
    if (coords.length < 2) {
      const seed: Position = coords[0] ?? [0, 0];
      dayLines[di] = lineString([seed, seed]);
      dayLinesCoarse[di] = lineString([seed, seed]);
      dayLengthsKm[di] = 0;
      return;
    }

    const flat = coords.map((c) => [c[0], c[1]]);
    dayLines[di] = lineString(flat);

    const anchorStride = Math.max(1, Math.floor(flat.length / ANCHOR_PTS_PER_DAY));
    const coarse = flat.filter((_, i) => i % anchorStride === 0 || i === flat.length - 1);
    dayLinesCoarse[di] = lineString(coarse);

    let dayDist = 0;
    let lastEle = coords[0][2] ?? 0;
    for (let i = 0; i < coords.length; i++) {
      if (i > 0) dayDist += distance(coords[i - 1], coords[i], { units: 'kilometers' });
      const ele = coords[i][2] ?? lastEle;
      lastEle = ele;

      if (i === 0 || i === coords.length - 1 || i % stride === 0) {
        series.push({ distanceKm: cumulative + dayDist, elevationM: ele, dayIndex: di });
        if (ele < minE) minE = ele;
        if (ele > maxE) maxE = ele;
      }
    }

    dayLengthsKm[di] = dayDist;
    cumulative += dayDist;
  });

  return {
    dayLines,
    dayLinesCoarse,
    dayOffsetsKm,
    dayLengthsKm,
    series,
    totalKm: cumulative,
    minElevationM: minE === Infinity ? 0 : minE,
    maxElevationM: maxE === -Infinity ? 0 : maxE
  };
};

/** Returns the index of the day a cumulative trip distance falls within. */
const dayAtDistance = (elev: TripElevation, distanceKm: number): number => {
  let di = 0;
  for (let i = 0; i < elev.dayOffsetsKm.length; i++) {
    if (distanceKm >= elev.dayOffsetsKm[i]) di = i;
    else break;
  }
  return di;
};

/**
 * Returns the map coordinate at a cumulative trip distance, and the day it falls
 * in. Null when the trip has no lines.
 */
export const pointAtDistance = (
  elev: TripElevation,
  distanceKm: number
): { lng: number; lat: number; dayIndex: number } | null => {
  if (!elev.dayLines.length) return null;
  const di = dayAtDistance(elev, distanceKm);
  const local = Math.min(Math.max(distanceKm - elev.dayOffsetsKm[di], 0), elev.dayLengthsKm[di]);
  const [lng, lat] = along(elev.dayLines[di], local, { units: 'kilometers' }).geometry.coordinates;
  return { lng, lat, dayIndex: di };
};

/**
 * Returns the cumulative trip distance of the point on day `dayIndex` nearest the
 * given coordinate. The caller already knows the day, so only that one is searched.
 */
export const distanceAlongDay = (
  elev: TripElevation,
  dayIndex: number,
  lng: number,
  lat: number
): number => {
  const snapped = nearestPointOnLine(elev.dayLines[dayIndex], [lng, lat], { units: 'kilometers' });
  return elev.dayOffsetsKm[dayIndex] + (snapped.properties.totalDistance ?? 0);
};

/**
 * Finds where an arbitrary point, such as a photo's geotag, sits on the route.
 * Searches every day for the nearest spot and returns that day, its cumulative
 * trip distance, the elevation there, and how far off the line the point was, so
 * callers can drop photos taken nowhere near the route.
 *
 * Searches `dayLinesCoarse` rather than the full-resolution lines, as this runs
 * once per photo.
 */
export const anchorOnRoute = (
  elev: TripElevation,
  lng: number,
  lat: number
): { dayIndex: number; distanceKm: number; elevationM: number; offRouteKm: number } | null => {
  let best: { d: number; di: number; local: number } | null = null;
  for (let di = 0; di < elev.dayLinesCoarse.length; di++) {
    if (elev.dayLengthsKm[di] <= 0) continue;
    const snapped = nearestPointOnLine(elev.dayLinesCoarse[di], [lng, lat], {
      units: 'kilometers'
    });
    const d = snapped.properties.pointDistance ?? Infinity;
    if (best === null || d < best.d) best = { d, di, local: snapped.properties.totalDistance ?? 0 };
  }
  if (best === null) return null;
  const distanceKm = elev.dayOffsetsKm[best.di] + best.local;
  return {
    dayIndex: best.di,
    distanceKm,
    elevationM: elevationAtDistance(elev, distanceKm) ?? 0,
    offRouteKm: best.d
  };
};

/**
 * Returns the elevation at a cumulative trip distance, interpolated between the
 * two nearest series points. Clamps to the first and last point beyond the ends.
 */
export const elevationAtDistance = (elev: TripElevation, distanceKm: number): number | null => {
  const s = elev.series;
  if (!s.length) return null;
  if (distanceKm <= s[0].distanceKm) return s[0].elevationM;
  if (distanceKm >= s[s.length - 1].distanceKm) return s[s.length - 1].elevationM;
  for (let i = 1; i < s.length; i++) {
    if (s[i].distanceKm >= distanceKm) {
      const a = s[i - 1];
      const b = s[i];
      const t = (distanceKm - a.distanceKm) / (b.distanceKm - a.distanceKm || 1);
      return a.elevationM + t * (b.elevationM - a.elevationM);
    }
  }
  return s[s.length - 1].elevationM;
};
