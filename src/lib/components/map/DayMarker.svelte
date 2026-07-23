<script lang="ts">
  import { Marker } from 'svelte-maplibre-gl';
  import type * as maplibregl from 'maplibre-gl';

  interface Props {
    lnglat: maplibregl.LngLatLike;
    index: number;
    color: string;
    /** The day's title, revealed in the pill that slides out on hover. */
    name?: string;
    onhover?: (index: number) => void;
    onleave?: () => void;
    onselect?: (index: number) => void;
  }

  let { lnglat, index, color, name, onhover, onleave, onselect }: Props = $props();
</script>

<Marker {lnglat}>
  {#snippet content()}
    <!-- The circle is the marker's layout box, so maplibre keeps it pinned on the
         coordinate. The name pill is absolutely positioned off its right edge and
         so never shifts the anchor as it expands. -->
    <div class="group relative">
      <button
        class="relative z-10 flex h-7 w-7 cursor-pointer items-center justify-center rounded-full border-2 bg-white text-xs font-bold text-gray-700 shadow-sm transition-transform group-hover:scale-110"
        style="border-color: {color}"
        onmouseenter={() => onhover?.(index)}
        onmouseleave={() => onleave?.()}
        onclick={() => onselect?.(index)}
      >
        {index + 1}
      </button>

      {#if name}
        <div
          class="pointer-events-none absolute top-1/2 left-full ml-1 flex max-w-0 -translate-y-1/2 items-center overflow-hidden opacity-0 transition-all duration-300 ease-out group-hover:max-w-sm group-hover:opacity-100"
        >
          <span
            class="block h-7 rounded-full border-2 bg-white px-3 text-xs font-semibold whitespace-nowrap text-gray-800 shadow-sm"
            style="border-color: {color}; line-height: 1.55rem"
          >
            {name}
          </span>
        </div>
      {/if}
    </div>
  {/snippet}
</Marker>
