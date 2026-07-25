import type { FeatureCollection } from 'geojson';

export type DayMeta = {
  title: string;
  description: string;
};

export type Day = DayMeta & {
  geoJSON: FeatureCollection;
};

export type TripMeta = {
  name: string;
  slug: string;
  description: string;
  date: Date;
  album: string;
  gpx_folder: string;
  days: DayMeta[];
};

export type Trip = Omit<TripMeta, 'days'> & { days: Day[] };

export const TRIPS: TripMeta[] = [
  {
    name: 'Haida Gwaii',
    slug: 'haida-gwaii',
    description: 'Bikepacking trip to Haida Gwaii',
    date: new Date('2025-07-01'),
    album: '208dc9a4-e56a-4d97-b927-e661a0e1390e',
    gpx_folder: 'haida_gwaii',
    days: [
      {
        title: 'Day 1: Listening for the Rennell Sound',
        description:
          'Off the ferry at 6am, operating on a suspect four hours of sleep, four intrepid cyclists embark on a journey to find the Rennell Sound.'
      },
      {
        title: 'Day 2: Port Clements Clemency',
        description:
          "While they did not make the Canada game at 12pm, the team did ford the FSR's to arrive at the Port Clements bar at 7pm -- a full hour and a half before closing."
      },
      {
        title: 'Day 3: Tow Hill Soak',
        description:
          "After a hard wake-up and damp clean-up, our heroes tasted sweet, smooth pavement as they rode ever onward to the town of Masset for a taste of Haida culture and a resupply at a cafe. Unbenownst to them, the day's destination of Agate Beach Campground was behind a wall of rain and muddy gravel terrain."
      },
      {
        title: 'Day 4: A Dinner Date to Make',
        description:
          'Having enjoyed a warm, mouse-infested sleep in the pavilion, the group rallied to pedal at 6am, for they had a 130km day ahead. A hole in the house cafe and impeccable drafting got them back to Port Celements, where they found and chased the sun toward Tlell, and evntually the Coop in Skidagate, where they gathered groceries and arrived in Daajing Giids just in time to prepare a meal.'
      }
    ]
  },
  {
    name: 'Vancouver Island',
    slug: 'vancouver-island-24',
    description: 'Bikepacking trip on Vancouver Island',
    date: new Date('2024-09-01'),
    album: 'b8ebd30d-a640-4ea8-9a81-9d5875cf1120',
    gpx_folder: 'van_island_24',
    days: [
      { title: 'Day 1: More Ferry than Riding', description: '' },
      { title: 'Day 2: Cowichan Valley Detour', description: '' },
      { title: 'Day 3: Hills Pay the Bills!', description: '' },
      { title: 'Day 4: The Final Cream', description: '' }
    ]
  },
  {
    name: 'Seattle',
    slug: 'seattle',
    description: 'Bikepacking trip around Seattle',
    date: new Date('2026-04-03'),
    album: '8ed198c4-3b08-4f78-ba13-04b4531a02dc',
    gpx_folder: 'seattle',
    days: [
      { title: 'Day 1: Bad Day to be a Strava Goal', description: '' },
      { title: 'Day 2: Rail Trail Heaven', description: '' },
      { title: 'Day 3: Elevation Nation', description: '' },
      { title: 'Day 4: Early Bird Gets Abused for 13 hours Straight', description: '' }
    ]
  }
];
