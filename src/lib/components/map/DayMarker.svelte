<script lang="ts">
  import { Marker } from 'svelte-maplibre-gl';
  import type * as maplibregl from 'maplibre-gl';

  interface Props {
    lnglat: maplibregl.LngLatLike;
    index: number;
    color: string;
    onhover?: (index: number) => void;
    onleave?: () => void;
    onselect?: (index: number) => void;
  }

  let { lnglat, index, color, onhover, onleave, onselect }: Props = $props();
</script>

<Marker {lnglat}>
  {#snippet content()}
    <button
      class="flex h-7 w-7 cursor-pointer items-center justify-center rounded-full border-2 bg-white text-xs font-bold text-gray-700 shadow-sm transition-transform hover:scale-125"
      style="border-color: {color}"
      onmouseenter={() => onhover?.(index)}
      onmouseleave={() => onleave?.()}
      onclick={() => onselect?.(index)}
    >
      {index + 1}
    </button>
  {/snippet}
</Marker>
