<script lang="ts">
  import type { Trip } from '$lib/trips';
  import { dayColor, dayLineOffset, getRouteStart, orderImagesByTime, routeBounds } from '$lib/geo';
  import Map from './Map.svelte';
  import DayRoute from './DayRoute.svelte';
  import DayMarker from './DayMarker.svelte';
  import ImageMarker from './ImageMarker.svelte';
  import ImageModal from './ImageModal.svelte';
  import ElevationProfile from './ElevationProfile.svelte';
  import HoverMarker from './HoverMarker.svelte';
  import { createHoverState } from './hover.svelte.js';
  import { createRouteHover } from './routeHover.svelte.js';
  import { anchorOnRoute, buildTripElevation, pointAtDistance } from '$lib/elevation';
  import type * as maplibregl from 'maplibre-gl';
  import type { Image, PhotoAnchor } from './types';

  const { images, trip }: { images: Image[]; trip: Trip } = $props();

  const hover = createHoverState();
  const routeHover = createRouteHover();

  const elevation = $derived.by(() => buildTripElevation(trip.days.map((d) => d.geoJSON)));

  const hoverPoint = $derived(
    routeHover.distanceKm == null ? null : pointAtDistance(elevation, routeHover.distanceKm)
  );

  const photoAnchors = $derived.by<PhotoAnchor[]>(() =>
    images
      .flatMap((image) => {
        if (!image.loc) return [];
        const a = anchorOnRoute(elevation, image.loc.lng, image.loc.lat);
        return a ? [{ image, ...a }] : [];
      })
      .sort((a, b) => a.distanceKm - b.distanceKm)
  );
  // globalThis.Map, because the `Map` component import shadows the built-in here.
  const dayByImage = $derived(
    new globalThis.Map(photoAnchors.map((a) => [a.image, a.dayIndex] as const))
  );

  let hoveredImage = $state<Image | null>(null);
  let map = $state<maplibregl.Map>();
  const centerOn = (distanceKm: number) => {
    const pt = pointAtDistance(elevation, distanceKm);
    if (pt && map) map.easeTo({ center: [pt.lng, pt.lat], duration: 600 });
  };

  const profileDay = $derived(
    routeHover.source === 'profile' && routeHover.distanceKm != null && hoverPoint
      ? hoverPoint.dayIndex
      : null
  );
  $effect(() => {
    if (profileDay == null) return;
    hover.enterProfile(profileDay);
    return () => hover.leaveProfile();
  });

  /** Scrolls to day `i`'s card in the journal below the map. */
  const scrollToDay = (i: number) => {
    document.getElementById(`day-${i}`)?.scrollIntoView({ behavior: 'smooth', block: 'start' });
  };

  const fullGeoJson = $derived({
    type: 'FeatureCollection' as const,
    features: trip.days.flatMap((day) => day.geoJSON.features)
  });

  const bounds = $derived(routeBounds(fullGeoJson));

  const orderedImages = $derived(orderImagesByTime(images));

  let modalIndex: number = $state(0);
  let modalOpen: boolean = $state(false);

  const openImageModal = (image: Image) => {
    const i = orderedImages.indexOf(image);
    modalIndex = i === -1 ? 0 : i;
    modalOpen = true;
  };
</script>

<div class="relative h-full">
  <Map bind:map cursor={hover.cursor} {bounds}>
    {#each images as image (image.thumbnail)}
      {@const loc = image.loc}
      <!-- Photos with no geotag get no marker, but are still in the lightbox. -->
      {#if loc}
        {@const imageDay = dayByImage.get(image)}
        <ImageMarker
          {image}
          {loc}
          dimmed={hover.dayIndex !== null && imageDay !== undefined && hover.dayIndex !== imageDay}
          highlighted={hoveredImage === image}
          color={imageDay !== undefined ? dayColor(imageDay) : '#ffffff'}
          onselect={openImageModal}
          onhover={() => {
            hover.enterImage();
            hoveredImage = image;
          }}
          onleave={() => {
            hover.leaveImage();
            hoveredImage = null;
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
        hovered={hover.dayIndex === i}
        dimmed={hover.isDimmed(i)}
      />

      {@const start = getRouteStart(dayGeoJson)}
      {#if start}
        <DayMarker
          lnglat={{ lng: start[0], lat: start[1] }}
          index={i}
          color={dayColor(i)}
          name={day.title}
          onhover={(idx) => hover.enterMarker(idx)}
          onleave={() => hover.leaveMarker()}
          onselect={scrollToDay}
        />
      {/if}
    {/each}

    {#if hoverPoint}
      <HoverMarker
        lnglat={{ lng: hoverPoint.lng, lat: hoverPoint.lat }}
        color={dayColor(hoverPoint.dayIndex)}
      />
    {/if}
  </Map>

  <ElevationProfile {elevation} hover={routeHover} oncenter={centerOn} days={trip.days} />
</div>

<ImageModal bind:open={modalOpen} images={orderedImages} bind:index={modalIndex} />
