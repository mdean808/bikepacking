import type * as maplibregl from 'maplibre-gl';

export interface Image {
  loc: maplibregl.LngLatLike;
  url: string;
  title: string;
  description: string;
}
