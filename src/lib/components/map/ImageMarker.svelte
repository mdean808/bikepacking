<script lang="ts">
  import { Marker } from 'svelte-maplibre-gl';
  import type { Image } from './types.js';

  interface Props {
    image: Image;
    onselect?: (image: Image) => void;
    onhover?: () => void;
    onleave?: () => void;
  }

  let { image, onselect, onhover, onleave }: Props = $props();
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
      class="w-10 h-10 hover:w-15 hover:h-15 transition-all p-1 rounded-2xl bg-neutral-100"
    >
      <img
        class="aspect-square object-cover object-center rounded-2xl w-full h-full"
        src={image.thumbnail}
        alt={image.description}
      />
    </button>
  {/snippet}
</Marker>
