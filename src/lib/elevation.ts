import { lineString } from '@turf/helpers';
import { nearestPointOnLine } from '@turf/nearest-point-on-line';
import { along } from '@turf/along';
import { distance } from '@turf/distance';
import type { Feature, FeatureCollection, LineString, Position } from 'geojson';

// Elevation/distance model for a whole trip, in metric units throughout.
//
// A trip is several day tracks (each its own FeatureCollection). This module
// stitches them into one continuous distance axis so a single elevation profile
// can span the trip while still knowing which day any point belongs to. It is
// pure and framework-free; BikeMap computes it once per trip via $derived.by.

export interface ElevationPoint {
  /** Cumulative distance from the trip's start, in km. */
  distanceKm: number;
  elevationM: number;
  /** Which day this point belongs to — drives per-day colouring. */
  dayIndex: number;
}

export interface TripElevation {
  /**
   * Each day flattened to a single 2D LineString, at full GPX resolution, for
   * the per-frame hover snapping (nearestPointOnLine / along), which touches one
   * day at a time and wants a smooth result.
   */
  dayLines: Feature<LineString>[];
  /**
   * The same lines heavily downsampled (~hundreds of points), for snapping every
   * photo at load. Full res there was O(photos × 74k) and froze the page; roads
   * are smooth enough that a coarse line still snaps on-route points accurately.
   */
  dayLinesCoarse: Feature<LineString>[];
  /** Cumulative trip distance (km) at the start of each day. */
  dayOffsetsKm: number[];
  /** Length (km) of each day. */
  dayLengthsKm: number[];
  /**
   * Downsampled points for chart rendering, ordered along the trip. Full-
   * resolution geometry stays in `dayLines`; only the drawn curve is thinned.
   */
  series: ElevationPoint[];
  totalKm: number;
  minElevationM: number;
  maxElevationM: number;
}

/** Flatten a day's (Multi)LineString features into one coordinate array. */
const dayCoords = (fc: FeatureCollection): Position[] => {
  const coords: Position[] = [];
  for (const f of fc.features) {
    const g = f.geometry;
    if (g.type === 'LineString') coords.push(...g.coordinates);
    else if (g.type === 'MultiLineString') for (const seg of g.coordinates) coords.push(...seg);
  }
  return coords;
};

// Target vertex count per day for the coarse photo-anchoring lines. High enough
// to trace the road faithfully, low enough that snapping a big album is quick.
const ANCHOR_PTS_PER_DAY = 400;

/**
 * Build the trip-wide elevation model.
 *
 * Cumulative distance is accumulated in a single O(n) pass over consecutive
 * points (using @turf/distance so it matches nearestPointOnLine's `location`
 * metric exactly) — deliberately NOT turf.length over progressive slices, which
 * would be O(n²) and hang the page on a 70k-point trip.
 *
 * The chart series is thinned by an index stride derived from `targetPoints`,
 * always keeping each day's first and last point. `targetPoints` is the single
 * tunable that trades render cost against how much fine relief the curve keeps;
 * hit-testing is unaffected because it uses `dayLines` at full resolution.
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

    // A degenerate day (0–1 points) still needs placeholder entries so indexes
    // line up; give turf a valid 2-point line it can never match usefully.
    if (coords.length < 2) {
      const seed: Position = coords[0] ?? [0, 0];
      dayLines[di] = lineString([seed, seed]);
      dayLinesCoarse[di] = lineString([seed, seed]);
      dayLengthsKm[di] = 0;
      return;
    }

    const flat = coords.map((c) => [c[0], c[1]]);
    dayLines[di] = lineString(flat);

    // Keep every anchorStride-th vertex (plus the last) for the coarse line.
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

/** Which day a cumulative trip distance falls in (last day whose start it passed). */
const dayAtDistance = (elev: TripElevation, distanceKm: number): number => {
  let di = 0;
  for (let i = 0; i < elev.dayOffsetsKm.length; i++) {
    if (distanceKm >= elev.dayOffsetsKm[i]) di = i;
    else break;
  }
  return di;
};

/**
 * Trip distance → position on the map. Used for the profile→map direction:
 * turf.along the containing day's line at the day-local distance.
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
 * Map position → trip distance. Used for the map→profile direction: the hovered
 * DayRoute layer supplies the day index, so we only snap within that one day and
 * add its offset. `totalDistance` is turf's distance-along-line in km.
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
 * Snap an arbitrary point (a photo's geotag) onto the route: the nearest spot
 * across all days, as a trip distance + the elevation there. `offRouteKm` is how
 * far the point sat from the line, so callers can drop wildly off-route photos.
 *
 * Runs against `dayLinesCoarse`, not the full-resolution lines. turf's snapping
 * interpolates along each segment, so a point on (say) day 1's line still matches
 * day 1 even where day 0 runs close — which the coarse line preserves because
 * roads are smooth. Full res here cost ~80ms/photo and froze the page at mount.
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

/** Interpolated elevation at a trip distance, for the hover read-out. */
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
