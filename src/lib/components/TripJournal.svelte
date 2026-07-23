<script lang="ts">
  import { dayColor } from '$lib/geo';
  import type { Trip } from '$lib/trips';

  let { trip }: { trip: Trip } = $props();

  // The numbered badge already carries the day number, so strip a leading
  // "Day N:" from the title to avoid saying it twice. Falls back to the whole
  // title when it doesn't match that shape.
  const heading = (title: string) => title.replace(/^day\s+\d+\s*[:.–-]\s*/i, '') || title;
</script>

<section class="px-6 pt-12 pb-20 sm:px-12 lg:px-30">
  <h2 class="text-shadow-block mb-8 text-3xl font-bold tracking-[3px] text-hazy-ipa uppercase">
    Day by Day
  </h2>

  <ol class="mx-auto flex max-w-3xl flex-col gap-6">
    {#each trip.days as day, i (i)}
      {@const color = dayColor(i)}
      <!-- id is the scroll target for the map's day marker (see BikeMap.scrollToDay).
           scroll-mt keeps the heading clear of the viewport's top edge on arrival. -->
      <li id="day-{i}" class="shadow-block flex scroll-mt-6 border-2 border-neutral-700 bg-white">
        <!-- Colour stripe + numbered badge tie each card back to its route and
             pin on the map. -->
        <div class="w-2 shrink-0" style="background-color: {color}"></div>
        <div class="flex flex-1 gap-4 p-5">
          <div
            class="flex h-10 w-10 shrink-0 items-center justify-center rounded-full border-2 bg-white text-sm font-bold text-gray-700"
            style="border-color: {color}"
          >
            {i + 1}
          </div>
          <div class="min-w-0">
            <h3 class="text-lg font-bold tracking-wide text-neutral-800 uppercase">
              {heading(day.title)}
            </h3>
            {#if day.description}
              <p class="font-body mt-2 text-sm leading-relaxed text-neutral-600">
                {day.description}
              </p>
            {/if}
          </div>
        </div>
      </li>
    {/each}
  </ol>
</section>
