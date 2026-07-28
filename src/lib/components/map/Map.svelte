<script lang="ts">
  import { MapLibre } from 'svelte-maplibre-gl';
  import * as maplibregl from 'maplibre-gl';
  import type { Snippet } from 'svelte';

  interface Props {
    cursor?: string;
    /** Fits the camera to this box. Leave unset to hold `center` and `zoom` instead. */
    bounds?: [number, number, number, number] | null;
    center?: maplibregl.LngLatLike;
    zoom?: number;
    /** Collapses the attribution to a single button, for maps with no room for it. */
    compactAttribution?: boolean;
    /** Set false for a still map: no pan, zoom, rotate or keyboard handlers. */
    interactive?: boolean;
    /** Space left between the fitted route and the map's edges, in px. */
    fitPadding?: number;
    /** How far `bounds` may zoom in, so a short route doesn't fill the screen. */
    fitMaxZoom?: number;
    map?: maplibregl.Map;
    children?: Snippet;
  }

  // lyrs=y is Google's hybrid layer: satellite imagery with roads and labels baked
  // in. Based on https://madewithmaplibre.com/basemaps/styles/google-satellite.
  const satelliteWithRoads: maplibregl.StyleSpecification = {
    version: 8,
    sources: {
      'google-hybrid': {
        type: 'raster',
        tiles: ['https://mt1.google.com/vt/lyrs=y&x={x}&y={y}&z={z}'],
        tileSize: 256,
        attribution: '© Google'
      }
    },
    layers: [{ id: 'google-hybrid', type: 'raster', source: 'google-hybrid' }]
  };

  let {
    cursor = '',
    bounds = null,
    center = { lng: -120, lat: 40 },
    zoom = 4,
    compactAttribution = false,
    interactive = true,
    fitPadding = 40,
    fitMaxZoom = 12,
    map = $bindable(),
    children
  }: Props = $props();

  $effect(() => {
    if (!map || !bounds) return;

    const doFit = () => {
      map!.fitBounds(bounds!, { padding: fitPadding, maxZoom: fitMaxZoom });
    };

    if (map.loaded()) {
      doFit();
    } else {
      map.once('load', doFit);
      return () => map?.off('load', doFit);
    }
  });
</script>

<MapLibre
  bind:map
  {cursor}
  {zoom}
  {center}
  {interactive}
  attributionControl={compactAttribution ? { compact: true } : undefined}
  class="h-full"
  style={satelliteWithRoads}
>
  {@render children?.()}
</MapLibre>
