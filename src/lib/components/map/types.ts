export interface Image {
  description: string;
  loc: { lng: number; lat: number } | null;
  takenAt: number | null; // in epoch milliseconds
  type: 'image' | 'video';
  thumbnail: string;
  preview: string;
  fullsize: string;
  video?: string;
}

/** Where a photo sits along the route, as returned by anchorOnRoute in elevation.ts. */
export interface PhotoAnchor {
  image: Image;
  dayIndex: number;
  distanceKm: number;
  elevationM: number;
  offRouteKm: number;
}
