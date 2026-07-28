<script lang="ts">
  import { GeoJSONSource, LineLayer } from 'svelte-maplibre-gl';
  import type { FeatureCollection } from 'geojson';

  interface Props {
    data: FeatureCollection;
    index: number;
    color: string;
    offset: number;
    dimmed?: boolean;
  }

  let { data, index, color, offset, dimmed = false }: Props = $props();
</script>

<GeoJSONSource id="route-day-{index}" {data}>
  <LineLayer
    layout={{ 'line-join': 'round', 'line-cap': 'round' }}
    paint={{
      'line-color': color,
      'line-width': 4,
      'line-offset': offset,
      'line-opacity': dimmed ? 0.4 : 1
    }}
  />
</GeoJSONSource>
