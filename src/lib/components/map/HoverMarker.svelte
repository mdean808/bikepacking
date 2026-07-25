<script lang="ts">
  import { Marker } from 'svelte-maplibre-gl';
  import type * as maplibregl from 'maplibre-gl';

  interface Props {
    lnglat: maplibregl.LngLatLike;
    color: string;
  }

  let { lnglat, color }: Props = $props();
</script>

<!-- The dot ignores pointer events so it can't take hover from the route under it. -->
<Marker {lnglat} class="z-20">
  {#snippet content()}
    <div
      class="pointer-events-none h-4 w-4 rounded-full border-2 border-white shadow-md ring-2 ring-black/25"
      style="background-color: {color}"
    ></div>
  {/snippet}
</Marker>
