<script lang="ts">
  import panzoom from 'panzoom';
  import type { PanZoom } from 'panzoom';
  import { MediaQuery } from 'svelte/reactivity';
  import { ChevronDown, ChevronLeft, ChevronRight, ChevronUp } from '@lucide/svelte';
  import * as Dialog from '$lib/components/ui/dialog/index.js';
  import { Button } from '$lib/components/ui/button/index.js';
  import type { Image } from './types';
  import type { Day } from '$lib/trips';
  import { dayColor, getRouteStart } from '$lib/geo';
  import Map from './Map.svelte';
  import DayRoute from './DayRoute.svelte';
  import DayMarker from './DayMarker.svelte';
  import ImageMarker from './ImageMarker.svelte';

  interface Props {
    open?: boolean;
    images: Image[]; // In capture-time order
    index?: number;
    /** The trip's days, so the mini map can draw the route the photo was taken on. */
    days?: Day[];
    /**
     * Which day each photo anchored to, as BikeMap worked it out. Typed as a
     * ReadonlyMap because the `Map` component import shadows the built-in here.
     */
    dayByImage?: ReadonlyMap<Image, number>;
  }

  let {
    open = $bindable(false),
    images,
    index = $bindable(0),
    days = [],
    dayByImage
  }: Props = $props();

  /** Diameter of the mini map's photo marker in px, against 40 on the main map. */
  const MINI_MARKER_PX = 26;
  /**
   * The zoom the mini map holds. Fixed rather than fitted to the day's route: the
   * map is here to say where one photo was taken, so it stays put on that photo
   * instead of framing the whole day.
   */
  const MINI_ZOOM = 13;

  /**
   * Above this the map is an overlay in the photo's corner; below it the photo
   * keeps its whole frame and the map goes underneath, reached by scrolling. Only
   * one of the two is ever mounted, so there is never a second map behind a
   * `hidden` class eating tiles.
   */
  const overlaid = new MediaQuery('(min-width: 1024px)');
  /** Height of the map once it is stacked below the photo. */
  const STACKED_MAP_H = 'h-64';
  /**
   * How far the dialog has to scroll before the "Map" hint is treated as read and
   * fades out. Low enough that any deliberate drag dismisses it.
   */
  const HINT_DISMISS_PX = 24;
  /** How short of the end still counts as the bottom, for the "Photo" hint. */
  const AT_BOTTOM_PX = 8;

  /** The nav buttons' own look, kept over the photo they sit on. */
  const NAV_ON_PHOTO =
    'border-transparent bg-black/40 text-white backdrop-blur-sm hover:bg-black/60 hover:text-white';

  const image = $derived(images[index]);
  const dayIndex = $derived(image ? (dayByImage?.get(image) ?? -1) : -1);
  const day = $derived(dayIndex >= 0 ? days[dayIndex] : undefined);
  const dayStart = $derived(day ? getRouteStart(day.geoJSON) : null);

  const hasPrev = $derived(index > 0);
  const hasNext = $derived(index < images.length - 1);
  const prev = () => {
    if (hasPrev) index -= 1;
  };
  const next = () => {
    if (hasNext) index += 1;
  };

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

  /** The dialog itself is the scroller the stacked map lives in. */
  let scrollEl: HTMLElement | null = $state(null);
  let scrolled = $state(false);
  let atBottom = $state(false);

  const scrollToBottom = () =>
    scrollEl?.scrollTo({ top: scrollEl.scrollHeight, behavior: 'smooth' });
  const scrollToTop = () => scrollEl?.scrollTo({ top: 0, behavior: 'smooth' });

  // Listener bound here rather than as an `onscroll` prop, which would have to
  // survive being forwarded through the dialog primitive.
  $effect(() => {
    const el = scrollEl;
    if (!el) return;
    const onScroll = () => {
      scrolled = el.scrollTop > HINT_DISMISS_PX;
      atBottom = el.scrollHeight - el.scrollTop - el.clientHeight <= AT_BOTTOM_PX;
    };
    el.addEventListener('scroll', onScroll, { passive: true });
    return () => el.removeEventListener('scroll', onScroll);
  });

  $effect(() => {
    if (!imgEl) return;
    pz = panzoom(imgEl, {
      maxZoom: 8,
      minZoom: 1,
      bounds: true,
      boundsPadding: 1,
      zoomDoubleClickSpeed: 1.5
    });
    return () => {
      pz?.dispose();
      pz = undefined;
    };
  });

  // Each open mounts a fresh dialog scrolled to the top, so the hint comes back.
  $effect(() => {
    if (open) {
      scrolled = false;
      atBottom = false;
    }
  });

  // Keyed on `image`, not `index`, so switching trips resets even when the index
  // stays the same.
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
  <!-- Positioning lives on the wrapper: the button's own `active:` nudge would
       otherwise fight the -translate-y-1/2 that centres it. -->
  <div class="absolute top-1/2 z-10 -translate-y-1/2 {isPrev ? 'left-3' : 'right-3'}">
    <Button
      variant="ghost"
      size="icon-lg"
      onclick={(e) => {
        e.stopPropagation();
        (isPrev ? prev : next)();
      }}
      ondblclick={(e) => e.stopPropagation()}
      onmousedown={(e) => e.stopPropagation()}
      aria-label={isPrev ? 'Previous photo' : 'Next photo'}
      class="{NAV_ON_PHOTO} rounded-full"
    >
      {#if isPrev}
        <ChevronLeft class="size-6" />
      {:else}
        <ChevronRight class="size-6" />
      {/if}
    </Button>
  </div>
{/snippet}

<!-- A scroll cue pinned to one end of the dialog. Faded rather than removed, so
     the pill does not pop the layout as it comes and goes. -->
{#snippet scrollHint(label: string, up: boolean, onclick: () => void, hidden: boolean, cls: string)}
  <div
    class="flex shrink-0 justify-center transition-opacity duration-200 {cls}"
    class:opacity-0={hidden}
    class:pointer-events-none={hidden}
  >
    <Button variant="ghost" size="sm" {onclick}>
      {label}
      {#if up}
        <ChevronUp class="animate-bounce" />
      {:else}
        <ChevronDown class="animate-bounce" />
      {/if}
    </Button>
  </div>
{/snippet}

{#snippet miniMap(loc: { lng: number; lat: number })}
  <Map center={loc} zoom={MINI_ZOOM} compactAttribution>
    {#if day}
      <!-- Only one day is drawn, so there is no neighbouring line to
           offset away from. -->
      <DayRoute data={day.geoJSON} index={dayIndex} color={dayColor(dayIndex)} offset={0} />
      {#if dayStart}
        <DayMarker
          lnglat={{ lng: dayStart[0], lat: dayStart[1] }}
          index={dayIndex}
          color={dayColor(dayIndex)}
          name={day.title}
        />
      {/if}
    {/if}
    <ImageMarker {image} {loc} size={MINI_MARKER_PX} shadow={false} />
  </Map>
{/snippet}

<Dialog.Root bind:open>
  <!-- h-[85vh] must be a definite height, not a max-h: the flex-1 min-h-0 photo
       collapses to zero against an auto-height parent. -->
  <Dialog.Content
    bind:ref={scrollEl}
    class="flex h-[85vh] w-[calc(100%-2rem)] max-w-5xl flex-col overflow-y-auto sm:max-w-5xl"
  >
    <!-- A header band the close button can sit in, so it stops landing on the
         photo. It keeps its height when there is no count to show. -->
    <div class="flex h-6 shrink-0 items-center">
      <Dialog.Title class="text-sm tabular-nums text-gray-400">
        {#if images.length > 1}
          {index + 1} / {images.length}
        {:else}
          <span class="sr-only">Photo {index + 1} of {images.length}</span>
        {/if}
      </Dialog.Title>
    </div>
    {#if image}
      <!-- Sections sit straight in the dialog, with no wrapper between: `h-full`
           only resolves against a definite height, and the dialog is the one thing
           here that has one. That is what lets the photo take a full screen and
           push the map past the fold. -->
      <div
        class="relative h-full shrink-0 overflow-hidden rounded-2xl bg-neutral-100 lg:h-auto lg:min-h-0 lg:flex-1 lg:shrink"
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
        <!-- panzoom binds its handlers on the image's *parent*, so the media
             needs a wrapper the nav buttons don't share. -->
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

        {#if loaded && image.loc && overlaid.current}
          <div
            class="absolute right-4 bottom-4 size-40 overflow-hidden rounded-xl border border-white/15 bg-black/55 p-1 backdrop-blur-sm"
          >
            <div class="h-full w-full overflow-hidden rounded-lg">
              {@render miniMap(image.loc)}
            </div>
          </div>
        {/if}
      </div>

      {#if image.loc && !overlaid.current}
        <!-- The photo is taller than the dialog, so the map starts below the
             fold with nothing to announce it. This sticks to the bottom of the
             dialog until the map is scrolled to. The negative margin pulls it
             back over the photo so it costs no layout height of its own. -->
        {@render scrollHint('Map', false, scrollToBottom, scrolled, 'sticky bottom-2 z-10 -mt-12')}

        <!-- No glass frame here: the stacked map sits on the dialog rather than on
             the photo, so there is nothing for it to lift off of. -->
        <div class="{STACKED_MAP_H} w-full shrink-0 overflow-hidden rounded-xl">
          {@render miniMap(image.loc)}
        </div>
      {/if}

      {#if image.description}
        <p class="shrink-0 text-sm leading-relaxed text-gray-700">{image.description}</p>
      {/if}

      <!-- The return trip. Last in flow, so reaching it *is* the bottom of the
           dialog and it needs no stickiness of its own. -->
      {#if image.loc && !overlaid.current}
        {@render scrollHint('Photo', true, scrollToTop, !atBottom, '')}
      {/if}
    {/if}
  </Dialog.Content>
</Dialog.Root>
