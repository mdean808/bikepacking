<script lang="ts">
  import { GeoJSONSource, LineLayer } from 'svelte-maplibre-gl';
  import type { FeatureCollection } from 'geojson';

  interface Props {
    data: FeatureCollection;
    index: number;
    color: string;
    offset: number;
    hovered?: boolean;
    dimmed?: boolean;
    onhover?: (index: number) => void;
    onleave?: () => void;
    onselect?: (index: number) => void;
  }

  let {
    data,
    index,
    color,
    offset,
    hovered = false,
    dimmed = false,
    onhover,
    onleave,
    onselect
  }: Props = $props();
</script>

<GeoJSONSource id="route-day-{index}" {data}>
  <LineLayer
    layout={{ 'line-join': 'round', 'line-cap': 'round' }}
    paint={{
      'line-color': color,
      'line-width': hovered ? 6 : 4,
      'line-offset': offset,
      'line-opacity': dimmed ? 0.4 : 1
    }}
    onmouseenter={() => onhover?.(index)}
    onmouseleave={() => onleave?.()}
    onclick={() => onselect?.(index)}
  />
</GeoJSONSource>
