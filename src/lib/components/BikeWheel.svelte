<script lang="ts">
  import { onMount } from 'svelte';
  import gsap from 'gsap';
  import { TYRE_PATH, RIM_PATH, HUB_PATH } from './wheel-paths';

  interface Props {
    trips: { name: string }[];
    onSelect: (name: string) => void;
    class?: string;
  }

  let { trips, onSelect, class: className }: Props = $props();

  // Geometry in viewBox units, measured off the paths below: the wheel is
  // centred on (50,50) with a hub of r≈3.5 and an inner rim at r≈32, so a spoke
  // has 27 units to work with.
  const CENTER = 50;
  const SPOKE_START = 54.5; // just outside the hub
  const SPOKE_END = 81.5; // just inside the rim
  const RIM_R = 32; // inner edge of the rim — the disc the spokes live in
  const TYRE_R = 44.7; // outer edge of the knobby tyre — the bit that touches ground
  const LABEL_X = (SPOKE_START + SPOKE_END) / 2;
  const LABEL_PAD = 1.5;

  // --- Landscape ------------------------------------------------------------
  // The ground scrolls right-to-left under a horizontally fixed wheel. These are
  // all free to tune by eye — the derived values below re-fit the frame and the
  // spin around whatever they're set to.
  const GROUND_MEAN = 100; // mean height of the ground surface
  const DIRT_DEPTH = 18; // how much dirt shows below the lowest trough
  const SPEED = 20; // viewBox units of ground travelled per second

  // Integer harmonics of TILE, so the surface is exactly periodic over one tile
  // and the seam is invisible without hand-matching endpoints.
  const TILE = 200;
  const HILLS = [
    { harmonic: 2, amp: 5, phase: 0 },
    { harmonic: 5, amp: 2.5, phase: 1.7 }
  ];
  const MAX_RISE = HILLS.reduce((sum, h) => sum + h.amp, 0);
  const VIEW_H = GROUND_MEAN + MAX_RISE + DIRT_DEPTH;

  // Authoring the surface as a function rather than a hand-drawn path is what
  // makes the bob free: the wheel's height is just surfaceAt(contact point), no
  // sampling the path geometry to find where the ground is.
  const surfaceAt = (x: number) =>
    GROUND_MEAN -
    HILLS.reduce(
      (sum, h) => sum + h.amp * Math.sin((2 * Math.PI * h.harmonic * x) / TILE + h.phase),
      0
    );

  // A fixed viewBox letterboxes, which leaves the land as a strip with blank
  // margins in a wide panel. Instead the height is fixed — that's what sets the
  // wheel's size — and the width tracks the container's aspect ratio, so the
  // ground always runs the full width. Clamped so a narrow panel letterboxes
  // rather than cropping the wheel, which is ~90 units across.
  const MIN_VIEW_W = 100;
  const FALLBACK_ASPECT = 1.6; // used for the first paint, before measurement
  let boxW = $state(0);
  let boxH = $state(0);
  const VIEW_W = $derived(
    boxW > 0 && boxH > 0 ? Math.max(MIN_VIEW_W, (VIEW_H * boxW) / boxH) : VIEW_H * FALLBACK_ASPECT
  );

  // Enough whole tiles to cover the frame plus the one tile the ground scrolls
  // through, so there is always terrain queued off the right edge.
  const SPAN = $derived((Math.ceil(VIEW_W / TILE) + 1) * TILE);
  const SAMPLES_PER_TILE = 160; // dense enough that the polyline reads as a curve

  const ridgePath = $derived(
    'M ' +
      Array.from({ length: (SPAN / TILE) * SAMPLES_PER_TILE + 1 }, (_, i) => {
        const x = (i * TILE) / SAMPLES_PER_TILE;
        return `${x.toFixed(2)},${surfaceAt(x).toFixed(2)}`;
      }).join(' L ')
  );
  const dirtPath = $derived(`${ridgePath} L ${SPAN},${VIEW_H} L 0,${VIEW_H} Z`);

  // Whole-number division of TILE is the whole point — see the pattern below.
  const GRAVEL_W = TILE / 8;
  const GRAVEL = [
    { x: 0.16, y: 5, r: 0.9, fill: '#8b7355' },
    { x: 0.58, y: 2.5, r: 0.55, fill: '#3a2a18' },
    { x: 0.82, y: 9, r: 1.1, fill: '#9c8a72' },
    { x: 0.35, y: 12, r: 0.7, fill: '#3a2a18' },
    { x: 0.93, y: 16, r: 0.6, fill: '#8b7355' },
    { x: 0.08, y: 17, r: 0.85, fill: '#6f563a' },
    { x: 0.67, y: 14.5, r: 0.5, fill: '#9c8a72' }
  ];

  // Rolling without slipping: one revolution must cover exactly the tyre's
  // circumference of ground, so the spin duration falls out of SPEED rather
  // than being chosen. Both tweens are linear, so they never drift apart.
  const SECONDS_PER_REVOLUTION = (2 * Math.PI * TYRE_R) / SPEED;

  let scrollX = $state(0);
  // The wheel's own paths are centred on CENTER, so it rides a horizontal offset
  // to stay in the middle of a viewBox whose width now varies.
  const wheelX = $derived(VIEW_W / 2 - CENTER);
  // Rest offset puts the tyre's bottom on the mean ground line; the rest is how
  // far the surface sits above or below that where the wheel currently touches.
  const wheelY = $derived(surfaceAt(scrollX + VIEW_W / 2) - TYRE_R - CENTER);

  const angle = $derived(360 / Math.max(trips.length, 1));

  // The label interrupts its spoke, so each line is two segments with a gap
  // sized to the *rendered* text. A fixed gap can't work: it would either clip a
  // long trip name or leave a hole punched under a short one.
  let labels = $state<SVGTextElement[]>([]);
  let widths = $state<number[]>([]);

  $effect(() => {
    widths = labels.map((el) => el?.getComputedTextLength() ?? 0);
  });

  const gapFor = (i: number) => (widths[i] ?? 0) / 2 + LABEL_PAD;

  // Picking a trip navigates, and the load waits on Immich — so the wheel spends
  // that time tearing off down the road as the loading state. Free to tune: how
  // much faster than rolling pace it ends up, and how long it takes to get there.
  const LAUNCH_TIMESCALE = 14;
  const LAUNCH_RAMP = 1.4;

  // Body and spokes rotate as separate groups so they can be reasoned about
  // separately, but hovering eases all three tweens down together — the tyre,
  // the spokes and the ground — so the whole scene coasts to a stop as one.
  let body = $state<SVGGElement>();
  let spokes = $state<SVGGElement>();
  let bodySpin: ReturnType<typeof gsap.to> | undefined;
  let spokeSpin: ReturnType<typeof gsap.to> | undefined;
  let ramp: ReturnType<typeof gsap.to> | undefined;
  let roll: ReturnType<typeof gsap.to> | undefined;
  let launched = false;
  let settle: (() => void) | undefined;

  onMount(() => {
    // +page.ts sets ssr = false, so this only ever runs in the browser.
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;

    // svgOrigin pins the pivot to the hub in user-space units, sidestepping the
    // usual transform-origin percentage confusion on SVG. A linear ease matters:
    // anything else visibly pulses once per revolution — and it's what keeps the
    // two tweens in lockstep while both run at full speed.
    const spinning = {
      rotation: 360,
      duration: SECONDS_PER_REVOLUTION,
      ease: 'none',
      repeat: -1,
      svgOrigin: `${CENTER} ${CENTER}`
    };

    bodySpin = gsap.to(body!, spinning);
    spokeSpin = gsap.to(spokes!, spinning);

    // The ground is tweened as a plain number rather than a transform on the
    // node: `scrollX` also feeds `wheelY`, so one tween drives both the scroll
    // and the bob and they cannot fall out of sync. Looping over exactly one
    // tile is what makes the seam invisible.
    const position = { x: 0 };
    roll = gsap.to(position, {
      x: TILE,
      duration: TILE / SPEED,
      ease: 'none',
      repeat: -1,
      onUpdate: () => (scrollX = position.x)
    });

    return () => {
      bodySpin?.kill();
      spokeSpin?.kill();
      ramp?.kill();
      roll?.kill();
      settle?.();
    };
  });

  // Only timeScale is ever touched, never the underlying tweens' progress — so
  // everything coasts to rest wherever it happened to be and picks up from that
  // same point, and the ground and the spin stay locked to each other through
  // the slowdown rather than drifting apart. Killing the in-flight tween keeps a
  // flicked cursor from queueing two that fight each other.
  const ease = (timeScale: number) => {
    if (!spokeSpin || launched) return;
    ramp?.kill();
    ramp = gsap.to([bodySpin, spokeSpin, roll], {
      timeScale,
      duration: 0.8,
      ease: 'power2.out'
    });
  };

  // Exported rather than called from the spoke handlers, so the dropdown and the
  // wheel drive the same animation through one entry point — the page calls this
  // and then navigates. Resolving when the ramp finishes lets the caller hold the
  // wheel on screen for exactly as long as the animation needs, without having to
  // know LAUNCH_RAMP. Under reduced motion there is no animation and it resolves
  // immediately, so that path doesn't stall on a stationary wheel.
  //
  // The spokes sit the launch out: they carry the trip labels, and a name that
  // stays readable while the tyre blurs past is the point. They're already at
  // rest for a pointer user — the hover that preceded the click stopped them —
  // so the explicit zero is only for keyboard activation. `launched` latches so
  // a pointerleave on the way out can't ease everything back down to 1.
  export function launch(): Promise<void> {
    if (!bodySpin || launched) return Promise.resolve();
    launched = true;
    ramp?.kill();
    spokeSpin?.timeScale(0);
    return new Promise((resolve) => {
      // Held so unmounting mid-ramp settles the promise instead of leaving the
      // caller awaiting an onComplete that the cleanup's kill() will never fire.
      settle = resolve;
      ramp = gsap.to([bodySpin, roll], {
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

<!-- The wrapper exists to be measured: VIEW_W is computed from its aspect ratio
     so the viewBox matches the box exactly and the land reaches both edges. -->
<div bind:clientWidth={boxW} bind:clientHeight={boxH} class={className}>
  <svg
    viewBox="0 0 {VIEW_W} {VIEW_H}"
    class="h-full w-full text-neutral-600"
    role="group"
    aria-label="Select a trip"
  >
    <defs>
      <!-- An svg's overflow clips to the element's box, not the viewBox. The
           viewBox now matches the container, so there are normally no margins to
           leak into — but a panel narrow enough to hit MIN_VIEW_W letterboxes
           again, and the terrain runs a full tile past the right edge. Without
           this clip that overhang paints into the margins at the end of a loop
           and vanishes at the start, reading as the land jumping. -->
      <clipPath id="frame">
        <rect x="0" y="0" width={VIEW_W} height={VIEW_H} />
      </clipPath>

      <!-- userSpaceOnUse rather than the default: the pattern then resolves in the
         scrolling group's coordinates, so the gravel travels with the dirt
         instead of sitting still behind it. That also means its width has to
         divide TILE exactly — otherwise the specks snap sideways at the loop
         point while the dirt underneath them doesn't, which reads as the whole
         landscape resetting. Speck positions are fractions of GRAVEL_W so they
         stay spread out if TILE changes. -->
      <pattern id="gravel" patternUnits="userSpaceOnUse" width={GRAVEL_W} height="19">
        {#each GRAVEL as speck}
          <circle cx={speck.x * GRAVEL_W} cy={speck.y} r={speck.r} fill={speck.fill} />
        {/each}
      </pattern>
    </defs>

    <!-- Everything the wheel is made of rides this one translate, so the bob
       applies to the tyre, the spokes and the labels together. The spin tweens
       target the groups inside it, so the two transforms don't collide. -->
    <g transform="translate({wheelX} {wheelY})">
      <!-- The wheel body. Only the knobby tyre reads as moving — the rim and hub are
       rotationally symmetric — but that's exactly the bit that should keep
       turning once the spokes have stopped. -->
      <g bind:this={body}>
        <path fill="currentColor" d={TYRE_PATH} />
        <path fill="currentColor" d={RIM_PATH} />
        <path fill="currentColor" d={HUB_PATH} />
      </g>

      <!-- The hit disc and the spokes share this wrapper deliberately. pointerenter
       and pointerleave only count descendants, so if the disc were a bare
       sibling underneath the spokes, moving onto a spoke would read as leaving
       the disc and restart the spin. -->
      <g
        role="group"
        aria-label="Trips"
        onpointerenter={() => ease(0)}
        onpointerleave={() => ease(1)}
      >
        <circle cx={CENTER} cy={CENTER} r={RIM_R} fill="transparent" />

        <g bind:this={spokes}>
          {#each trips as trip, i (trip.name)}
            <g
              class="cursor-pointer text-neutral-600 transition-colors hover:text-hazy-ipa"
              transform="rotate({i * angle} {CENTER} {CENTER})"
              role="button"
              tabindex="0"
              aria-label={trip.name}
              onclick={() => onSelect(trip.name)}
              onkeydown={(event) => activate(event, trip.name)}
            >
              <!-- Thin lines and small text are miserable to click, so a fat
               invisible line widens the target without changing the look. -->
              <line
                x1={SPOKE_START}
                y1={CENTER}
                x2={SPOKE_END}
                y2={CENTER}
                stroke="transparent"
                stroke-width="8"
              />
              <line
                x1={SPOKE_START}
                y1={CENTER}
                x2={Math.max(SPOKE_START, LABEL_X - gapFor(i))}
                y2={CENTER}
                stroke="currentColor"
                stroke-width="1.2"
              />
              <line
                x1={Math.min(SPOKE_END, LABEL_X + gapFor(i))}
                y1={CENTER}
                x2={SPOKE_END}
                y2={CENTER}
                stroke="currentColor"
                stroke-width="1.2"
              />
              <text
                bind:this={labels[i]}
                x={LABEL_X}
                y={CENTER}
                fill="currentColor"
                font-size="2.8"
                font-weight="bold"
                text-anchor="middle"
                dominant-baseline="middle"
                class="select-none uppercase">{trip.name}</text
              >
            </g>
          {/each}
        </g>
      </g>
    </g>

    <!-- Drawn after the wheel so the ground overlaps the contact patch — the tyre
       reads as sitting *in* the dirt rather than balanced on a line, and it
       hides the fact that the hub only tracks the surface directly beneath it. -->
    <!-- The clip lives on an untransformed wrapper on purpose: an element's own
       transform carries its clip path along with it, so clipping the scrolling
       group directly would slide the clip off-frame with the terrain. -->
    <g clip-path="url(#frame)">
      <g transform="translate({-scrollX} 0)">
        <path d={dirtPath} fill="#5c4229" />
        <path d={dirtPath} fill="url(#gravel)" />
        <path
          d={ridgePath}
          fill="none"
          stroke="#5a8c3e"
          stroke-width="2.6"
          stroke-linecap="round"
          stroke-linejoin="round"
        />
      </g>
    </g>
  </svg>
</div>
