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

<div class="h-20">
  <h1 class="text-2xl">Morgan's Bikepacking</h1>
  <TripSelect value={data.selectedTripName} trips={data.trips} onValueChange={selectTrip} />
</div>
<div class="h-[calc(100dvh-5rem)]">
  <BikeMap images={data.images} trip={data.selectedTrip} />
</div>
