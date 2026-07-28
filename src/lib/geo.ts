import { bbox } from '@turf/bbox';
import type { FeatureCollection } from 'geojson';
import type { Image } from '$lib/components/map/types';
import type { Day } from '$lib/trips';

/** Route colours, ordered so consecutive days never share a hue family. */
export const DAY_COLORS = [
  '#F3722C',
  '#4361EE',
  '#E63946',
  '#43AA8B',
  '#F72585',
  '#F9C74F',
  '#7209B7'
];

export const dayColor = (i: number): string => DAY_COLORS[i % DAY_COLORS.length];

/**
 * Returns a route's bounding box as [minLng, minLat, maxLng, maxLat], or null
 * when the collection is empty — @turf/bbox returns Infinities for that, which
 * fitBounds cannot use.
 */
export const routeBounds = (fc: FeatureCollection): [number, number, number, number] | null =>
  fc.features.length ? (bbox(fc) as [number, number, number, number]) : null;

/**
 * Returns the sideways offset to draw day `i` of `total` at, spread evenly
 * around zero (4 days → -3, -1, 1, 3). Days that follow the same road would
 * otherwise be drawn on top of each other, hiding all but the last.
 */
export const dayLineOffset = (i: number, total: number): number => (i - (total - 1) / 2) * 2;

/**
 * Returns the index of the day whose GPS track was recording at time `t`.
 *
 * Days that ran along the same road can't be told apart by position, so the clock
 * decides instead. A time falling between two days — a photo taken at camp after
 * the riding stopped — goes to the day that had just finished. A time before the
 * trip started goes to its first day. Null when `t` is null or no day has a window.
 *
 * Assumes days run in chronological order, which is how `buildTrip` numbers them.
 */
export const dayIndexForTime = (days: Day[], t: number | null): number | null => {
  if (t == null) return null;

  let preceding: number | null = null;
  let firstDated: number | null = null;

  for (let i = 0; i < days.length; i++) {
    const window = days[i].window;
    if (!window) continue;
    if (firstDated === null) firstDated = i;
    if (t >= window.startedAt && t <= window.endedAt) return i;
    if (t > window.endedAt) preceding = i;
  }

  return preceding ?? firstDated;
};

/**
 * Sorts images oldest first by capture time. Images with no timestamp go last,
 * keeping the order they came in.
 */
export const orderImagesByTime = (images: Image[]): Image[] =>
  images
    .map((image, order) => ({ image, order }))
    .sort((a, b) => {
      const at = a.image.takenAt;
      const bt = b.image.takenAt;
      if (at == null || bt == null) {
        if (at !== bt) return at == null ? 1 : -1;
        return a.order - b.order;
      }
      return at - bt || a.order - b.order;
    })
    .map((r) => r.image);

/** Returns the first coordinate of a route's first line, or null if it has none. */
export const getRouteStart = (fc: FeatureCollection): [number, number] | null => {
  for (const f of fc.features) {
    if (f.geometry.type === 'LineString' && f.geometry.coordinates.length > 0) {
      return f.geometry.coordinates[0] as [number, number];
    }
    if (f.geometry.type === 'MultiLineString' && f.geometry.coordinates[0]?.length > 0) {
      return f.geometry.coordinates[0][0] as [number, number];
    }
  }
  return null;
};
