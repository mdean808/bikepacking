<script lang="ts">
  import BikeMap from '$lib/components/map/BikeMap.svelte';
  import TripJournal from '$lib/components/TripJournal.svelte';
  import type { PageProps } from './$types';

  let { data }: PageProps = $props();
</script>

<svelte:head>
  <title>{data.trip.name} — Bikepacking Trips</title>
  <meta name="description" content="" />
</svelte:head>

<BikeMap images={data.images} trip={data.trip} />
<TripJournal trip={data.trip} />
