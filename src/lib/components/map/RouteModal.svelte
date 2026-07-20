<script lang="ts">
  import Modal from '$lib/components/Modal.svelte';
  import Map from './Map.svelte';
  import DayRoute from './DayRoute.svelte';
  import DayMarker from './DayMarker.svelte';
  import { dayColor, getRouteStart, routeBounds } from '$lib/geo';
  import type { Day } from '$lib/trip';

  interface Props {
    open?: boolean;
    dayIndex: number | null;
    day: Day | null;
  }

  let { open = $bindable(false), dayIndex, day }: Props = $props();

  // Both props are null until a route is picked, and every derived value below
  // needs both. Resolving them together means one null check instead of one per
  // value, and lets the template use them without re-guarding.
  const view = $derived(
    day !== null && dayIndex !== null
      ? {
          day,
          dayIndex,
          color: dayColor(dayIndex),
          bounds: routeBounds(day.geoJSON),
          start: getRouteStart(day.geoJSON)
        }
      : null
  );
</script>

{#if view}
  <Modal bind:open title={view.day.title}>
    <div class="flex h-full flex-col">
      <div class="flex items-center gap-3">
        <div class="h-3 w-3 rounded-full" style="background-color: {view.color}"></div>
        <h2 class="pr-8 text-lg font-semibold text-gray-900">{view.day.title}</h2>
      </div>

      <p class="mt-2 text-sm text-gray-600">{view.day.description}</p>

      <div class="mt-4 min-h-0 flex-1 overflow-hidden rounded-xl">
        <Map bounds={view.bounds}>
          <DayRoute data={view.day.geoJSON} index={view.dayIndex} color={view.color} offset={0} />
          {#if view.start}
            <DayMarker
              lnglat={{ lng: view.start[0], lat: view.start[1] }}
              index={view.dayIndex}
              color={view.color}
            />
          {/if}
        </Map>
      </div>
    </div>
  </Modal>
{/if}
