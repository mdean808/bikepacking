<script lang="ts">
  import { ArrowUpRight } from '@lucide/svelte';
  import { cubicOut } from 'svelte/easing';
  import type * as maplibregl from 'maplibre-gl';
  import { dayColor } from '$lib/geo';
  import { cn } from '$lib/utils.js';
  import type { TripCard } from '$lib/trips';
  import Map from './map/Map.svelte';
  import DrawnRoute from './map/DrawnRoute.svelte';
  import DayMarker from './map/DayMarker.svelte';

  interface Props {
    trip: TripCard;
    /** Position in the list, which decides the side the map sits on. */
    index: number;
  }

  let { trip, index }: Props = $props();

  /** How long one day's line takes to draw itself, in ms. */
  const DAY_DRAW_MS = 700;
  /** Pause between one day finishing and the next starting, in ms. */
  const DAY_GAP_MS = 120;
  const ROUTE_WIDTH = 3;
  /** Space left around the fitted route on a card map, in px. */
  const CARD_FIT_PADDING = 24;
  const CARD_FIT_MAX_ZOOM = 11;

  let map = $state<maplibregl.Map>();
  /** How much of each day's line is drawn, indexed to `trip.days`. Empty until
      the first frame runs, which every reader treats as nothing drawn yet. */
  let drawn = $state<number[]>([]);

  let played = false;
  let frame = 0;

  const stillPreferred = () =>
    typeof matchMedia === 'function' && matchMedia('(prefers-reduced-motion: reduce)').matches;

  /**
   * Draws the days one after another, each easing to a stop before the next
   * starts, so the trip plays back as separate rides rather than one long stroke.
   * Runs once per card: the route stays drawn afterwards.
   */
  const play = () => {
    if (played) return;
    played = true;

    if (stillPreferred()) {
      drawn = trip.days.map(() => 1);
      return;
    }

    const start = performance.now();

    const step = (now: number) => {
      const elapsed = now - start;
      let running = false;

      drawn = trip.days.map((_, i) => {
        const p = (elapsed - i * (DAY_DRAW_MS + DAY_GAP_MS)) / DAY_DRAW_MS;
        if (p < 1) running = true;
        return cubicOut(Math.min(Math.max(p, 0), 1));
      });

      if (running) frame = requestAnimationFrame(step);
    };

    frame = requestAnimationFrame(step);
  };

  // Held until the style is up, otherwise the draw runs against a map that has
  // nowhere to put the lines yet and the first day is already gone when it lands.
  $effect(() => {
    if (!map) return;
    const m = map;
    if (m.loaded()) {
      play();
      return;
    }
    m.once('load', play);
    return () => m.off('load', play);
  });

  $effect(() => () => cancelAnimationFrame(frame));

  /** The distance currently on screen, so the readout and the lines agree. */
  const kmDrawn = $derived(
    trip.days.reduce((sum, day, i) => sum + day.distanceKm * (drawn[i] ?? 0), 0)
  );
  /** Days whose line has started, ticking up as each one begins. */
  const daysDrawn = $derived(drawn.filter((p) => p > 0).length);

  /** Groups thousands with a comma, fixed rather than by locale so the prerendered
      markup and the hydrated markup agree. */
  const grouped = (n: number) => String(n).replace(/\B(?=(\d{3})+(?!\d))/g, ',');

  const MONTHS = [
    'JAN',
    'FEB',
    'MAR',
    'APR',
    'MAY',
    'JUN',
    'JUL',
    'AUG',
    'SEP',
    'OCT',
    'NOV',
    'DEC'
  ];
  // Read in UTC, matching how the trip dates are written in trips.ts. Local
  // getters would roll a UTC-midnight date back a month west of Greenwich.
  const stamp = (d: Date) => `${MONTHS[d.getUTCMonth()]} ${d.getUTCFullYear()}`;

  const share = (km: number) => (trip.totalKm > 0 ? (km / trip.totalKm) * 100 : 0);

  const dayBreakdown = $derived(
    trip.days.map((d) => `${d.title} — ${Math.round(d.distanceKm)} km`).join(', ')
  );

  /** Puts the map on the right for every other card, so the list alternates. */
  const reversed = $derived(index % 2 === 1);
</script>

