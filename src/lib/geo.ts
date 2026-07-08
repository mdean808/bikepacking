import { bbox } from '@turf/bbox';
import { center } from '@turf/center';
import type { FeatureCollection, GeoJSON } from 'geojson';

export const DAY_COLORS = [
  '#E63946', // red
  '#F3722C', // orange
  '#F9C74F', // gold
  '#43AA8B', // teal green
  '#4361EE', // blue
  '#7209B7', // purple
  '#F72585' // pink/magenta
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
