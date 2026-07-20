<script lang="ts">
  import BikeMap from '$lib/components/map/BikeMap.svelte';
  import TripSelect from '$lib/components/TripSelect.svelte';
  import { goto } from '$app/navigation';
  import type { PageProps } from './$types';

  let { data }: PageProps = $props();

  const selectTrip = (name: string) => {
    goto(`?trip=${encodeURIComponent(name)}`, { keepFocus: true, noScroll: true });
  };

  // TripSelect only needs names; the server no longer ships every trip's GeoJSON.
  const tripOptions = $derived(data.tripNames.map((name) => ({ name })));
</script>

<svelte:head>
  <title>{data.trip ? `${data.trip.name} — ` : ''}Morgan's Bikepacking</title>
  <meta
    name="description"
    content="Bikepacking trip routes and geotagged photos, plotted day by day on a satellite map."
  />
</svelte:head>

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
    {#if data.trip}
      <BikeMap images={data.images} trip={data.trip} />
    {:else}
      <!-- Only reachable when no trip is selected, so the value is always empty. -->
      <TripSelect class="mx-auto" value="" trips={tripOptions} onValueChange={selectTrip} />
    {/if}
  </div>
</div>
