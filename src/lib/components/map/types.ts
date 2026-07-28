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

/**
 * A map cluster, or a photo nothing merged with, as the elevation profile draws
 * it. The profile has only a distance axis, so a cluster whose photos are close
 * on the map but far apart along the route becomes a span rather than a point.
 */
export interface ProfileCluster {
  key: string;
  color: string;
  /** Where the marker sits: the median distance of the photos it stands for. */
  distanceKm: number;
  /** The range those photos cover. Equal to `distanceKm` for a lone photo. */
  fromKm: number;
  toKm: number;
  count: number;
  thumbnail: string;
  /** Zooms the map to the cluster, or opens a lone photo, matching its marker. */
  onselect: () => void;
}

/** Where a photo sits along the route, as returned by anchorOnRoute in elevation.ts. */
export interface PhotoAnchor {
  image: Image;
  dayIndex: number;
  distanceKm: number;
  elevationM: number;
  offRouteKm: number;
}
