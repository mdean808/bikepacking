<script lang="ts">
  import { Marker } from 'svelte-maplibre-gl';
  import type { Image } from './types';

  interface Props {
    image: Image;
    /** Where to place the marker. Passed separately because Image['loc'] is
     * nullable and the caller has already established this one is not. */
    loc: { lng: number; lat: number };
    /** When a route is hovered, hide image markers so the route reads on top. */
    dimmed?: boolean;
    onselect?: (image: Image) => void;
    onhover?: () => void;
    onleave?: () => void;
  }

  let { image, loc, dimmed = false, onselect, onhover, onleave }: Props = $props();
</script>

<Marker lnglat={loc}>
  {#snippet content()}
    <button
      onclick={(e) => {
        e.stopPropagation();
        onselect?.(image);
      }}
      onmouseenter={() => onhover?.()}
      onmouseleave={() => onleave?.()}
      title={image.description}
      class="relative w-10 h-10 hover:w-15 hover:h-15 transition-all p-0.5 rounded-full bg-white shadow-md ring-1 ring-black/10"
      class:opacity-0={dimmed}
      class:pointer-events-none={dimmed}
    >
      <img
        class="aspect-square object-cover object-center rounded-full w-full h-full"
        src={image.thumbnail}
        alt={image.description}
      />
      {#if image.type === 'video'}
        <span
          class="absolute inset-0 flex items-center justify-center text-white drop-shadow"
          aria-hidden="true"
        >
          <svg class="w-1/3 h-1/3" viewBox="0 0 24 24" fill="currentColor">
            <path d="M8 5v14l11-7z" />
          </svg>
        </span>
      {/if}
    </button>
  {/snippet}
</Marker>
