import { bbox } from '@turf/bbox';
import type { FeatureCollection } from 'geojson';
import type { Image } from '$lib/components/map/types';

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
