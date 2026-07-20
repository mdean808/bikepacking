import type { FeatureCollection } from 'geojson';

// Client-safe half of the trip data: types plus the hand-authored metadata.
// Deliberately free of GPX loading and xmldom — see trip.server.ts. Anything
// importing this from a universal module (a component, a +page.ts) must stay
// cheap, because it lands in the client bundle.

export type DayMeta = {
  title: string;
  description: string;
};

export type Day = DayMeta & {
  geoJSON: FeatureCollection;
};

export type TripMeta = {
  name: string;
  description: string;
  date: Date;
  album: string;
  /** Folder under src/lib/assets/gpx/ holding this trip's day_N.gpx files. */
  folder: string;
  days: DayMeta[];
};

/** A TripMeta with its GPX parsed. Only trip.server.ts can produce one. */
export type Trip = Omit<TripMeta, 'days'> & { days: Day[] };

export const TRIPS: TripMeta[] = [
  {
    name: 'Haida Gwaii',
    description: 'Bikepacking trip to haida gwaii',
    date: new Date('2025-07-01'),
    album: '208dc9a4-e56a-4d97-b927-e661a0e1390e',
    folder: 'haida_gwaii',
    days: [
      { title: 'Day 1', description: 'Add a description for this day.' },
      { title: 'Day 2', description: 'Add a description for this day.' },
      { title: 'Day 3', description: 'Add a description for this day.' },
      { title: 'Day 4', description: 'Add a description for this day.' }
    ]
  }
];
