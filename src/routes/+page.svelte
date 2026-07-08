<script lang="ts">
  import BikeMap from '$lib/components/map/BikeMap.svelte';
  import type { PageProps } from './$types';
  let { data }: PageProps = $props();
</script>

<div class="h-20">
  <h1 class="text-2xl">Morgan's Bikepacking</h1>
  {#each data.albums as album}
    <p>{album.albumName}</p>
  {/each}
</div>
<div class="h-[calc(100dvh-5rem)]">
  <BikeMap />
</div>
