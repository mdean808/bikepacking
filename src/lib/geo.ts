import { bbox } from '@turf/bbox';
import type { FeatureCollection } from 'geojson';
import type { Image } from '$lib/components/map/types';

// Ordered so consecutive days never share a hue family — each neighbouring pair
// is at least ~75° apart on the colour wheel, which keeps adjacent routes legible.
export const DAY_COLORS = [
  '#F3722C', // orange
  '#4361EE', // blue
  '#E63946', // red
  '#43AA8B', // teal green
  '#F72585', // pink/magenta
  '#F9C74F', // gold
  '#7209B7' // purple
];

// Days cycle back through the palette once a trip runs longer than DAY_COLORS.
export const dayColor = (i: number): string => DAY_COLORS[i % DAY_COLORS.length];

// [minX, minY, maxX, maxY] for a collection, or null when there is nothing to
// fit — @turf/bbox returns Infinities on an empty FeatureCollection, which
// maplibre's fitBounds cannot consume.
export const routeBounds = (fc: FeatureCollection): [number, number, number, number] | null =>
  fc.features.length ? (bbox(fc) as [number, number, number, number]) : null;

// Days often share long stretches of road, where identical lines would draw on
// top of each other and only the last day would be visible. Fan them out around
// the centre of the stack — with 4 days the offsets run -3, -1, 1, 3 — so every
// day stays individually clickable. Units are DayRoute's line-offset pixels.
export const dayLineOffset = (i: number, total: number): number => (i - (total - 1) / 2) * 2;

// Order images the way the trip was actually lived: earliest capture first.
// Photos with no usable timestamp keep their original relative order and sink to
// the end, so they stay reachable in the lightbox without interleaving noise into
// the dated sequence.
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

// First coordinate of the first (multi)line in a collection — the route's start point.
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
