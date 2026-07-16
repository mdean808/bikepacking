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

export type Day = {
  title: string;
  description: string;
  geoJSON: FeatureCollection;
};

export type Trip = {
  name: string;
  description: string;
  date: Date;
  album: string;
  days: Day[];
};

// Zip hand-authored day metadata with the GPX tracks loaded from the folder,
// matched by order (day_1 → meta[0], …). Missing metadata falls back to a
// generic title so an added GPX file never breaks the build.
const buildDays = (folder: string, meta: Omit<Day, 'geoJSON'>[]): Day[] =>
  trip(folder).map((geoJSON, i) => ({
    title: meta[i]?.title ?? `Day ${i + 1}`,
    description: meta[i]?.description ?? '',
    geoJSON
  }));

export const TRIPS: Trip[] = [
  {
    name: 'Haida Gwaii',
    description: 'Bikepacking trip to haida gwaii',
    date: new Date('2025-07-01'),
    album: '208dc9a4-e56a-4d97-b927-e661a0e1390e',
    days: buildDays('haida_gwaii', [
      { title: 'Day 1', description: 'Add a description for this day.' },
      { title: 'Day 2', description: 'Add a description for this day.' },
      { title: 'Day 3', description: 'Add a description for this day.' },
      { title: 'Day 4', description: 'Add a description for this day.' }
    ])
  }
];
