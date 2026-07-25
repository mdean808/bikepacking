<script lang="ts">
  import panzoom from 'panzoom';
  import type { PanZoom } from 'panzoom';
  import { ChevronLeft, ChevronRight } from '@lucide/svelte';
  import * as Dialog from '$lib/components/ui/dialog/index.js';
  import type { Image } from './types';

  interface Props {
    open?: boolean;
    /** Full trip sequence, day-ordered along each route. */
    images: Image[];
    /** Index into `images` of the photo currently shown. */
    index?: number;
  }

  let { open = $bindable(false), images, index = $bindable(0) }: Props = $props();

  const image = $derived(images[index]);
  const hasPrev = $derived(index > 0);
  const hasNext = $derived(index < images.length - 1);
  const prev = () => {
    if (hasPrev) index -= 1;
  };
  const next = () => {
    if (hasNext) index += 1;
  };

  // Arrow keys page through the sequence while the modal is open. panzoom only
  // listens for wheel/drag, so there's no conflict.
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

  const isVideo = $derived(image?.type === 'video');

  let loaded = $state(false);
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

  // One reset per newly-shown asset: re-arm the spinner so it shows again rather
  // than flashing the previous photo, and drop pan/zoom back to identity.
  // Depends on `image` itself, so it also fires when the underlying list changes
  // (switching trips) without the index having moved.
  $effect(() => {
    image;
    loaded = false;
    pz?.moveTo(0, 0);
    pz?.zoomAbs(0, 0, 1);
  });
</script>

<svelte:window onkeydown={onKeydown} />

{#snippet navButton(dir: 'prev' | 'next')}
  {@const isPrev = dir === 'prev'}
  <!-- These live outside the panzoom viewport (see markup below) so their events
       never reach panzoom's listeners by bubbling. stopPropagation is kept as a
       second line of defence for the modal chrome above them. -->
  <button
    onclick={(e) => {
      e.stopPropagation();
      (isPrev ? prev : next)();
    }}
    ondblclick={(e) => e.stopPropagation()}
    onmousedown={(e) => e.stopPropagation()}
    aria-label={isPrev ? 'Previous photo' : 'Next photo'}
    class="absolute top-1/2 z-10 flex h-10 w-10 -translate-y-1/2 items-center justify-center rounded-full bg-black/40 text-white backdrop-blur-sm transition hover:bg-black/60 {isPrev
      ? 'left-3'
      : 'right-3'}"
  >
    {#if isPrev}
      <ChevronLeft size={24} />
    {:else}
      <ChevronRight size={24} />
    {/if}
  </button>
{/snippet}

<Dialog.Root bind:open>
  <Dialog.Content>
    <!-- Accessible name only; the visible counter lives with the caption below. -->
    <Dialog.Title class="sr-only">Photo {index + 1} of {images.length}</Dialog.Title>
    {#if image}
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
          <!-- panzoom takes the image's *parent* as its owner and binds dblclick,
               mousedown and wheel there. Giving the media its own wrapper keeps that
               owner free of the nav buttons: a double-click on a chevron can never
               reach it, even on the click that unmounts the button at either end of
               the sequence (where a dblclick would otherwise retarget to whatever
               ancestor the two clicks share). -->
          <div class="absolute inset-0 overflow-hidden">
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
          </div>

          {#if hasPrev}{@render navButton('prev')}{/if}
          {#if hasNext}{@render navButton('next')}{/if}
        </div>

        <!-- Caption (the asset's Immich description) stacks above the counter, so a
             photo with no description just shows the count. -->
        <div class="flex flex-col gap-1">
          {#if image.description}
            <p class="text-sm leading-relaxed text-gray-700">{image.description}</p>
          {/if}
          {#if images.length > 1}
            <span class="shrink-0 self-end text-sm tabular-nums text-gray-400">
              {index + 1} / {images.length}
            </span>
          {/if}
        </div>
      </div>
    {/if}
  </Dialog.Content>
</Dialog.Root>
