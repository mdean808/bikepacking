<script lang="ts">
  import { Marker } from 'svelte-maplibre-gl';
  import type { Image } from './types.js';

  interface Props {
    image: Image;
    onselect?: (image: Image) => void;
  }

  let { image, onselect }: Props = $props();
</script>

<Marker lnglat={image.loc}>
  {#snippet content()}
    <button
      onclick={() => onselect?.(image)}
      title={image.title}
      class="w-10 h-10 hover:w-15 hover:h-15 transition-all p-1 rounded-lg bg-neutral-100"
    >
      <img
        class="aspect-square object-cover object-center w-full h-full"
        src={image.url}
        alt={image.title}
      />
    </button>
  {/snippet}
</Marker>
