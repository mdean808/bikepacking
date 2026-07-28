<script lang="ts">
  import { Marker } from 'svelte-maplibre-gl';
  import type { Image } from './types';

  interface Props {
    image: Image;
    loc: { lng: number; lat: number };
    dimmed?: boolean;
    highlighted?: boolean;
    hidden?: boolean;
    color?: string;
    /** Diameter in px. Highlighting, and hovering a selectable marker, grow it by half. */
    size?: number;
    /** Lifts the marker off the map. Off for small markers, where it only muddies the rim. */
    shadow?: boolean;
    onselect?: (image: Image) => void;
    onhover?: () => void;
    onleave?: () => void;
  }

  let {
    image,
    loc,
    dimmed = false,
    highlighted = false,
    hidden = false,
    color = '#ffffff',
    size = 40,
    shadow = true,
    onselect,
    onhover,
    onleave
  }: Props = $props();
</script>

<!-- Stacked under clusters and day markers; see ClusterMarker and DayMarker. -->
<Marker class={hidden ? 'hidden' : 'z-10 transition-all'} lnglat={loc}>
  {#snippet content()}
    <button
      onclick={(e) => {
        e.stopPropagation();
        onselect?.(image);
      }}
      onmouseenter={() => onhover?.()}
      onmouseleave={() => onleave?.()}
      title={image.description}
      class="marker relative rounded-full bg-white ring-1 ring-black/10 transition-all"
      class:shadow-md={shadow}
      class:grow-on-hover={!!onselect}
      class:grown={highlighted}
      class:opacity-20={dimmed}
      style="--size: {size}px; --size-grown: {size * 1.5}px;{highlighted
        ? ` box-shadow: 0 0 0 3px ${color}, 0 2px 8px rgba(0,0,0,0.45);`
        : ''}"
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

<style>
  /* Sized from a custom property rather than utility classes, so callers can pass
     any diameter. The padding is the white rim around the thumbnail. */
  .marker {
    width: var(--size);
    height: var(--size);
    padding: calc(var(--size) / 20);
  }

  .marker.grown,
  .marker.grow-on-hover:hover {
    width: var(--size-grown);
    height: var(--size-grown);
  }
</style>
