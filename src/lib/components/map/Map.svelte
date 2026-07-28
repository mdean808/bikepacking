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
    map = $bindable(),
    children
  }: Props = $props();

  $effect(() => {
    if (!map || !bounds) return;

    const doFit = () => {
      map!.fitBounds(bounds!, { padding: 40, maxZoom: 12 });
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
  attributionControl={compactAttribution ? { compact: true } : undefined}
  class="h-full"
  style={satelliteWithRoads}
>
  {@render children?.()}
</MapLibre>
