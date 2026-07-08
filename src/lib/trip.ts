import { gpx } from '@tmcw/togeojson';
import { DOMParser } from '@xmldom/xmldom';
import type { FeatureCollection } from 'geojson';

// Eagerly load every GPX file as raw text, keyed by its path
const gpxFiles = import.meta.glob('$lib/assets/gpx/**/*.gpx', {
  query: '?raw',
  import: 'default',
  eager: true
}) as Record<string, string>;

const toGeoJSON = (raw: string): FeatureCollection =>
  gpx(new DOMParser().parseFromString(raw, 'text/xml'));

// All GeoJSON for one trip folder, ordered day_1, day_2, … day_10
const trip = (folder: string): FeatureCollection[] =>
  Object.entries(gpxFiles)
    .filter(([path]) => path.includes(`/gpx/${folder}/`))
    .sort(([a], [b]) => a.localeCompare(b, undefined, { numeric: true }))
    .map(([, raw]) => toGeoJSON(raw));

export const TRIPS = [
  {
    name: 'Haida Gwaii',
    description: 'Bikepacking trip to haida gwaii',
    date: new Date('2025-07-01'),
    album: '9b266407-0fb9-43af-9c49-ae67c3aaeea8',
    geoJSON: trip('haida_gwaii')
  }
];
