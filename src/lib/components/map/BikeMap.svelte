<script lang="ts">
  import { bbox } from '@turf/bbox';
  import { TRIPS } from '$lib/trip';
  import { DAY_COLORS, getRouteStart } from '$lib/geo';
  import Map from './Map.svelte';
  import TripSelect from './TripSelect.svelte';
  import DayRoute from './DayRoute.svelte';
  import DayMarker from './DayMarker.svelte';
  import ImageMarker from './ImageMarker.svelte';
  import ImageModal from './ImageModal.svelte';
  import RouteModal from './RouteModal.svelte';
  import type { Image } from './types.js';

  let selectedTripName: string = $state(TRIPS[0].name);
  const selectedTrip = $derived(TRIPS.find((t) => t.name === selectedTripName) ?? TRIPS[0]);

  let cursor: string = $state('');

  // Track layer and marker hover separately — when the mouse moves onto a marker
  // the map canvas fires mouseleave for the layer, which would race with the
  // marker's mouseenter and clear the hovered state. OR-ing them prevents that.
  let layerHoveredIndex: number | null = $state(null);
  let markerHoveredIndex: number | null = $state(null);
  const hoveredDayIndex = $derived(markerHoveredIndex ?? layerHoveredIndex);

  const fullGeoJson = $derived({
    type: 'FeatureCollection' as const,
    features: selectedTrip.geoJSON.flatMap((fc) => fc.features)
  });

  const bounds = $derived(
    fullGeoJson.features.length ? (bbox(fullGeoJson) as [number, number, number, number]) : null
  );

  const color = (i: number) => DAY_COLORS[i % DAY_COLORS.length];

  // Image modal
  const images: Image[] = [
    {
      loc: { lng: -123, lat: 49 },
      url: '',
      title: 'No hands',
      description: 'Look mom!'
    }
  ];

  let modalImage: Image = $state({} as Image);
  let modalOpen: boolean = $state(false);
  const openImageModal = (image: Image) => {
    modalImage = image;
    modalOpen = true;
  };

  // Route modal
  let routeModalOpen: boolean = $state(false);
  let selectedDayIndex: number | null = $state(null);
  const openRoute = (i: number) => {
    selectedDayIndex = i;
    routeModalOpen = true;
  };
</script>

<TripSelect bind:value={selectedTripName} trips={TRIPS} />

<Map bind:cursor {bounds}>
  {#each images as image}
    <ImageMarker {image} onselect={openImageModal} />
  {/each}

  {#each selectedTrip.geoJSON as dayGeoJson, i}
    {@const offset = (i - (selectedTrip.geoJSON.length - 1) / 2) * 2}
    <DayRoute
      data={dayGeoJson}
      index={i}
      color={color(i)}
      {offset}
      hovered={hoveredDayIndex === i}
      dimmed={hoveredDayIndex !== null && hoveredDayIndex !== i}
      onhover={(idx) => {
        layerHoveredIndex = idx;
        cursor = 'pointer';
      }}
      onleave={() => {
        layerHoveredIndex = null;
        cursor = '';
      }}
      onselect={openRoute}
    />

    {@const start = getRouteStart(dayGeoJson)}
    {#if start}
      <DayMarker
        lnglat={{ lng: start[0], lat: start[1] }}
        index={i}
        color={color(i)}
        onhover={(idx) => (markerHoveredIndex = idx)}
        onleave={() => (markerHoveredIndex = null)}
        onselect={openRoute}
      />
    {/if}
  {/each}
</Map>

<ImageModal bind:open={modalOpen} image={modalImage} />
<RouteModal bind:open={routeModalOpen} dayIndex={selectedDayIndex} />
