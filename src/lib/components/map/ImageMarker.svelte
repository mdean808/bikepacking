<script lang="ts">
  import { Marker } from 'svelte-maplibre-gl';
  import type { Image } from './types';

  interface Props {
    image: Image;
    /** Where to place the marker. Passed separately because Image['loc'] is
     * nullable and the caller has already established this one is not. */
    loc: { lng: number; lat: number };
    /** When another day is spotlighted, this photo fades back so the active day reads. */
    dimmed?: boolean;
    /** Cross-highlight: its twin (a profile dot, or itself) is hovered — enlarge + ring. */
    highlighted?: boolean;
    /** Day colour, for the highlight ring. */
    color?: string;
    onselect?: (image: Image) => void;
    onhover?: () => void;
    onleave?: () => void;
  }

  let {
    image,
    loc,
    dimmed = false,
    highlighted = false,
    color = '#ffffff',
    onselect,
    onhover,
    onleave
  }: Props = $props();
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
      class="relative rounded-full bg-white p-0.5 shadow-md ring-1 ring-black/10 transition-all hover:h-15 hover:w-15"
      class:h-10={!highlighted}
      class:w-10={!highlighted}
      class:h-15={highlighted}
      class:w-15={highlighted}
      class:opacity-40={dimmed}
      style={highlighted ? `box-shadow: 0 0 0 3px ${color}, 0 2px 8px rgba(0,0,0,0.45)` : ''}
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
