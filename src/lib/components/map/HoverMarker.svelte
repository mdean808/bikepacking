<script lang="ts">
  import { Marker } from 'svelte-maplibre-gl';
  import type * as maplibregl from 'maplibre-gl';

  // The dot the map shows at the currently hovered distance along the route.
  // pointer-events are off so it never steals hover from the route beneath it,
  // which would otherwise flip the hover source back to the map in a loop.
  interface Props {
    lnglat: maplibregl.LngLatLike;
    color: string;
  }

  let { lnglat, color }: Props = $props();
</script>

<!-- z-20 keeps the dot above the photo markers so it's always findable. -->
<Marker {lnglat} class="z-20">
  {#snippet content()}
    <div
      class="pointer-events-none h-4 w-4 rounded-full border-2 border-white shadow-md ring-2 ring-black/25"
      style="background-color: {color}"
    ></div>
  {/snippet}
</Marker>
