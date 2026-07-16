<script lang="ts">
  import { MapLibre } from 'svelte-maplibre-gl';
  import type * as maplibregl from 'maplibre-gl';
  import type { Snippet } from 'svelte';

  interface Props {
    map?: maplibregl.Map;
    cursor?: string;
    /** [minX, minY, maxX, maxY] — the map fits to this whenever it changes. */
    bounds?: [number, number, number, number] | null;
    style?: string | maplibregl.StyleSpecification;
    class?: string;
    children?: Snippet;
  }

  // Google hybrid tiles: satellite imagery with roads and labels baked in.
  // Base https://madewithmaplibre.com/basemaps/styles/google-satellite with lyrs=y.
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
    map = $bindable(),
    cursor = $bindable(''),
    bounds = null,
    style = satelliteWithRoads,
    class: className = 'h-full',
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

<MapLibre bind:map {cursor} class={className} {style}>
  {@render children?.()}
</MapLibre>
