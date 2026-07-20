<script lang="ts">
  import type { Trip } from '$lib/trip';
  import {
    dayColor,
    dayLineOffset,
    getRouteStart,
    orderImagesAlongRoute,
    routeBounds
  } from '$lib/geo';
  import Map from './Map.svelte';
  import DayRoute from './DayRoute.svelte';
  import DayMarker from './DayMarker.svelte';
  import ImageMarker from './ImageMarker.svelte';
  import ImageModal from './ImageModal.svelte';
  import RouteModal from './RouteModal.svelte';
  import type { Image } from './types.js';

  const { images, trip }: { images: Image[]; trip: Trip } = $props();

  let cursor: string = $state('');

  // Track layer and marker hover separately — when the mouse moves onto a marker
  // the map canvas fires mouseleave for the layer, which would race with the
  // marker's mouseenter and clear the hovered state. OR-ing them prevents that.
  let layerHoveredIndex: number | null = $state(null);
  let markerHoveredIndex: number | null = $state(null);
  // Image markers are DOM overlays that can sit on top of route lines. While one
  // is hovered it must win over the route underneath — suppress route hover
  // highlighting and block the route modal so images take precedence.
  let imageHovered: boolean = $state(false);
  const hoveredDayIndex = $derived(imageHovered ? null : (markerHoveredIndex ?? layerHoveredIndex));

  const fullGeoJson = $derived({
    type: 'FeatureCollection' as const,
    features: trip.days.flatMap((day) => day.geoJSON.features)
  });

  const bounds = $derived(routeBounds(fullGeoJson));

  // One continuous sequence for the modal's prev/next: grouped by day, ordered
  // spatially along each day's GPX track. See orderImagesAlongRoute.
  const orderedImages = $derived(orderImagesAlongRoute(images, trip.days));

  let modalIndex: number = $state(0);
  let modalOpen: boolean = $state(false);
  const openImageModal = (image: Image) => {
    const i = orderedImages.indexOf(image);
    modalIndex = i === -1 ? 0 : i;
    modalOpen = true;
  };

  // Route modal
  let routeModalOpen: boolean = $state(false);
  let selectedDayIndex: number | null = $state(null);
  const openRoute = (i: number) => {
    if (imageHovered) return;
    selectedDayIndex = i;
    routeModalOpen = true;
  };
</script>

<Map bind:cursor {bounds}>
  {#each images as image (image.thumbnail)}
    {@const loc = image.loc}
    <!-- Ungeotagged photos get no marker. They previously rendered at the -1/-1
         sentinel, dropping a pin in the Gulf of Guinea. They remain reachable in
         the lightbox, where orderImagesAlongRoute sinks them to the end. -->
    {#if loc}
      <ImageMarker
        {image}
        {loc}
        dimmed={hoveredDayIndex !== null}
        onselect={openImageModal}
        onhover={() => {
          imageHovered = true;
          cursor = 'pointer';
        }}
        onleave={() => {
          imageHovered = false;
          cursor = '';
        }}
      />
    {/if}
  {/each}

  {#each trip.days as day, i (`${trip.name}-${i}`)}
    {@const dayGeoJson = day.geoJSON}
    {@const offset = dayLineOffset(i, trip.days.length)}
    <DayRoute
      data={dayGeoJson}
      index={i}
      color={dayColor(i)}
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
        color={dayColor(i)}
        onhover={(idx) => (markerHoveredIndex = idx)}
        onleave={() => (markerHoveredIndex = null)}
        onselect={openRoute}
      />
    {/if}
  {/each}
</Map>

<ImageModal bind:open={modalOpen} images={orderedImages} bind:index={modalIndex} />
<RouteModal
  bind:open={routeModalOpen}
  dayIndex={selectedDayIndex}
  day={selectedDayIndex !== null ? trip.days[selectedDayIndex] : null}
/>
