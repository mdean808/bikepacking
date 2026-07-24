<script lang="ts">
  import { dayColor } from '$lib/geo';
  import { elevationAtDistance, type ElevationPoint, type TripElevation } from '$lib/elevation';
  import type { RouteHoverState } from './routeHover.svelte.js';

  interface Props {
    elevation: TripElevation;
    hover: RouteHoverState;
    /** Per-day metadata, ordered like the days — supplies the segment name labels. */
    days?: { title: string; description: string }[];
    /** Fired when a spot on the profile is clicked, so the map can recenter there. */
    oncenter?: (distanceKm: number) => void;
  }

  let { elevation, hover, days, oncenter }: Props = $props();

  // --- Tunable layout constants ------------------------------------------------
  // The overlay height is driven by the container (see the class on the wrapper:
  // ~1/6 of the map, clamped) and measured into `h`. PAD reserves room for the
  // axis labels. Adjust these to retune density/spacing without touching logic.
  const PAD = { top: 14, right: 14, bottom: 18, left: 48 };
  // Height (px) of the day-name strip reserved along the bottom, below the chart.
  const LABEL_BAND = 22;

  // Measured overlay size; paths recompute from these so nothing is distorted.
  let w = $state(0);
  let h = $state(0);
  let svgEl: SVGSVGElement | undefined = $state();

  // The chart (SVG) occupies everything above the day-name band.
  const chartH = $derived(Math.max(1, h - LABEL_BAND));

  const hasData = $derived(elevation.series.length > 1 && elevation.totalKm > 0);

  // Scales + plot box, recomputed on resize.
  const chart = $derived.by(() => {
    const plotW = Math.max(1, w - PAD.left - PAD.right);
    const plotH = Math.max(1, chartH - PAD.top - PAD.bottom);
    const total = elevation.totalKm || 1;
    const ePad = (elevation.maxElevationM - elevation.minElevationM) * 0.12 || 10;
    const yLo = elevation.minElevationM - ePad;
    const yHi = elevation.maxElevationM + ePad;
    const baseY = PAD.top + plotH;
    const x = (km: number) => PAD.left + (km / total) * plotW;
    const y = (m: number) => PAD.top + (1 - (m - yLo) / (yHi - yLo || 1)) * plotH;
    return { plotW, plotH, total, baseY, x, y };
  });

  // One filled area + stroked line per day, in the day's colour. Split whenever
  // dayIndex changes so each segment can be coloured independently.
  const dayPaths = $derived.by(() => {
    const { x, y, baseY } = chart;
    const groups: { dayIndex: number; line: string; area: string }[] = [];
    let cur: ElevationPoint[] = [];
    let curDay = -1;
    const flush = () => {
      if (cur.length < 2) {
        cur = [];
        return;
      }
      const pt = (p: ElevationPoint) =>
        `${x(p.distanceKm).toFixed(1)},${y(p.elevationM).toFixed(1)}`;
      const line = cur.map((p, i) => `${i ? 'L' : 'M'}${pt(p)}`).join('');
      const area =
        `M${x(cur[0].distanceKm).toFixed(1)},${baseY.toFixed(1)}` +
        cur.map((p) => `L${pt(p)}`).join('') +
        `L${x(cur[cur.length - 1].distanceKm).toFixed(1)},${baseY.toFixed(1)}Z`;
      groups.push({ dayIndex: curDay, line, area });
      cur = [];
    };
    for (const p of elevation.series) {
      if (p.dayIndex !== curDay) {
        flush();
        curDay = p.dayIndex;
      }
      cur.push(p);
    }
    flush();
    return groups;
  });

  // Faint verticals where one day hands off to the next.
  const dayBoundaries = $derived(elevation.dayOffsetsKm.slice(1).map((km) => chart.x(km)));

  // Total trip distance, shown as a fixed end label mirroring the 0 km origin.
  const endKm = $derived(Math.round(elevation.totalKm * 10) / 10);

  // ~5 evenly-spaced, round-numbered distance ticks. The last round tick is
  // dropped when it would crowd the end label (which always shows the exact
  // total), so 0 km and the total anchor the two ends and the round marks fill in
  // between without colliding.
  const kmTicks = $derived.by(() => {
    const total = elevation.totalKm;
    if (!total) return [] as number[];
    const raw = total / 5;
    const pow = Math.pow(10, Math.floor(Math.log10(raw)));
    const step = pow * ([1, 2, 5, 10].find((s) => s * pow >= raw) ?? 10);
    const ticks: number[] = [];
    for (let k = 0; k <= total + 1e-6; k += step) ticks.push(Math.round(k * 10) / 10);
    // Minimum pixel gap kept clear before the right-anchored total label.
    const MIN_END_GAP = 28;
    const endX = chart.x(endKm);
    return ticks.filter((km) => km === 0 || endX - chart.x(km) > MIN_END_GAP);
  });

  const dayIndexAt = (km: number) => {
    let di = 0;
    for (let i = 0; i < elevation.dayOffsetsKm.length; i++) {
      if (km >= elevation.dayOffsetsKm[i]) di = i;
      else break;
    }
    return di;
  };

  // The crosshair, driven by whichever side set the shared hover.
  const cross = $derived.by(() => {
    if (hover.distanceKm == null) return null;
    const km = Math.min(Math.max(hover.distanceKm, 0), elevation.totalKm);
    const m = elevationAtDistance(elevation, km);
    return {
      km,
      m,
      cx: chart.x(km),
      cy: m == null ? null : chart.y(m),
      color: dayColor(dayIndexAt(km))
    };
  });

  // The day the crosshair currently sits in, so its name label can light up.
  const activeDay = $derived(cross ? dayIndexAt(cross.km) : null);

  // One name label per day, laid out in the bottom band. Positioned in CSS pixels
  // (left/width) spanning the day's segment so the text truncates to fit it; the
  // colour ties each label to its route. Days with no distance (degenerate GPX)
  // are skipped so they don't stack a zero-width label at the origin.
  const dayLabels = $derived.by(() => {
    if (!days) return [];
    return days.flatMap((d, i) => {
      const start = elevation.dayOffsetsKm[i] ?? 0;
      const len = elevation.dayLengthsKm[i] ?? 0;
      if (len <= 0) return [];
      const left = chart.x(start);
      return [
        {
          i,
          title: d.title,
          left,
          width: Math.max(0, chart.x(start + len) - left),
          color: dayColor(i)
        }
      ];
    });
  });

  // Cursor x (client coords) → trip distance. Read the geometry off the SVG's own
  // rect so a child <path> under the cursor can't skew the offset.
  const kmAtClientX = (clientX: number): number | null => {
    if (!svgEl) return null;
    const x = clientX - svgEl.getBoundingClientRect().left;
    const km = ((x - PAD.left) / chart.plotW) * chart.total;
    return Math.min(Math.max(km, 0), elevation.totalKm);
  };

  // Pointer → distance, rAF-throttled.
  let raf: number | null = null;
  let pendingX: number | null = null;
  const onMove = (e: PointerEvent) => {
    pendingX = e.clientX;
    if (raf != null) return;
    raf = requestAnimationFrame(() => {
      raf = null;
      if (pendingX == null) return;
      const km = kmAtClientX(pendingX);
      if (km != null) hover.set(km, 'profile');
    });
  };
  const onClick = (e: MouseEvent) => {
    const km = kmAtClientX(e.clientX);
    if (km != null) oncenter?.(km);
  };
  const onLeave = () => {
    if (raf != null) {
      cancelAnimationFrame(raf);
      raf = null;
    }
    hover.clear('profile');
  };
