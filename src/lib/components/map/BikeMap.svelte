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
  import { createHoverState } from './hover.svelte.js';
  import type { Image } from './types';

  const { images, trip }: { images: Image[]; trip: Trip } = $props();

  // Owns the route / day-marker / image-marker hover precedence and the cursor.
  const hover = createHoverState();

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
    if (!hover.canOpenRoute) return;
    selectedDayIndex = i;
    routeModalOpen = true;
  };
</script>

<Map cursor={hover.cursor} {bounds}>
  {#each images as image (image.thumbnail)}
    {@const loc = image.loc}
    <!-- Ungeotagged photos get no marker. They previously rendered at the -1/-1
         sentinel, dropping a pin in the Gulf of Guinea. They remain reachable in
         the lightbox, where orderImagesAlongRoute sinks them to the end. -->
    {#if loc}
      <ImageMarker
        {image}
        {loc}
        dimmed={hover.anyDayHovered}
        onselect={openImageModal}
        onhover={() => hover.enterImage()}
        onleave={() => hover.leaveImage()}
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
      hovered={hover.dayIndex === i}
      dimmed={hover.isDimmed(i)}
      onhover={(idx) => hover.enterRoute(idx)}
      onleave={() => hover.leaveRoute()}
      onselect={openRoute}
    />

    {@const start = getRouteStart(dayGeoJson)}
    {#if start}
      <DayMarker
        lnglat={{ lng: start[0], lat: start[1] }}
        index={i}
        color={dayColor(i)}
        onhover={(idx) => hover.enterMarker(idx)}
        onleave={() => hover.leaveMarker()}
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
