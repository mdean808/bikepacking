<script lang="ts">
  import panzoom from 'panzoom';
  import type { PanZoom } from 'panzoom';
  import Modal from './Modal.svelte';
  import type { Image } from './types.js';

  interface Props {
    open?: boolean;
    image: Image;
  }

  let { open = $bindable(false), image }: Props = $props();

  // Reset the loading state whenever a different image is opened so the spinner
  // shows again instead of flashing the previous photo.
  let loaded = $state(false);
  $effect(() => {
    image.preview;
    loaded = false;
  });

  let imgEl: HTMLImageElement | undefined = $state();
  let pz: PanZoom | undefined;

  // Attach panzoom to the image element once it mounts; tear it down on unmount.
  $effect(() => {
    if (!imgEl) return;
    pz = panzoom(imgEl, {
      maxZoom: 8,
      minZoom: 1,
      bounds: true,
      boundsPadding: 1,
      // Let normal wheel scroll through unless zooming is intended.
      zoomDoubleClickSpeed: 1.5
    });
    return () => {
      pz?.dispose();
      pz = undefined;
    };
  });

  // Reset pan/zoom to the identity transform whenever a new image is shown.
  $effect(() => {
    image.preview;
    pz?.moveTo(0, 0);
    pz?.zoomAbs(0, 0, 1);
  });
</script>

<Modal bind:open>
  <div class="flex h-full flex-col gap-4">
    <div
      class="relative min-h-0 flex-1 cursor-grab overflow-hidden rounded-2xl bg-neutral-100 active:cursor-grabbing"
    >
      {#if !loaded}
        <div class="absolute inset-0 flex items-center justify-center">
          <div
            class="h-8 w-8 animate-spin rounded-full border-2 border-neutral-300 border-t-neutral-600"
          ></div>
        </div>
      {/if}
      <img
        bind:this={imgEl}
        src={image.preview}
        alt={image.description || 'Trip photo'}
        onload={() => (loaded = true)}
        class="h-full w-full object-contain transition-opacity duration-300"
        class:opacity-0={!loaded}
      />
    </div>

    <div class="flex items-start justify-between gap-4">
      {#if image.description}
        <p class="text-sm leading-relaxed text-gray-700">{image.description}</p>
      {/if}
    </div>
  </div>
</Modal>
