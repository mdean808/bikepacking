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

<div class="px-30 py-5 h-screen flex flex-col gap-5">
  <div class="mx-auto text-center">
    <h1 class="text-6xl uppercase w-fit mx-auto border-neutral-600 border-2 p-3">
      Morgan's Bikepacking
    </h1>
    <p class="my-2 uppercase font-bold text-md">
      Explore routes, photos, and captions from different trips.
    </p>
    <button onclick={() => goto('/')} class="border-2 border-neutral-600 py-2 px-3">HOME</button>
  </div>
  <div class="flex-1 min-h-0 border-2 border-neutral-600 bg-[#aa953a] p-0.5">
    {#if data.selectedTrip}
      <BikeMap images={data.images} trip={data.selectedTrip} />
    {:else}
      <TripSelect
        class="mx-auto"
        value={data.selectedTripName}
        trips={data.trips}
        onValueChange={selectTrip}
      />
    {/if}
  </div>
</div>
