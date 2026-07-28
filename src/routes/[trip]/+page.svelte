<script lang="ts">
  import BikeMap from '$lib/components/map/BikeMap.svelte';
  import Seo from '$lib/components/Seo.svelte';
  import TripJournal from '$lib/components/TripJournal.svelte';
  import type { PageProps } from './$types';

  let { data }: PageProps = $props();
</script>

<Seo
  title={data.trip.name}
  description={data.trip.description}
  path="/{data.trip.slug}"
  ogSlug={data.trip.slug}
  ogAlt="A map of the {data.trip.name} route, each day drawn in its own colour"
  type="article"
  publishedAt={new Date(data.trip.date).toISOString()}
/>

<BikeMap images={data.images} trip={data.trip} />
<TripJournal trip={data.trip} />
