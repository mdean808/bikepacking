<script lang="ts">
  import { Marker } from 'svelte-maplibre-gl';
  import type * as maplibregl from 'maplibre-gl';

  interface Props {
    lnglat: maplibregl.LngLatLike;
    index: number;
    color: string;
    name?: string;
    /**
     * Set false on a map nothing can be pointed at, such as a card's still map.
     * The marker becomes a label: no hover pill, and nothing for Tab to land on.
     */
    interactive?: boolean;
    onhover?: (index: number) => void;
    onleave?: () => void;
    onselect?: (index: number) => void;
  }

  let {
    lnglat,
    index,
    color,
    name,
    interactive = true,
    onhover,
    onleave,
    onselect
  }: Props = $props();

  const dot =
    'flex h-7 w-7 items-center justify-center rounded-full border-2 bg-white text-xs font-bold text-gray-700 shadow-sm';
</script>

<!-- Above every photo marker, so a day's start is never buried under photos. -->
<Marker class="z-30" {lnglat}>
  {#snippet content()}
    <div class="group relative">
      {#if !interactive}
        <div
          class="{dot} animate-in fade-in zoom-in duration-300 motion-reduce:animate-none"
          style="border-color: {color}"
        >
          {index + 1}
        </div>
      {:else}
        <button
          class="{dot} relative z-10 cursor-pointer transition-transform group-hover:scale-110"
          style="border-color: {color}"
          onmouseenter={() => onhover?.(index)}
          onmouseleave={() => onleave?.()}
          onclick={() => onselect?.(index)}
        >
          {index + 1}
        </button>
      {/if}

      {#if name && interactive}
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
