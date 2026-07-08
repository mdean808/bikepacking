import { bbox } from '@turf/bbox';
import { center } from '@turf/center';
import type { FeatureCollection, GeoJSON } from 'geojson';

export const DAY_COLORS = [
  '#e63946',
  '#2a9d8f',
  '#f72585',
  '#c0ca33',
  '#264653',
  '#6a4c93',
  '#1982c4'
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

export const getGeoCenter = (geoJson: GeoJSON) => {
  // bbox center — [lng, lat]
  const [minX, minY, maxX, maxY] = bbox(geoJson);
  const bboxCenter: [number, number] = [(minX + maxX) / 2, (minY + maxY) / 2];

  // or geometric centroid
  const centroidPoint = center(geoJson).geometry.coordinates as [number, number];
};
