<script lang="ts">
  import { dayColor } from '$lib/geo';
  import { elevationAtDistance, type ElevationPoint, type TripElevation } from '$lib/elevation';
  import type { RouteHoverState } from './routeHover.svelte.js';
  import type { ProfileCluster } from './types';

  interface Props {
    elevation: TripElevation;
    hover: RouteHoverState;
    days?: { title: string; description: string }[];
    clusters?: ProfileCluster[];
    oncenter?: (distanceKm: number) => void;
  }

  let { elevation, hover, days, clusters, oncenter }: Props = $props();

  /** Inset in px around the plot, leaving room for the axis labels. */
  const PAD = { top: 14, right: 14, bottom: 18, left: 48 };
  /** Height in px of the day-name strip below the chart. */
  const LABEL_BAND = 22;
  /** Radius in px of a cluster dot at rest, and once hovered. */
  const DOT_R = 6;
  const DOT_HOVER_R = 16;
  /** Narrowest span in px worth drawing a band for. */
  const MIN_SPAN_PX = 4;
  /** How long a dot takes to open, in ms. Paired with the CSS at the foot of the file. */
  const DOT_OPEN_MS = 220;

  let w = $state(0);
  let h = $state(0);
  let svgEl: SVGSVGElement | undefined = $state();

  const chartH = $derived(Math.max(1, h - LABEL_BAND));

  const hasData = $derived(elevation.series.length > 1 && elevation.totalKm > 0);

  /** Plot box, plus `x` and `y` mapping km and metres to pixel coordinates. */
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

  const dayBoundaries = $derived(elevation.dayOffsetsKm.slice(1).map((km) => chart.x(km)));

  const endKm = $derived(Math.round(elevation.totalKm * 10) / 10);

  /** About 5 round-numbered distance ticks, minus any that would crowd the end label. */
  const kmTicks = $derived.by(() => {
    const total = elevation.totalKm;
    if (!total) return [] as number[];
    const raw = total / 5;
    const pow = Math.pow(10, Math.floor(Math.log10(raw)));
    const step = pow * ([1, 2, 5, 10].find((s) => s * pow >= raw) ?? 10);
    const ticks: number[] = [];
    for (let k = 0; k <= total + 1e-6; k += step) ticks.push(Math.round(k * 10) / 10);
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

  const activeDay = $derived(cross ? dayIndexAt(cross.km) : null);

  let hoveredCluster = $state<string | null>(null);
  /** Scopes the clip path to this component, so a second profile can't reuse it. */
  const uid = $props.id();
  const faceClip = `${uid}-face`;

  /**
   * Cluster dots sitting on the curve. Sorted widest span first so the small,
   * precise dots end up drawn on top of the broad ones and stay clickable.
   */
  const placedClusters = $derived.by(() => {
    if (!clusters) return [];
    return clusters
      .flatMap((c) => {
        const m = elevationAtDistance(elevation, c.distanceKm);
        if (m == null) return [];
        return [
          {
            ...c,
            cx: chart.x(c.distanceKm),
            cy: chart.y(m),
            spanX: chart.x(c.fromKm),
            spanW: chart.x(c.toKm) - chart.x(c.fromKm)
          }
        ];
      })
      .sort((a, b) => b.spanW - a.spanW);
  });

  /**
   * Places each day's title over its own stretch of the chart. Days of zero
   * length are skipped, as their labels would stack up at the origin.
   */
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

  /**
   * Turns a pointer's client x into a distance along the trip in km. Measures the
   * SVG's own rect, as a child <path> under the cursor would skew the offset.
   */
  const kmAtClientX = (clientX: number): number | null => {
    if (!svgEl) return null;
    const x = clientX - svgEl.getBoundingClientRect().left;
    const km = ((x - PAD.left) / chart.plotW) * chart.total;
    return Math.min(Math.max(km, 0), elevation.totalKm);
  };

  // Coalesces pointermove into one hover write per frame.
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

<div
  class="absolute inset-x-0 bottom-0 z-30 h-[22%] max-h-47.5 min-h-27.5 border-t border-white/15 bg-black/55 text-white backdrop-blur-sm"
  style="--dot-open: {DOT_OPEN_MS}ms"
  bind:clientWidth={w}
  bind:clientHeight={h}
>
  {#if hasData}
    <!-- Ignoring because interaction is pointer-only. -->
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
      {#each dayBoundaries as bx (bx)}
        <line x1={bx} x2={bx} y1={PAD.top} y2={chart.baseY} stroke="white" stroke-opacity="0.15" />
      {/each}

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

      <text x="6" y={PAD.top + 5} class="fill-white text-[13px] font-medium"
        >{Math.round(elevation.maxElevationM)} m</text
      >
      <text x="6" y={chart.baseY} class="fill-white text-[13px] font-medium"
        >{Math.round(elevation.minElevationM)} m</text
      >

      {#each kmTicks as km (km)}
        <text x={chart.x(km)} y={chartH - 5} text-anchor="middle" class="fill-white/70 text-[10px]"
          >{km} km</text
        >
      {/each}
      {#if endKm > 0}
        <text x={chart.x(endKm)} y={chartH - 5} text-anchor="end" class="fill-white/70 text-[10px]"
          >{endKm} km</text
        >
      {/if}

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

      <defs>
        <!-- One clip per dot, its radius animating with the dot, so the photo is
             revealed by the circle growing rather than appearing at full size. -->
        {#each placedClusters as c (c.key)}
          <clipPath id="{faceClip}-{c.key}">
            <circle
              class="dot-part"
              cx="0"
              cy="0"
              r={hoveredCluster === c.key ? DOT_HOVER_R - 2 : DOT_R}
            />
          </clipPath>
        {/each}
      </defs>

      {#each placedClusters as c (c.key)}
        {@const active = hoveredCluster === c.key}
        <!-- Photos close together on the map can be far apart along the route, so
             hovering reveals the stretch this dot actually stands for. -->
        <rect
          class="dot-part"
          x={c.spanX}
          y={PAD.top}
          width={c.spanW}
          height={chart.baseY - PAD.top}
          fill={c.color}
          fill-opacity={active && c.spanW > MIN_SPAN_PX ? 0.2 : 0}
          pointer-events="none"
        />
        <!-- svelte-ignore a11y_click_events_have_key_events -->
        <!-- svelte-ignore a11y_no_static_element_interactions -->
        <g
          transform="translate({c.cx.toFixed(1)},{c.cy.toFixed(1)})"
          class="cursor-pointer"
          onpointerenter={() => (hoveredCluster = c.key)}
          onpointerleave={() => (hoveredCluster = null)}
          onclick={(e) => {
            // Otherwise the svg's own handler would also recentre on this km.
            e.stopPropagation();
            c.onselect();
          }}
        >
          <!-- Hit area stays the expanded size at all times. Were it to grow with
               the dot, the pointer would fall in and out of it mid-animation and
               the dot would flicker. -->
          <circle r={DOT_HOVER_R} fill="transparent" />

          <g class="dot-part" style="opacity: {active ? 0 : 1}" pointer-events="none">
            <circle
              class="dot-part"
              r={active ? DOT_HOVER_R : DOT_R}
              fill={c.color}
              stroke="white"
              stroke-width="1.5"
            />
            <text text-anchor="middle" dy="2.5" class="fill-white text-[8px] font-bold"
              >{c.count}</text
            >
          </g>

          <g class="dot-part" style="opacity: {active ? 1 : 0}" pointer-events="none">
            <circle class="dot-part" r={active ? DOT_HOVER_R : DOT_R} fill="black" />
            <image
              href={c.thumbnail}
              x={-(DOT_HOVER_R - 2)}
              y={-(DOT_HOVER_R - 2)}
              width={(DOT_HOVER_R - 2) * 2}
              height={(DOT_HOVER_R - 2) * 2}
              clip-path="url(#{faceClip}-{c.key})"
              preserveAspectRatio="xMidYMid slice"
            />
            <circle
              class="dot-part"
              r={active ? DOT_HOVER_R : DOT_R}
              fill="none"
              stroke={c.color}
              stroke-width="2.5"
            />
            <circle cx={DOT_HOVER_R - 3} cy={DOT_HOVER_R - 3} r="8" fill={c.color} />
            <text
              x={DOT_HOVER_R - 3}
              y={DOT_HOVER_R - 3}
              text-anchor="middle"
              dy="3"
              class="fill-white text-[9px] font-bold">{c.count}</text
            >
          </g>
        </g>
      {/each}
    </svg>

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

<style>
  /* Drives the dot open and shut. `r` and `fill-opacity` are animatable SVG
     geometry/paint properties; --dot-open is set on the container above. */
  .dot-part {
    transition:
      r var(--dot-open) ease-out,
      opacity var(--dot-open) ease-out,
      fill-opacity var(--dot-open) ease-out;
  }
</style>
