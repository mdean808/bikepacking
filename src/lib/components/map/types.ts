import type * as maplibregl from 'maplibre-gl';

export interface Image {
  description: string;
  loc: maplibregl.LngLatLike;
  type: 'image' | 'video';
  thumbnail: string;
  original: string;
  preview: string;
  fullsize: string;
  /** Playback URL, only set for videos. */
  video?: string;
}
