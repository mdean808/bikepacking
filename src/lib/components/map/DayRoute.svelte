<script lang="ts">
  import { GeoJSONSource, LineLayer } from 'svelte-maplibre-gl';
  import type { FeatureCollection } from 'geojson';

  interface Props {
    data: FeatureCollection;
    index: number;
    color: string;
    offset: number;
    // hovered/dimmed are driven externally (day markers, elevation profile) — the
    // route line itself is inert to the mouse, so it has no event handlers.
    hovered?: boolean;
    dimmed?: boolean;
  }

  let { data, index, color, offset, hovered = false, dimmed = false }: Props = $props();
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
  />
</GeoJSONSource>
