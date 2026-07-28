<script lang="ts">
  import TripCard from '$lib/components/TripCard.svelte';
  import type { PageProps } from './$types';

  let { data }: PageProps = $props();
</script>

<svelte:head>
  <title>Bikepacking Trips</title>
  <meta
    name="description"
    content="Bikepacking trip routes and geotagged photos, plotted day by day on a satellite map."
  />
</svelte:head>

<ol class="mx-auto flex max-w-5xl flex-col gap-10 px-4 pt-4 pb-24 sm:px-8 sm:gap-14">
  {#each data.trips as trip, i (trip.slug)}
    <TripCard {trip} index={i} />
  {/each}
</ol>
