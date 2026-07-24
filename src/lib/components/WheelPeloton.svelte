<script lang="ts">
  import { onMount } from 'svelte';
  import gsap from 'gsap';
  import { TYRE_PATH, RIM_PATH, HUB_PATH, TYRE_R } from './wheel-paths';

  // The mobile counterpart to BikeWheel: instead of one big spoked wheel whose
  // spokes are the trips, every trip gets its own small wheel and the pack rolls
  // across a static strip of ground like a peloton. The name of whichever wheel
  // is nearest the centre shows once, at the top. Tapping any wheel navigates.
  interface Props {
    trips: { name: string }[];
    onSelect: (name: string) => void;
    class?: string;
  }

  let { trips, onSelect, class: className }: Props = $props();

  // --- Ground ---------------------------------------------------------------
  // Height is fixed (that sets the wheel size); width tracks the container's
  // aspect ratio so the land always reaches both edges — same trick as BikeWheel.
  const GROUND_MEAN = 74; // mean height of the ground surface
  const DIRT_DEPTH = 14; // dirt shown below the lowest trough
  const WHEEL_R = 20; // wheel radius in viewBox units; scales the shared art down
  const MARGIN = 32; // off-frame gutter a wheel wraps through, unseen
  const SPEED = 12; // viewBox units of travel per second — tune the pace

  // Integer harmonics of TILE keep the surface exactly periodic; gentle amps so
  // the pack bobs rather than lurches.
  const TILE = 200;
  const HILLS = [
    { harmonic: 2, amp: 3.5, phase: 0 },
    { harmonic: 5, amp: 1.6, phase: 1.7 }
  ];
  const MAX_RISE = HILLS.reduce((sum, h) => sum + h.amp, 0);
  const VIEW_H = GROUND_MEAN + MAX_RISE + DIRT_DEPTH;

  const surfaceAt = (x: number) =>
    GROUND_MEAN -
    HILLS.reduce(
      (sum, h) => sum + h.amp * Math.sin((2 * Math.PI * h.harmonic * x) / TILE + h.phase),
      0
    );

  const MIN_VIEW_W = 120;
  const FALLBACK_ASPECT = 1.6; // used for the first paint, before measurement
  let boxW = $state(0);
  let boxH = $state(0);
  const VIEW_W = $derived(
    boxW > 0 && boxH > 0 ? Math.max(MIN_VIEW_W, (VIEW_H * boxW) / boxH) : VIEW_H * FALLBACK_ASPECT
  );

  const SAMPLES = 480; // dense enough that the ridge reads as a curve
  const ridgePath = $derived(
    'M ' +
      Array.from({ length: SAMPLES + 1 }, (_, i) => {
        const x = (i * VIEW_W) / SAMPLES;
        return `${x.toFixed(2)},${surfaceAt(x).toFixed(2)}`;
      }).join(' L ')
  );
  const dirtPath = $derived(`${ridgePath} L ${VIEW_W},${VIEW_H} L 0,${VIEW_H} Z`);

  // The art is authored centred on (50,50) spanning ±TYRE_R; scale it so the
  // tyre's radius lands on WHEEL_R.
  const SCALE = WHEEL_R / TYRE_R;

  // --- Motion ---------------------------------------------------------------
  // One ever-increasing distance drives everything: a wheel's screen position is
  // that distance modulo the track, and its spin is the same distance over its
  // radius — so translation and rotation are the *same* number and the wheels
  // can't skid. `offset` only grows (never resets), so the spin stays continuous
  // while the position wraps unseen through the off-frame gutters.
  const N = $derived(Math.max(trips.length, 1));
  const TRACK = $derived(VIEW_W + 2 * MARGIN); // one wrap period
  let offset = $state(0);
  let reduced = $state(false);

  // Evenly spread across the visible width when parked (reduced motion); when
  // rolling, spaced one track-slot apart and slid along by `offset`.
  const centres = $derived(
    reduced
      ? trips.map((_, i) => (VIEW_W * (i + 1)) / (N + 1))
      : trips.map((_, i) => (((i * TRACK) / N + offset) % TRACK) - MARGIN)
  );
  const rotation = $derived((offset / WHEEL_R) * (180 / Math.PI));

  // Each wheel wears its own name, sat upright over the clear disc inside the rim
  // (the tyre spins under it, the label doesn't). Names vary in length, so each is
  // rendered at a fixed size, measured, and scaled down only as far as it must to
  // fit that disc — a fixed size would clip "Vancouver Island" or float lost under
  // "Seattle". Measuring at a fixed size (never the fitted one) keeps it stable.
  const RIM_INNER = 32; // art-space inner edge of the rim — the label's clear disc
  const LABEL_SIZE = 5; // font size in art units, before the per-name fit
  const LABEL_MAX_W = RIM_INNER * 1.75; // widest a name may render inside the rim
  const LABEL_Y = -WHEEL_R * 0.4; // viewBox units the name sits above the hub
  let labels = $state<SVGTextElement[]>([]);
  let widths = $state<number[]>([]);
  $effect(() => {
    widths = labels.map((el) => el?.getComputedTextLength() ?? 0);
  });
  const fitFor = (i: number) => (widths[i] ? Math.min(1, LABEL_MAX_W / widths[i]) : 1);

  // Picking a trip navigates, and the load waits on Immich — so the pack tears
  // off down the road as the loading state, the same send-off BikeWheel gives.
  const LAUNCH_TIMESCALE = 12;
  const LAUNCH_RAMP = 1.4;

  let roll: ReturnType<typeof gsap.to> | undefined;
  let ramp: ReturnType<typeof gsap.to> | undefined;
  let launched = false;
  let settle: (() => void) | undefined;

  onMount(() => {
    // +page.ts sets ssr = false, so this only runs in the browser.
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
      reduced = true;
      return;
    }

    // A single linear tween on a far-off target: effectively endless, and a plain
    // linear ease is what keeps position and spin locked as one.
    const pos = { d: 0 };
    roll = gsap.to(pos, {
      d: 1e6,
      duration: 1e6 / SPEED,
      ease: 'none',
      onUpdate: () => (offset = pos.d)
    });

    return () => {
      roll?.kill();
      ramp?.kill();
      settle?.();
    };
  });

  // Exported so the page drives the same animation whether the trip was picked
  // from a wheel or the dropdown, and can hold the pack on screen for exactly as
  // long as the ramp needs. Under reduced motion there is nothing to ramp, so it
  // resolves immediately rather than stalling on a parked pack.
  export function launch(): Promise<void> {
    if (!roll || launched) return Promise.resolve();
    launched = true;
    ramp?.kill();
    const rollTween = roll;
    return new Promise((resolve) => {
      settle = resolve;
      ramp = gsap.to(rollTween, {
        timeScale: LAUNCH_TIMESCALE,
        duration: LAUNCH_RAMP,
        ease: 'power2.in',
        onComplete: resolve
      });
    });
  }

  const activate = (event: KeyboardEvent, name: string) => {
    if (event.key !== 'Enter' && event.key !== ' ') return;
    event.preventDefault();
    onSelect(name);
  };
