<script lang="ts">
  import BikeMap from '$lib/components/map/BikeMap.svelte';
  import TripJournal from '$lib/components/TripJournal.svelte';
  import type { PageProps } from './$types';

  let { data }: PageProps = $props();
</script>

<svelte:head>
  <title>{data.trip.name} — Morgan's Bikepacking</title>
  <meta name="description" content="" />
</svelte:head>

<div
  class="flex-1 min-h-0 border-0 lg:border-2 border-neutral-600 relative bg-blue-100 overflow-hidden"
>
  <BikeMap images={data.images} trip={data.trip} />
</div>
<div>
  <TripJournal trip={data.trip} />
</div>
