<script lang="ts">
  import { GeoJSONSource, LineLayer } from 'svelte-maplibre-gl';
  import type { ExpressionSpecification } from 'maplibre-gl';
  import type { Feature, LineString } from 'geojson';

  interface Props {
    id: string;
    /** The day's whole track as one line, so the draw runs end to end without restarting. */
    line: [number, number][];
    color: string;
    /** How much of the line is drawn: 0 shows nothing, 1 the whole thing. */
    progress: number;
    width?: number;
  }

  let { id, line, color, progress, width = 3 }: Props = $props();

  const TRANSPARENT = 'rgba(0, 0, 0, 0)';
  /**
   * The gap between the last drawn stop and the first transparent one. Gradient
   * stops have to ascend, so the drawn end and the hidden start can't share a
   * position, and the smaller this is the harder the leading edge reads.
   */
  const EDGE = 0.001;

  const data = $derived<Feature<LineString>>({
    type: 'Feature',
    properties: {},
    geometry: { type: 'LineString', coordinates: line }
  });

  /**
   * Colours the line up to `progress` and leaves the rest transparent, which is
   * what draws it. `line-progress` runs 0 to 1 along the feature, so this needs
   * the source's `lineMetrics`.
   */
  const gradient = $derived.by<ExpressionSpecification>(() => {
    if (progress >= 1) {
      return ['interpolate', ['linear'], ['line-progress'], 0, color, 1, color];
    }
    const head = Math.min(Math.max(progress, EDGE), 1 - 2 * EDGE);
    return [
      'interpolate',
      ['linear'],
      ['line-progress'],
      0,
      color,
      head,
      color,
      head + EDGE,
      TRANSPARENT,
      1,
      TRANSPARENT
    ];
  });
</script>

<GeoJSONSource {id} {data} lineMetrics={true}>
  <LineLayer
    layout={{ 'line-join': 'round', 'line-cap': 'round' }}
    paint={{
      'line-gradient': gradient,
      'line-width': width,
      'line-opacity': progress <= 0 ? 0 : 1
    }}
  />
</GeoJSONSource>
