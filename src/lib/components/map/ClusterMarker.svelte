<script lang="ts">
  import { Marker } from 'svelte-maplibre-gl';

  interface Props {
    lnglat: { lng: number; lat: number };
    /** How many photos the cluster stands in for. */
    count: number;
    /** One photo from the cluster, shown as its face. */
    thumbnail: string;
    dimmed?: boolean;
    hidden?: boolean;
    color?: string;
    onselect?: () => void;
  }

  let {
    lnglat,
    count,
    thumbnail,
    dimmed = false,
    hidden = false,
    color = '#ffffff',
    onselect
  }: Props = $props();
</script>

<!-- Above lone photos, so a cluster is never hidden behind one of its neighbours. -->
<Marker class={hidden ? 'hidden' : 'z-20 transition-all'} {lnglat}>
  {#snippet content()}
    <button
      onclick={(e) => {
        e.stopPropagation();
        onselect?.();
      }}
      title={`${count} photos`}
      class="relative h-10 w-10 rounded-full bg-white p-0.5 shadow-md transition-all hover:h-15 hover:w-15"
      class:opacity-20={dimmed}
      style={`box-shadow: 0 0 0 2px ${color}, 0 2px 8px rgba(0,0,0,0.45)`}
    >
      <img
        class="aspect-square h-full w-full rounded-full object-cover object-center"
        src={thumbnail}
        alt=""
      />
      <span
        class="absolute -right-1 -bottom-1 flex min-w-5 items-center justify-center rounded-full px-1 text-xs font-semibold text-white tabular-nums ring-2 ring-white"
        style={`background-color: ${color}`}
      >
        {count}
      </span>
    </button>
  {/snippet}
</Marker>
