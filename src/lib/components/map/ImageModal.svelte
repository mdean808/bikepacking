<script lang="ts">
  import panzoom from 'panzoom';
  import type { PanZoom } from 'panzoom';
  import { ChevronLeft, ChevronRight } from '@lucide/svelte';
  import Modal from './Modal.svelte';
  import type { Image } from './types.js';

  interface Props {
    open?: boolean;
    /** Full trip sequence, day-ordered along each route. */
    images: Image[];
    /** Index into `images` of the photo currently shown. */
    index?: number;
  }

  let { open = $bindable(false), images, index = $bindable(0) }: Props = $props();

  const image = $derived(images[index] ?? ({} as Image));
  const hasPrev = $derived(index > 0);
  const hasNext = $derived(index < images.length - 1);
  const prev = () => {
    if (hasPrev) index -= 1;
  };
  const next = () => {
    if (hasNext) index += 1;
  };

  // Arrow keys page through the sequence while the modal is open. Escape/close is
  // handled by Modal; panzoom only listens for wheel/drag, so there's no conflict.
  const onKeydown = (e: KeyboardEvent) => {
    if (!open) return;
    if (e.key === 'ArrowLeft') {
      e.preventDefault();
      prev();
    } else if (e.key === 'ArrowRight') {
      e.preventDefault();
      next();
    }
  };

  const isVideo = $derived(image.type === 'video');

  // Reset the loading state whenever a different image is opened so the spinner
  // shows again instead of flashing the previous photo.
  let loaded = $state(false);
  $effect(() => {
    image.fullsize;
    loaded = false;
  });

  let imgEl: HTMLImageElement | undefined = $state();
  let pz: PanZoom | undefined;

  // Attach panzoom to the image element once it mounts; tear it down on unmount.
  // Videos render a <video> instead, so imgEl stays undefined and this is a no-op.
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
    image.fullsize;
    pz?.moveTo(0, 0);
    pz?.zoomAbs(0, 0, 1);
  });
</script>

<svelte:window onkeydown={onKeydown} />

<Modal bind:open>
  <div class="flex h-full flex-col gap-4">
    <div
      class="relative min-h-0 flex-1 overflow-hidden rounded-2xl bg-neutral-100"
      class:cursor-grab={!isVideo}
      class:active:cursor-grabbing={!isVideo}
    >
      {#if !loaded}
        <div class="absolute inset-0 flex items-center justify-center">
          <div
            class="h-8 w-8 animate-spin rounded-full border-2 border-neutral-300 border-t-neutral-600"
          ></div>
        </div>
      {/if}
      {#if isVideo}
        <!-- svelte-ignore a11y_media_has_caption -->
        <video
          src={image.video}
          poster={image.preview}
          controls
          autoplay
          playsinline
          onloadeddata={() => (loaded = true)}
          class="h-full w-full object-contain transition-opacity duration-300"
          class:opacity-0={!loaded}
        ></video>
      {:else}
        <img
          bind:this={imgEl}
          src={image.fullsize}
          alt={image.description || 'Trip photo'}
          onload={() => (loaded = true)}
          class="h-full w-full object-contain transition-opacity duration-300"
          class:opacity-0={!loaded}
        />
      {/if}

      {#if hasPrev}
        <button
          onclick={prev}
          aria-label="Previous photo"
          class="absolute left-3 top-1/2 z-10 flex h-10 w-10 -translate-y-1/2 items-center justify-center rounded-full bg-black/40 text-white backdrop-blur-sm transition hover:bg-black/60"
        >
          <ChevronLeft size={24} />
        </button>
      {/if}
      {#if hasNext}
        <button
          onclick={next}
          aria-label="Next photo"
          class="absolute right-3 top-1/2 z-10 flex h-10 w-10 -translate-y-1/2 items-center justify-center rounded-full bg-black/40 text-white backdrop-blur-sm transition hover:bg-black/60"
        >
          <ChevronRight size={24} />
        </button>
      {/if}
    </div>

    <div class="flex items-start justify-between gap-4">
      {#if image.description}
        <p class="text-sm leading-relaxed text-gray-700">{image.description}</p>
      {/if}
      {#if images.length > 1}
        <span class="shrink-0 text-sm tabular-nums text-gray-400">
          {index + 1} / {images.length}
        </span>
      {/if}
    </div>
  </div>
</Modal>
