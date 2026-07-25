<script lang="ts">
  import type { PageProps } from './$types';

  let { data }: PageProps = $props();
</script>

<svelte:head>
  <title>Morgan's Bikepacking</title>
  <meta
    name="description"
    content="Bikepacking trip routes and geotagged photos, plotted day by day on a satellite map."
  />
</svelte:head>

{#each data.trips as trip}
  <a href={`/${trip.slug}`}>{trip.name}</a>
{/each}
