<script lang="ts">
  import Seo from '$lib/components/Seo.svelte';
  import TripCard from '$lib/components/TripCard.svelte';
  import { SITE_DESCRIPTION, SITE_NAME } from '$lib/seo';
  import type { PageProps } from './$types';

  let { data }: PageProps = $props();
</script>

<Seo
  title={SITE_NAME}
  description={SITE_DESCRIPTION}
  path="/"
  ogAlt="A bicycle wheel above the words Bikepacking Trips"
/>

<ol class="mx-auto flex max-w-5xl flex-col gap-10 px-4 pt-4 pb-24 sm:px-8 sm:gap-14">
  {#each data.trips as trip, i (trip.slug)}
    <TripCard {trip} index={i} />
  {/each}
</ol>
