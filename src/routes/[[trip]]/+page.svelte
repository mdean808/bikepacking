<script lang="ts">
  import BikeMap from '$lib/components/map/BikeMap.svelte';
  import BikeWheel from '$lib/components/BikeWheel.svelte';
  import TripJournal from '$lib/components/TripJournal.svelte';
  import { goto } from '$app/navigation';
  import { base } from '$app/paths';
  import { fade, fly } from 'svelte/transition';
  import type { PageProps } from './$types';

  let { data }: PageProps = $props();

  // Both selectors route through here so the dropdown gets the same send-off as
  // the wheel. `launching` holds the wheel mounted past the navigation: without
  // it, `data.trip` arriving would swap in the map the instant the load resolved
  // and cut the ramp off partway. Waiting on both means the wheel is on screen
  // for whichever takes longer — the animation or the Immich fetch — so a warm
  // load doesn't flash past and a slow one doesn't sit on a finished animation.
  let wheel = $state<ReturnType<typeof BikeWheel>>();
  let launching = $state(false);

  const selectTrip = async (name: string) => {
    if (launching) return;
    // The wheel/select speak names; the route is keyed by slug. `base` is '' on
    // the custom domain, but keep it so a project-pages deploy wouldn't break.
    const slug = data.trips.find((t) => t.name === name)?.slug;
    if (!slug) return;
    launching = true;
    await Promise.all([
      goto(`${base}/${slug}`, { keepFocus: true, noScroll: true }),
      wheel?.launch()
    ]);
    launching = false;
  };

  // The selectors only need names; the server no longer ships every trip's GeoJSON.
  const tripOptions = $derived(data.trips.map(({ name }) => ({ name })));
</script>

<svelte:head>
  <title>{data.trip ? `${data.trip.name} — ` : ''}Morgan's Bikepacking</title>
  <meta
    name="description"
    content="Bikepacking trip routes and geotagged photos, plotted day by day on a satellite map."
  />
</svelte:head>

<div class="flex min-h-screen flex-col">
  <!-- Just under a full viewport so the "Day by Day" heading below the map peeks
       above the fold, inviting a scroll. Tune the vh value to reveal more/less. -->
  <div class="px-30 py-5 h-[88vh] flex flex-col gap-5">
    <div class="mx-auto text-center">
      <h1 class="text-6xl uppercase w-fit mx-auto">
        {data.trip ? data.trip.name : `Morgan's Bikepacking`}
      </h1>
      <button
        onclick={() => goto(`${base}/`)}
        class="border-2 border-neutral-600 py-2 px-3 mt-4 hover:border-hazy-ipa hover:text-hazy-ipa transition-all hover:text-shadow-block hover:shadow-block"
        >HOME</button
      >
    </div>
    <!-- Both branches are absolutely positioned because they are mounted at the same
       time for the length of the crossfade; in normal flow the arriving one would
       be laid out below its neighbour for that stretch and the panel would jump.
       `overflow-hidden` keeps the sliding map inside the border. -->
    <div class="flex-1 min-h-0 border-2 border-neutral-600 relative bg-blue-100 overflow-hidden">
      {#if data.trip && !launching}
        <div
          class="absolute inset-0"
          in:fly={{ x: '-100%', duration: 600 }}
          out:fade={{ duration: 300 }}
        >
          <BikeMap images={data.images} trip={data.trip} />
        </div>
      {:else}
        <div class="absolute inset-0 flex flex-col pt-3" transition:fade={{ duration: 600 }}>
          <BikeWheel
            bind:this={wheel}
            class="min-h-0 flex-1"
            trips={tripOptions}
            onSelect={selectTrip}
          />
        </div>
      {/if}
    </div>
  </div>

  {#if data.trip && !launching}
    <div transition:fade={{ duration: 400 }}>
      <TripJournal trip={data.trip} />
    </div>
  {/if}
</div>
