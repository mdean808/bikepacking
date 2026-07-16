import { bbox } from '@turf/bbox';
import { center } from '@turf/center';
import type { FeatureCollection, GeoJSON } from 'geojson';

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
