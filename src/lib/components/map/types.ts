export interface Image {
  description: string;
  /** Geotag read from EXIF. */
  loc: { lng: number; lat: number } | null;
  /** Capture time, in epoch milliseconds. */
  takenAt: number | null;
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