</script>

<!-- ~1/6 of the map height, clamped; a dark scrim + blur keeps it legible over
     satellite imagery. bind:clientWidth/Height feed the SVG scales. -->
<div
  class="absolute inset-x-0 bottom-0 z-30 h-[22%] max-h-[190px] min-h-[110px] border-t border-white/15 bg-black/55 text-white backdrop-blur-sm"
  bind:clientWidth={w}
  bind:clientHeight={h}
>
  {#if hasData}
    <!-- Interaction is inherently position-based (hover/click map to a distance
         along the route), like a canvas — no keyboard equivalent applies. -->
    <!-- svelte-ignore a11y_click_events_have_key_events -->
    <!-- svelte-ignore a11y_no_noninteractive_element_interactions -->
    <svg
      bind:this={svgEl}
      width={w}
      height={chartH}
      class="block cursor-pointer touch-none select-none"
      role="img"
      aria-label="Elevation profile"
      onpointermove={onMove}
      onpointerleave={onLeave}
      onclick={onClick}
    >
      <!-- day boundaries -->
      {#each dayBoundaries as bx (bx)}
        <line x1={bx} x2={bx} y1={PAD.top} y2={chart.baseY} stroke="white" stroke-opacity="0.15" />
      {/each}

      <!-- per-day area + line -->
      {#each dayPaths as g (g.dayIndex)}
        <path d={g.area} fill={dayColor(g.dayIndex)} fill-opacity="0.22" />
        <path
          d={g.line}
          fill="none"
          stroke={dayColor(g.dayIndex)}
          stroke-width="2"
          stroke-linejoin="round"
          stroke-linecap="round"
        />
      {/each}

      <!-- elevation min/max labels -->
      <text x="6" y={PAD.top + 5} class="fill-white text-[13px] font-medium"
        >{Math.round(elevation.maxElevationM)} m</text
      >
      <text x="6" y={chart.baseY} class="fill-white text-[13px] font-medium"
        >{Math.round(elevation.minElevationM)} m</text
      >

      <!-- distance ticks -->
      {#each kmTicks as km (km)}
        <text x={chart.x(km)} y={chartH - 5} text-anchor="middle" class="fill-white/70 text-[10px]"
          >{km} km</text
        >
      {/each}
      <!-- total distance, pinned to the right end like the 0 km origin. -->
      {#if endKm > 0}
        <text
          x={chart.x(endKm)}
          y={chartH - 5}
          text-anchor="end"
          class="fill-white/70 text-[10px]">{endKm} km</text
        >
      {/if}

      <!-- crosshair -->
      {#if cross}
        <line
          x1={cross.cx}
          x2={cross.cx}
          y1={PAD.top}
          y2={chart.baseY}
          stroke={cross.color}
          stroke-width="1.5"
          stroke-opacity="0.9"
        />
        {#if cross.cy != null}
          <circle
            cx={cross.cx}
            cy={cross.cy}
            r="4"
            fill={cross.color}
            stroke="white"
            stroke-width="1.5"
          />
        {/if}
        <text
          x={Math.min(Math.max(cross.cx, PAD.left + 40), w - PAD.right - 40)}
          y={PAD.top - 2}
          text-anchor="middle"
          class="fill-white text-[13px] font-semibold"
          >{cross.km.toFixed(1)} km{cross.m != null ? ` · ${Math.round(cross.m)} m` : ''}</text
        >
      {/if}
    </svg>

    <!-- Day-name strip along the bottom. HTML (not SVG) so each label truncates
         to its segment width with an ellipsis. pointer-events-none keeps the whole
         overlay a single hover surface for the chart above. -->
    <div
      class="pointer-events-none absolute inset-x-0 bottom-0 select-none"
      style="height: {LABEL_BAND}px"
    >
      {#each dayLabels as d (d.i)}
        <div
          class="absolute top-0 flex h-full items-center justify-center px-1 text-[13px] leading-none font-semibold transition-opacity"
          class:opacity-100={activeDay === null || activeDay === d.i}
          class:opacity-40={activeDay !== null && activeDay !== d.i}
          style="left: {d.left}px; width: {d.width}px; color: {d.color}"
          title={d.title}
        >
          <span class="min-w-0 truncate">{d.title}</span>
        </div>
      {/each}
    </div>
  {/if}
</div>