<li>
  <article
    class={cn(
      'group relative flex flex-col overflow-hidden border-2 border-neutral-900 bg-white shadow-md',
      'transition duration-200 motion-reduce:transition-none',
      'hover:-translate-x-1 hover:-translate-y-1 hover:shadow-xl',
      'focus-within:-translate-x-1 focus-within:-translate-y-1 focus-within:shadow-xl',
      reversed ? 'md:flex-row-reverse' : 'md:flex-row'
    )}
  >
    <div
      class={cn(
        'relative h-56 shrink-0 bg-neutral-800 sm:h-64 md:h-auto md:w-[46%]',
        reversed
          ? 'border-b-2 md:border-b-0 md:border-l-2'
          : 'border-b-2 md:border-b-0 md:border-r-2'
      )}
    >
      {#if trip.bounds}
        <div class="absolute inset-0">
          <Map
            bind:map
            bounds={trip.bounds}
            interactive={false}
            compactAttribution
            cursor="pointer"
            fitPadding={CARD_FIT_PADDING}
            fitMaxZoom={CARD_FIT_MAX_ZOOM}
          >
            {#each trip.days as day, i (i)}
              <DrawnRoute
                id="{trip.slug}-day-{i}"
                line={day.line}
                color={dayColor(i)}
                progress={drawn[i] ?? 0}
                width={ROUTE_WIDTH}
              />

              <!-- Held back until the day's line starts, so each number lands with
                   the stroke it belongs to rather than all four sitting there first. -->
              {#if day.line.length && (drawn[i] ?? 0) > 0}
                <DayMarker
                  lnglat={{ lng: day.line[0][0], lat: day.line[0][1] }}
                  index={i}
                  color={dayColor(i)}
                  interactive={false}
                />
              {/if}
            {/each}
          </Map>
        </div>
      {/if}
    </div>

    <div class="flex flex-1 flex-col gap-6 p-6 sm:p-8">
      <div>
        <p class="font-mono text-xs tracking-[0.2em] text-neutral-500 uppercase">
          {stamp(trip.date)}
        </p>
        <h2
          class="text-shadow-block mt-1.5 text-2xl tracking-[2px] text-hazy-ipa uppercase sm:text-3xl"
        >
          <!-- The card is not itself a link, so the album link inside it stays valid.
             This one stretches over the whole card instead. -->
          <a
            href="/{trip.slug}"
            class="rounded-xs outline-offset-4 after:absolute after:inset-0 after:content-['']"
          >
            {trip.name}
          </a>
        </h2>
        {#if trip.description}
          <p class="mt-2 max-w-prose text-sm leading-relaxed text-neutral-600">
            {trip.description}
          </p>
        {/if}
      </div>

      <dl class="flex items-end gap-8 sm:gap-10">
        <div class="flex flex-col-reverse">
          <dt class="mt-1.5 font-mono text-[11px] tracking-[0.2em] text-neutral-500 uppercase">
            km
          </dt>
          <dd
            class="font-mono text-4xl leading-none font-semibold text-neutral-900 tabular-nums sm:text-5xl"
          >
            {grouped(Math.round(kmDrawn))}
          </dd>
        </div>
        <div class="flex flex-col-reverse">
          <dt class="mt-1.5 font-mono text-[11px] tracking-[0.2em] text-neutral-500 uppercase">
            days
          </dt>
          <dd
            class="font-mono text-4xl leading-none font-semibold text-neutral-900 tabular-nums sm:text-5xl"
          >
            {daysDrawn}
          </dd>
        </div>
      </dl>

      <!-- How the distance splits across the days, in the colours the map draws them.
           Labelled as a whole, because the segments carry no text of their own. -->
      <div class="flex h-3.5 w-full border-2 border-neutral-900" aria-label={dayBreakdown}>
        {#each trip.days as day, i (i)}
          <div
            class={cn('h-full', i > 0 && 'border-l-2 border-neutral-900')}
            style="width: {share(day.distanceKm)}%"
            title="{day.title} — {Math.round(day.distanceKm)} km"
          >
            <div
              class="h-full origin-left"
              style="background-color: {dayColor(i)}; transform: scaleX({drawn[i] ?? 0})"
            ></div>
          </div>
        {/each}
      </div>

      <a
        href={trip.album.url}
        target="_blank"
        rel="noopener noreferrer"
        class="relative z-10 mt-auto flex w-fit items-center gap-3 border-2 border-neutral-900 bg-white p-1.5 pr-4 shadow-2xs transition hover:-translate-x-0.5 hover:-translate-y-0.5 hover:shadow-sm motion-reduce:transition-none"
      >
        {#if trip.album.cover}
          <img
            src={trip.album.cover}
            alt=""
            loading="lazy"
            class="size-12 border-2 border-neutral-900 object-cover transition-transform duration-200 group-hover:scale-105 motion-reduce:transition-none"
          />
        {/if}
        <span class="font-mono text-sm font-semibold tabular-nums">
          {grouped(trip.album.photoCount)} photos
        </span>
        <ArrowUpRight size={16} class="text-neutral-500" />
      </a>
    </div>
  </article>
</li>
