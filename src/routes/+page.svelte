<script lang="ts">
  import BikeMap from '$lib/components/map/BikeMap.svelte';
  import TripSelect from '$lib/components/map/TripSelect.svelte';
  import { goto } from '$app/navigation';
  import type { PageProps } from './$types';

  let { data }: PageProps = $props();

  const selectTrip = (name: string) => {
    goto(`?trip=${encodeURIComponent(name)}`, { keepFocus: true, noScroll: true });
  };
</script>

<div class="mx-30">
  <div class="m-5 mx-auto text-center">
    <h1 class="text-6xl uppercase w-fit mx-auto border-neutral-600 border-2 p-3">
      Morgan's Bikepacking
    </h1>
    <p class="my-2">Explore routes, photos, and captions from different trips.</p>
    <TripSelect
      class="mx-auto"
      value={data.selectedTripName}
      trips={data.trips}
      onValueChange={selectTrip}
    />
  </div>
  <div class="h-full border-2 border-neutral-600 bg-amber-200">
    {#if data.selectedTrip}
      <BikeMap images={data.images} trip={data.selectedTrip} />
    {/if}
  </div>
</div>
