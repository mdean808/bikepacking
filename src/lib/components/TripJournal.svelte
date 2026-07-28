<script lang="ts">
  import { dayColor } from '$lib/geo';
  import type { Trip } from '$lib/trips';

  let { trip }: { trip: Trip } = $props();

  /** Strips a leading "Day 3:" prefix from a day title. */
  const heading = (title: string) => title.replace(/^day\s+\d+\s*[:.–-]\s*/i, '') || title;
</script>

<section class="px-6 pt-12 pb-20 max-w-5xl mx-auto">
  <h2 class="text-shadow-block mb-8 text-3xl font-bold tracking-[3px] text-hazy-ipa uppercase">
    Day by Day
  </h2>

  <ol class="mx-auto flex max-w-3xl flex-col gap-6">
    {#each trip.days as day, i (i)}
      {@const color = dayColor(i)}
      <!-- BikeMap's scrollToDay looks this id up. -->
      <li id="day-{i}" class="shadow-block flex scroll-mt-6 border-2 border-neutral-700 bg-white">
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