</script>

<!-- Wrapper is measured (VIEW_W follows its aspect). -->
<div bind:clientWidth={boxW} bind:clientHeight={boxH} class={className}>
  <svg
    viewBox="0 0 {VIEW_W} {VIEW_H}"
    class="h-full w-full"
    role="group"
    aria-label="Select a trip"
  >
    {#each trips as trip, i (trip.name)}
      {@const cx = centres[i]}
      {@const cy = surfaceAt(cx) - WHEEL_R}
      <g
        class="cursor-pointer text-neutral-600 transition-colors hover:text-hazy-ipa"
        transform="translate({cx} {cy})"
        role="button"
        tabindex="0"
        aria-label={trip.name}
        onclick={() => onSelect(trip.name)}
        onkeydown={(event) => activate(event, trip.name)}
      >
        <!-- A filled hit disc under the art so the whole wheel is tappable, not
             just the ink of the knobby tyre. -->
        <circle r={WHEEL_R} fill="transparent" />
        <!-- Only the art spins; the label group is a sibling so the name stays
             upright while the tyre turns beneath it. -->
        <g transform="scale({SCALE}) translate(-50 -50) rotate({rotation} 50 50)">
          <path fill="currentColor" d={TYRE_PATH} />
          <path fill="currentColor" d={RIM_PATH} />
          <path fill="currentColor" d={HUB_PATH} />
        </g>
        <g transform="translate(0 {LABEL_Y}) scale({SCALE * fitFor(i)})">
          <text
            bind:this={labels[i]}
            x="0"
            y="0"
            font-size={LABEL_SIZE}
            font-weight="bold"
            text-anchor="middle"
            dominant-baseline="middle"
            fill="currentColor"
            class="select-none uppercase">{trip.name}</text
          >
        </g>
      </g>
    {/each}

    <!-- Drawn after the wheels so the tyres sit *in* the dirt, not on a line. -->
    <path d={dirtPath} fill="#5c4229" />
    <path
      d={ridgePath}
      fill="none"
      stroke="#5a8c3e"
      stroke-width="2.6"
      stroke-linecap="round"
      stroke-linejoin="round"
    />
  </svg>
</div>
