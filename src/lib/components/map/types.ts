import type * as maplibregl from 'maplibre-gl';

export interface Image {
  description: string;
  loc: maplibregl.LngLatLike;
  thumbnail: string;
  original: string;
  preview: string;
}
