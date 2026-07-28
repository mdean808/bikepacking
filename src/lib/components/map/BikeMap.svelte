<script lang="ts">
  import type { Trip } from '$lib/trips';
  import {
    dayColor,
    dayIndexForTime,
    dayLineOffset,
    getRouteStart,
    orderImagesByTime,
    routeBounds
  } from '$lib/geo';
  import Supercluster from 'supercluster';
  import Map from './Map.svelte';
  import DayRoute from './DayRoute.svelte';
  import DayMarker from './DayMarker.svelte';
  import ImageMarker from './ImageMarker.svelte';
  import ClusterMarker from './ClusterMarker.svelte';
  import ImageModal from './ImageModal.svelte';
  import ElevationProfile from './ElevationProfile.svelte';
  import HoverMarker from './HoverMarker.svelte';
  import { createHoverState } from './hover.svelte.js';
  import { createRouteHover } from './routeHover.svelte.js';
  import { anchorOnRoute, buildTripElevation, pointAtDistance } from '$lib/elevation';
  import type * as maplibregl from 'maplibre-gl';
  import type { Feature, Point } from 'geojson';
  import type { Image, PhotoAnchor } from './types';
  import Switch from '../ui/switch/switch.svelte';
  import Control from './Control.svelte';

  const { images, trip }: { images: Image[]; trip: Trip } = $props();

  const CLUSTER_RADIUS = 50; // grouping distance of clusters in pixels
  const CLUSTER_MAX_ZOOM = 14; // zoom past at which everything is no longer clustered

  type PointProps = { image: Image };
  type PointFeature = Feature<Point, PointProps>;
  /** The properties supercluster puts on a cluster, as opposed to a lone photo. */
  type ClusterProps = { cluster: true; cluster_id: number; point_count: number };

  const hover = createHoverState();
  const routeHover = createRouteHover();

  const control: {
    hideImages: boolean;
  } = $state({ hideImages: false });

  const elevation = $derived.by(() => buildTripElevation(trip.days.map((d) => d.geoJSON)));

  const hoverPoint = $derived(
    routeHover.distanceKm == null ? null : pointAtDistance(elevation, routeHover.distanceKm)
  );

  const photoAnchors = $derived.by<PhotoAnchor[]>(() =>
    images
      .flatMap((image) => {
        if (!image.loc) return [];
        // The clock picks the day, so photos on a road two days share aren't stolen
        // by whichever line happens to run closer. Undated photos fall back to the
        // nearest line across every day.
        const day = dayIndexForTime(trip.days, image.takenAt);
        const a = anchorOnRoute(elevation, image.loc.lng, image.loc.lat, day);
        return a ? [{ image, ...a }] : [];
      })
      .sort((a, b) => a.distanceKm - b.distanceKm)
  );
  // globalThis.Map, because the `Map` component import shadows the built-in here.
  const dayByImage = $derived(
    new globalThis.Map(photoAnchors.map((a) => [a.image, a.dayIndex] as const))
  );

  /**
   * Photos grouped by day and ordered along the route within each day. Day -1
   * collects geotagged photos that never anchored to a route, so they still get a
   * marker; `markerColor` draws them white rather than in a day's colour.
   */
  const imagesByDay = $derived.by(() => {
    const byDay = new globalThis.Map<number, Image[]>();
    const push = (day: number, image: Image) => {
      let group = byDay.get(day);
      if (!group) byDay.set(day, (group = []));
      group.push(image);
    };
    // Anchored photos first, so each day's list comes out in route order.
    for (const a of photoAnchors) push(a.dayIndex, a.image);
    for (const image of images) if (image.loc && !dayByImage.has(image)) push(-1, image);
    return byDay;
  });

  // One index per day, so a cluster never spans days and always has one colour.
  const dayIndexes = $derived.by(() =>
    [...imagesByDay].map(([day, group]) => ({
      day,
      index: new Supercluster<PointProps>({
        radius: CLUSTER_RADIUS,
        maxZoom: CLUSTER_MAX_ZOOM
      }).load(
        group.flatMap<PointFeature>((image) => {
          const loc = image.loc;
          if (!loc) return [];
          return [
            {
              type: 'Feature',
              properties: { image },
              geometry: { type: 'Point', coordinates: [loc.lng, loc.lat] }
            }
          ];
        })
      )
    }))
  );

  let hoveredImage = $state<Image | null>(null);
  let map = $state<maplibregl.Map>();

  // What the camera currently shows. Supercluster needs both to decide which
  // photos have merged, so clusters re-form as the map moves.
  let view = $state<{ bbox: [number, number, number, number]; zoom: number } | null>(null);

  $effect(() => {
    if (!map) return;
    const m = map;
    const read = () => {
      const b = m.getBounds();
      view = {
        bbox: [b.getWest(), b.getSouth(), b.getEast(), b.getNorth()],
        zoom: m.getZoom()
      };
    };
    read();
    m.on('move', read);
    return () => {
      m.off('move', read);
    };
  });

  /**
   * A marker to draw: either a cluster standing in for several photos, or a photo
   * that nothing merged with. `key` is what the each block keys on, so a marker
   * surviving a zoom keeps its DOM node and eases to its new spot instead of being
   * torn down and rebuilt — which is what reads as clusters spreading apart.
   */
  type MapMarker = { key: string; day: number; lng: number; lat: number } & (
    | { kind: 'cluster'; count: number; face: Image | null; expand: () => void }
    | { kind: 'photo'; image: Image }
  );

  const markers = $derived.by<MapMarker[]>(() => {
    const v = view;
    if (!v) return [];

    return dayIndexes.flatMap(({ day, index }) =>
      index.getClusters(v.bbox, Math.round(v.zoom)).map((feature): MapMarker => {
        const [lng, lat] = feature.geometry.coordinates;
        const props = feature.properties as Partial<ClusterProps> & Partial<PointProps>;

        if (props.cluster) {
          const id = props.cluster_id as number;
          return {
            kind: 'cluster',
            key: `cluster-${day}-${id}`,
            day,
            lng,
            lat,
            count: props.point_count as number,
            // One of the cluster's photos, shown as its face.
            face: index.getLeaves(id, 1)[0]?.properties.image ?? null,
            // Zooming to where the cluster splits is what spreads it apart.
            expand: () =>
              map?.easeTo({
                center: [lng, lat],
                zoom: index.getClusterExpansionZoom(id),
                duration: 500
              })
          };
        }

        const image = props.image as Image;
        return { kind: 'photo', key: `image-${image.thumbnail}`, day, lng, lat, image };
      })
    );
  });

  // Day -1 photos never anchored to a route, so they get no day colour.
  const markerColor = (day: number) => (day === -1 ? '#ffffff' : dayColor(day));

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

