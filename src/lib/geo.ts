import type { FeatureCollection, Position } from 'geojson';
import type { Day } from '$lib/trip';
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

// Normalise maplibre's LngLatLike (object or [lng, lat] tuple) to a [lng, lat] pair.
const toLngLat = (loc: Image['loc']): [number, number] | null => {
  if (Array.isArray(loc)) return [loc[0], loc[1]];
  if (loc && typeof loc === 'object' && 'lng' in loc && 'lat' in loc) {
    return [(loc as { lng: number }).lng, (loc as { lat: number }).lat];
  }
  return null;
};

const isValidLngLat = (c: [number, number] | null): c is [number, number] =>
  c !== null && c[0] !== -1 && c[1] !== -1 && Number.isFinite(c[0]) && Number.isFinite(c[1]);

// Max vertices we sample from a day's track for photo matching. GPX days run to
// tens of thousands of points; projecting every photo against every raw point on
// the main thread freezes first paint. A few hundred evenly-spaced vertices are
// plenty to answer "which day, and roughly how far along" for ordering purposes.
const TRACK_SAMPLES = 400;

// Flatten a day's (Multi)LineString features to a single evenly-downsampled list
// of [lng, lat] vertices. `along` is just the vertex's running index, which is a
// fine monotonic proxy for distance travelled along the day's route.
const sampleDayTrack = (day: Day): [number, number][] => {
  const coords: [number, number][] = [];
  for (const f of day.geoJSON.features) {
    const g = f.geometry;
    if (g.type === 'LineString') {
      for (const p of g.coordinates as Position[]) coords.push([p[0], p[1]]);
    } else if (g.type === 'MultiLineString') {
      for (const line of g.coordinates as Position[][])
        for (const p of line) coords.push([p[0], p[1]]);
    }
  }
  if (coords.length <= TRACK_SAMPLES) return coords;
  const step = coords.length / TRACK_SAMPLES;
  const sampled: [number, number][] = [];
  for (let i = 0; i < TRACK_SAMPLES; i++) sampled.push(coords[Math.floor(i * step)]);
  return sampled;
};

// Squared planar distance — we only compare magnitudes, so no need for haversine
// or a sqrt. Over a single trip's extent the lng/lat distortion is negligible.
const sqDist = (a: [number, number], b: [number, number]): number => {
  const dx = a[0] - b[0];
  const dy = a[1] - b[1];
  return dx * dx + dy * dy;
};

// Order images as if travelling the trip: grouped by the day whose track runs
// nearest to the photo, then by how far along that day's track the nearest vertex
// sits. Photos with no usable geotag keep their original order and sink to the end.
// Matching is a cheap nearest-vertex scan over each day's downsampled track (see
// sampleDayTrack), so this stays fast even with large GPX files and many photos.
export const orderImagesAlongRoute = (images: Image[], days: Day[]): Image[] => {
  const dayTracks = days.map(sampleDayTrack);

  type Ranked = { image: Image; dayIndex: number; along: number; order: number };

  const ranked: Ranked[] = images.map((image, order) => {
    const coord = toLngLat(image.loc);
    if (!isValidLngLat(coord)) {
      return { image, dayIndex: days.length, along: 0, order };
    }

    let best = { dayIndex: days.length, dist: Infinity, along: 0 };
    for (let dayIndex = 0; dayIndex < dayTracks.length; dayIndex++) {
      const track = dayTracks[dayIndex];
      for (let i = 0; i < track.length; i++) {
        const d = sqDist(track[i], coord);
        if (d < best.dist) best = { dayIndex, dist: d, along: i };
      }
    }

    return { image, dayIndex: best.dayIndex, along: best.along, order };
  });

  return ranked
    .slice()
    .sort((a, b) => {
      if (a.dayIndex !== b.dayIndex) return a.dayIndex - b.dayIndex;
      if (a.along !== b.along) return a.along - b.along;
      return a.order - b.order;
    })
    .map((r) => r.image);
};

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
