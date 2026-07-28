<script lang="ts">
  import { GeoJSONSource, Image as MapImage, LineLayer, SymbolLayer } from 'svelte-maplibre-gl';
  import type { FeatureCollection } from 'geojson';
  import { ARROW_PIXEL_RATIO, arrowImageData } from './arrowIcon';

  interface Props {
    data: FeatureCollection;
    index: number;
    color: string;
    offset: number;
    dimmed?: boolean;
  }

  let { data, index, color, offset, dimmed = false }: Props = $props();

  /** Screen px between arrows, so their density holds as you zoom. */
  const ARROW_SPACING = 120;

  /** Scales the 24px icon down to something that sits on a 4px line. */
  const ARROW_SIZE = 0.5;

  const arrowId = $derived(`route-arrow-${index}`);

  const arrowImage = arrowImageData();

  /**
   * Puts the arrows on the offset line rather than the track it was drawn from.
   * Symbol layers have no `line-offset`, but `icon-offset` is applied in the
   * icon's own frame, which `icon-rotation-alignment: 'map'` has already turned
   * to face along the route — so its y axis is the one `line-offset` moves along.
   * Dividing cancels the `icon-size` multiplier MapLibre applies to the offset.
   *
   * Both count a positive value as the right-hand side of the direction of travel.
   * Negate this if the arrows land on the wrong side of their line.
   */
  const arrowOffset = $derived<[number, number]>([0, offset / ARROW_SIZE]);
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

  {#if arrowImage}
    <MapImage id={arrowId} image={arrowImage} options={{ pixelRatio: ARROW_PIXEL_RATIO }} />
    <SymbolLayer
      layout={{
        'symbol-placement': 'line',
        'symbol-spacing': ARROW_SPACING,
        'icon-image': arrowId,
        'icon-size': ARROW_SIZE,
        'icon-rotation-alignment': 'map',
        'icon-offset': arrowOffset,
        'icon-allow-overlap': true,
        'icon-ignore-placement': true
      }}
      paint={{ 'icon-opacity': dimmed ? 0.4 : 1 }}
    />
  {/if}
</GeoJSONSource>