<div class="relative h-[calc(100vh-200px)]">
  <Control>
    <h2 class="text-center mx-auto border-b border-white">Map Settings</h2>
    <ul class="flex gap-2 text-sm py-1">
      <li class="flex gap-2 justify-between items-center w-full">
        <label for="images">Images</label>
        <Switch class="border-white" id="images" bind:checked={control.hideImages} />
      </li>
    </ul>
  </Control>
  <Map bind:map cursor={hover.cursor} {bounds}>
    <!-- Photos with no geotag get no marker, but are still in the lightbox. -->
    {#each markers as marker (marker.key)}
      {@const loc = { lng: marker.lng, lat: marker.lat }}
      {@const dimmed = hover.dayIndex !== null && hover.dayIndex !== marker.day}
      {#if marker.kind === 'cluster'}
        <ClusterMarker
          lnglat={loc}
          count={marker.count}
          thumbnail={marker.face?.thumbnail ?? ''}
          hidden={control.hideImages}
          {dimmed}
          color={markerColor(marker.day)}
          onselect={marker.expand}
        />
      {:else}
        <ImageMarker
          image={marker.image}
          {loc}
          hidden={control.hideImages}
          {dimmed}
          highlighted={hoveredImage === marker.image}
          color={markerColor(marker.day)}
          onselect={openImageModal}
          onhover={() => {
            hover.enterImage();
            hoveredImage = marker.image;
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
