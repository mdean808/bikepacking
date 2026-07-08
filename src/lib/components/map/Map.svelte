<script lang="ts">
  import { MapLibre } from 'svelte-maplibre-gl';
  import type * as maplibregl from 'maplibre-gl';
  import type { Snippet } from 'svelte';

  interface Props {
    map?: maplibregl.Map;
    cursor?: string;
    /** [minX, minY, maxX, maxY] — the map fits to this whenever it changes. */
    bounds?: [number, number, number, number] | null;
    style?: string;
    class?: string;
    children?: Snippet;
  }

  let {
    map = $bindable(),
    cursor = $bindable(''),
    bounds = null,
    style = 'https://api.jawg.io/styles/jawg-streets.json?access-token=Ii5PqKu9fD0APrg6DdjWKA9WRj9LAw6I4G4MtxzWSW0u8au1nrLDvwc4ekYMZ3Dc',
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
      return () => map!.off('load', doFit);
    }
  });
</script>

<MapLibre bind:map {cursor} class={className} {style}>
  {@render children?.()}
</MapLibre>
