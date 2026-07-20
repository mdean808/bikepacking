<script lang="ts">
  import { bbox } from '@turf/bbox';
  import Modal from './Modal.svelte';
  import Map from './Map.svelte';
  import DayRoute from './DayRoute.svelte';
  import DayMarker from './DayMarker.svelte';
  import { DAY_COLORS, getRouteStart } from '$lib/geo.js';
  import type { Day } from '$lib/trip';

  interface Props {
    open?: boolean;
    dayIndex: number | null;
    day: Day | null;
  }

  let { open = $bindable(false), dayIndex, day }: Props = $props();

  const color = $derived(dayIndex !== null ? DAY_COLORS[dayIndex % DAY_COLORS.length] : '#000');

  const bounds = $derived(
    day && day.geoJSON.features.length
      ? (bbox(day.geoJSON) as [number, number, number, number])
      : null
  );

  const start = $derived(day ? getRouteStart(day.geoJSON) : null);
</script>

{#if day && dayIndex !== null}
  <Modal bind:open>
    <div class="flex h-full flex-col">
      <div class="flex items-center gap-3">
        <div class="h-3 w-3 rounded-full" style="background-color: {color}"></div>
        <h2 class="pr-8 text-lg font-semibold text-gray-900">{day.title}</h2>
      </div>

      <p class="mt-2 text-sm text-gray-600">{day.description}</p>

      <div class="mt-4 min-h-0 flex-1 overflow-hidden rounded-xl">
        <Map {bounds}>
          <DayRoute data={day.geoJSON} index={dayIndex} {color} offset={0} />
          {#if start}
            <DayMarker lnglat={{ lng: start[0], lat: start[1] }} index={dayIndex} {color} />
          {/if}
        </Map>
      </div>
    </div>
  </Modal>
{/if}
