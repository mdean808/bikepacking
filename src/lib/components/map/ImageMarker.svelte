<script lang="ts">
  import { Marker } from 'svelte-maplibre-gl';
  import type { Image } from './types.js';

  interface Props {
    image: Image;
    /** When a route is hovered, fade image markers back so the route reads on top. */
    dimmed?: boolean;
    onselect?: (image: Image) => void;
    onhover?: () => void;
    onleave?: () => void;
  }

  let { image, dimmed = false, onselect, onhover, onleave }: Props = $props();
</script>

<Marker lnglat={image.loc}>
  {#snippet content()}
    <button
      onclick={(e) => {
        e.stopPropagation();
        onselect?.(image);
      }}
      onmouseenter={() => onhover?.()}
      onmouseleave={() => onleave?.()}
      title={image.description}
      class="w-10 h-10 hover:w-15 hover:h-15 transition-all p-0.5 rounded-full bg-white shadow-md ring-1 ring-black/10"
      class:opacity-0={dimmed}
      class:pointer-events-none={dimmed}
    >
      <img
        class="aspect-square object-cover object-center rounded-full w-full h-full"
        src={image.thumbnail}
        alt={image.description}
      />
    </button>
  {/snippet}
</Marker>
