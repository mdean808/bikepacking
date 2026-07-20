<script lang="ts">
  import { onMount } from 'svelte';
  import gsap from 'gsap';

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
        <path
          fill="currentColor"
          d="m 91.184,53.5 c 1.933,0 3.5,-1.566 3.5,-3.5 0,-1.933 -1.567,-3.5 -3.5,-3.5 -0.03,0 -0.061,0.004 -0.091,0.005 -0.106,-1.272 -0.269,-2.529 -0.487,-3.766 0.026,-0.007 0.054,-0.01 0.08,-0.018 1.867,-0.5 2.976,-2.419 2.476,-4.286 -0.42,-1.563 -1.834,-2.595 -3.379,-2.595 -0.3,0 -0.604,0.038 -0.908,0.12 -0.024,0.006 -0.047,0.016 -0.07,0.022 -0.432,-1.197 -0.917,-2.368 -1.452,-3.511 0.021,-0.012 0.043,-0.021 0.064,-0.033 1.674,-0.966 2.247,-3.106 1.281,-4.781 -0.648,-1.122 -1.825,-1.75 -3.035,-1.75 -0.593,0 -1.195,0.151 -1.746,0.47 -0.021,0.012 -0.038,0.025 -0.058,0.037 -0.725,-1.042 -1.496,-2.049 -2.311,-3.018 0.016,-0.015 0.032,-0.028 0.048,-0.043 1.367,-1.367 1.367,-3.583 0,-4.95 -0.684,-0.684 -1.579,-1.025 -2.475,-1.025 -0.896,0 -1.792,0.342 -2.475,1.025 -0.013,0.013 -0.022,0.025 -0.034,0.038 -0.967,-0.819 -1.971,-1.596 -3.011,-2.325 0.007,-0.011 0.015,-0.021 0.021,-0.032 0.966,-1.675 0.393,-3.815 -1.281,-4.781 -0.551,-0.318 -1.153,-0.47 -1.747,-0.47 -1.21,0 -2.386,0.628 -3.034,1.751 -0.003,0.004 -0.005,0.009 -0.008,0.014 -1.144,-0.541 -2.315,-1.033 -3.514,-1.47 0,-10e-4 0,-0.002 0.001,-0.003 0.5,-1.867 -0.608,-3.786 -2.476,-4.286 -0.303,-0.082 -0.607,-0.12 -0.908,-0.12 -1.541,0 -2.951,1.026 -3.374,2.583 -1.28,-0.231 -2.582,-0.401 -3.9,-0.512 -0.015,-1.921 -1.574,-3.474 -3.499,-3.474 -1.924,0 -3.483,1.553 -3.498,3.474 -1.28,0.107 -2.545,0.271 -3.79,0.491 -0.43,-1.545 -1.834,-2.562 -3.369,-2.562 -0.299,0 -0.604,0.038 -0.907,0.12 -1.855,0.497 -2.959,2.395 -2.482,4.251 -1.204,0.435 -2.382,0.925 -3.531,1.466 -0.652,-1.105 -1.818,-1.723 -3.018,-1.723 -0.594,0 -1.194,0.151 -1.745,0.47 -1.666,0.962 -2.241,3.086 -1.294,4.756 -1.024,0.715 -2.015,1.475 -2.969,2.277 -0.675,-0.637 -1.54,-0.956 -2.404,-0.956 -0.895,0 -1.788,0.341 -2.471,1.023 -1.34,1.34 -1.363,3.493 -0.077,4.865 -0.83,0.979 -1.616,1.997 -2.354,3.052 -0.521,-0.277 -1.085,-0.41 -1.641,-0.41 -1.208,0 -2.382,0.626 -3.03,1.747 -0.942,1.634 -0.417,3.707 1.164,4.705 -0.549,1.16 -1.045,2.35 -1.484,3.566 -0.257,-0.058 -0.514,-0.085 -0.767,-0.085 -1.545,0 -2.958,1.027 -3.377,2.591 -0.486,1.818 0.554,3.682 2.333,4.24 C 8.946,43.932 8.78,45.211 8.672,46.506 6.808,46.583 5.316,48.115 5.316,50 c 0,1.885 1.491,3.417 3.356,3.493 0.108,1.295 0.274,2.574 0.499,3.832 -1.779,0.559 -2.819,2.422 -2.333,4.24 0.419,1.562 1.833,2.592 3.377,2.592 0.253,0 0.51,-0.029 0.767,-0.086 0.439,1.217 0.936,2.406 1.484,3.566 -1.581,0.998 -2.106,3.072 -1.164,4.705 0.648,1.121 1.822,1.748 3.03,1.748 0.556,0 1.118,-0.133 1.641,-0.41 0.737,1.055 1.523,2.072 2.354,3.051 -1.286,1.373 -1.263,3.525 0.077,4.865 0.683,0.682 1.576,1.023 2.471,1.023 0.865,0 1.729,-0.318 2.404,-0.955 0.98,0.824 2,1.604 3.055,2.336 -0.9,1.66 -0.322,3.746 1.324,4.697 0.551,0.316 1.151,0.469 1.744,0.469 1.184,0 2.335,-0.602 2.992,-1.68 1.155,0.539 2.339,1.027 3.55,1.461 -0.452,1.844 0.648,3.719 2.491,4.213 0.303,0.082 0.607,0.121 0.907,0.121 1.527,0 2.927,-1.01 3.362,-2.545 1.209,0.211 2.437,0.369 3.68,0.473 0.015,1.922 1.574,3.475 3.498,3.475 1.925,0 3.484,-1.553 3.499,-3.475 1.28,-0.107 2.545,-0.27 3.79,-0.492 0.43,1.547 1.834,2.564 3.368,2.564 0.3,0 0.604,-0.039 0.908,-0.121 1.855,-0.496 2.959,-2.395 2.482,-4.25 1.204,-0.436 2.382,-0.926 3.531,-1.467 0.652,1.105 1.818,1.723 3.018,1.723 0.594,0 1.194,-0.152 1.745,-0.469 1.666,-0.963 2.241,-3.088 1.294,-4.758 1.069,-0.746 2.102,-1.541 3.093,-2.381 0.013,0.012 0.022,0.025 0.034,0.037 0.684,0.684 1.58,1.025 2.476,1.025 0.896,0 1.791,-0.342 2.475,-1.025 1.367,-1.367 1.367,-3.582 0,-4.949 -0.016,-0.016 -0.032,-0.029 -0.048,-0.045 0.814,-0.969 1.586,-1.975 2.311,-3.016 0.02,0.012 0.037,0.025 0.058,0.037 0.551,0.318 1.152,0.469 1.746,0.469 1.21,0 2.387,-0.627 3.034,-1.75 0.967,-1.674 0.394,-3.814 -1.28,-4.781 -0.021,-0.012 -0.043,-0.021 -0.064,-0.033 0.535,-1.143 1.021,-2.314 1.452,-3.51 0.023,0.006 0.046,0.016 0.07,0.021 0.304,0.082 0.608,0.121 0.908,0.121 1.545,0 2.959,-1.031 3.378,-2.596 0.501,-1.867 -0.607,-3.785 -2.475,-4.287 -0.026,-0.006 -0.054,-0.01 -0.08,-0.018 0.219,-1.236 0.381,-2.492 0.487,-3.766 0.031,0.004 0.061,0.008 0.092,0.008 z m -0.992,5.461 c 0.025,0.006 0.05,0.012 0.076,0.018 0.91,0.264 1.448,1.213 1.202,2.133 -0.205,0.764 -0.899,1.299 -1.688,1.299 -0.14,0 -0.281,-0.018 -0.419,-0.051 -0.026,-0.01 -0.053,-0.018 -0.08,-0.025 l -1.572,-0.449 -0.554,1.539 c -0.407,1.131 -0.875,2.262 -1.391,3.361 l -0.695,1.482 1.435,0.791 c 0.022,0.014 0.045,0.025 0.068,0.037 0.81,0.49 1.083,1.547 0.607,2.371 -0.312,0.539 -0.895,0.875 -1.52,0.875 -0.296,0 -0.578,-0.072 -0.837,-0.215 -0.022,-0.016 -0.046,-0.029 -0.069,-0.043 l -1.402,-0.838 -0.933,1.34 c -0.69,0.994 -1.435,1.965 -2.212,2.891 l -1.054,1.252 1.179,1.135 c 0.017,0.016 0.034,0.031 0.051,0.047 0.313,0.328 0.486,0.756 0.486,1.211 0,0.467 -0.183,0.906 -0.513,1.236 -0.331,0.332 -0.771,0.514 -1.237,0.514 -0.455,0 -0.884,-0.172 -1.211,-0.486 -0.014,-0.016 -0.028,-0.031 -0.044,-0.047 l -1.14,-1.172 -1.246,1.057 c -0.948,0.805 -1.945,1.572 -2.964,2.281 l -1.307,0.912 0.786,1.387 c 0.473,0.834 0.183,1.9 -0.646,2.379 -0.27,0.154 -0.562,0.234 -0.87,0.234 -0.618,0 -1.197,-0.33 -1.511,-0.861 l -0.81,-1.373 -1.441,0.678 c -1.108,0.521 -2.246,0.994 -3.382,1.404 l -1.496,0.541 0.396,1.541 c 0.238,0.924 -0.318,1.877 -1.24,2.125 -0.149,0.039 -0.303,0.061 -0.455,0.061 -0.78,0 -1.473,-0.527 -1.683,-1.283 l -0.426,-1.531 -1.566,0.277 c -1.177,0.209 -2.397,0.367 -3.63,0.471 l -1.59,0.133 -0.012,1.598 c -0.007,0.957 -0.792,1.736 -1.749,1.736 -0.957,0 -1.741,-0.779 -1.748,-1.736 L 48.123,89.6 46.53,89.465 c -1.186,-0.1 -2.371,-0.252 -3.523,-0.453 l -1.554,-0.271 -0.431,1.518 c -0.213,0.75 -0.904,1.273 -1.68,1.273 -0.152,0 -0.305,-0.021 -0.455,-0.061 -0.91,-0.244 -1.469,-1.189 -1.244,-2.107 l 0.376,-1.531 -1.485,-0.531 c -1.146,-0.412 -2.29,-0.883 -3.399,-1.4 l -1.42,-0.664 -0.815,1.338 c -0.32,0.527 -0.88,0.842 -1.497,0.842 -0.307,0 -0.6,-0.08 -0.869,-0.234 -0.825,-0.477 -1.116,-1.508 -0.66,-2.348 l 0.747,-1.379 -1.288,-0.893 c -1.006,-0.699 -1.991,-1.451 -2.927,-2.238 l -1.193,-1.004 -1.135,1.07 c -0.326,0.309 -0.753,0.479 -1.202,0.479 -0.466,0 -0.904,-0.182 -1.233,-0.512 -0.67,-0.67 -0.687,-1.736 -0.037,-2.43 l 1.066,-1.139 -1.01,-1.19 c -0.795,-0.938 -1.554,-1.922 -2.255,-2.924 l -0.888,-1.27 -1.367,0.729 c -0.256,0.135 -0.532,0.205 -0.819,0.205 -0.623,0 -1.204,-0.336 -1.515,-0.873 -0.47,-0.814 -0.214,-1.848 0.583,-2.352 l 1.309,-0.826 -0.661,-1.4 C 13.522,65.772 13.043,64.623 12.628,63.475 L 12.104,62.026 10.6,62.363 c -0.126,0.027 -0.256,0.043 -0.384,0.043 -0.788,0 -1.482,-0.533 -1.687,-1.295 -0.242,-0.906 0.27,-1.836 1.167,-2.117 l 1.469,-0.463 -0.271,-1.516 C 10.681,55.826 10.521,54.591 10.416,53.347 L 10.287,51.806 8.743,51.744 C 7.804,51.705 7.066,50.94 7.066,50 c 0,-0.939 0.737,-1.706 1.678,-1.744 l 1.544,-0.062 0.129,-1.54 c 0.104,-1.246 0.265,-2.48 0.478,-3.67 L 11.166,41.468 9.697,41.006 C 8.8,40.725 8.288,39.795 8.53,38.889 c 0.204,-0.762 0.897,-1.294 1.687,-1.294 0.128,0 0.257,0.015 0.384,0.043 l 1.504,0.336 0.524,-1.448 c 0.415,-1.148 0.894,-2.297 1.421,-3.415 l 0.661,-1.399 -1.31,-0.827 c -0.796,-0.503 -1.052,-1.535 -0.582,-2.351 0.312,-0.538 0.892,-0.872 1.515,-0.872 0.288,0 0.563,0.069 0.819,0.205 l 1.367,0.727 0.888,-1.269 c 0.701,-1.003 1.46,-1.986 2.255,-2.923 l 1.009,-1.19 -1.066,-1.139 c -0.649,-0.692 -0.633,-1.76 0.037,-2.431 0.329,-0.329 0.768,-0.511 1.233,-0.511 0.449,0 0.876,0.17 1.202,0.479 l 1.135,1.071 1.193,-1.005 c 0.912,-0.767 1.869,-1.5 2.844,-2.181 l 1.308,-0.912 -0.786,-1.387 c -0.473,-0.832 -0.183,-1.898 0.646,-2.377 0.27,-0.156 0.562,-0.235 0.87,-0.235 0.618,0 1.196,0.33 1.511,0.861 l 0.81,1.373 1.441,-0.679 c 1.107,-0.521 2.245,-0.992 3.381,-1.403 l 1.497,-0.54 -0.396,-1.541 C 37.294,9.73 37.85,8.777 38.772,8.53 c 0.149,-0.04 0.303,-0.061 0.454,-0.061 0.781,0 1.474,0.527 1.684,1.282 l 0.426,1.532 1.566,-0.278 c 1.178,-0.21 2.398,-0.368 3.629,-0.472 L 48.124,10.4 48.136,8.802 c 0.007,-0.958 0.791,-1.736 1.748,-1.736 0.957,0 1.742,0.778 1.749,1.736 l 0.012,1.598 1.593,0.133 c 1.263,0.106 2.519,0.271 3.734,0.491 l 1.579,0.285 0.421,-1.549 c 0.207,-0.761 0.9,-1.292 1.686,-1.292 0.152,0 0.306,0.021 0.456,0.061 0.451,0.121 0.828,0.41 1.062,0.815 0.229,0.397 0.293,0.859 0.183,1.299 l -0.01,0.033 -0.412,1.547 1.505,0.549 c 1.126,0.41 2.259,0.884 3.364,1.407 l 1.459,0.69 0.806,-1.399 c 0.008,-0.012 0.015,-0.024 0.021,-0.037 0.314,-0.525 0.889,-0.851 1.504,-0.851 0.309,0 0.602,0.079 0.872,0.235 0.824,0.476 1.115,1.525 0.657,2.359 -0.009,0.015 -0.019,0.03 -0.027,0.045 l -0.828,1.396 1.328,0.931 c 0.987,0.692 1.957,1.442 2.884,2.228 l 1.247,1.058 1.14,-1.173 c 0.015,-0.016 0.029,-0.031 0.043,-0.047 0.328,-0.313 0.756,-0.486 1.211,-0.486 0.468,0 0.906,0.183 1.237,0.513 0.331,0.331 0.513,0.771 0.513,1.237 0,0.456 -0.173,0.886 -0.484,1.209 -0.018,0.016 -0.034,0.032 -0.052,0.048 l -1.181,1.135 1.055,1.254 c 0.777,0.924 1.521,1.896 2.213,2.89 l 0.936,1.345 1.403,-0.845 c 0.021,-0.013 0.042,-0.026 0.063,-0.04 0.261,-0.144 0.543,-0.216 0.838,-0.216 0.625,0 1.207,0.335 1.52,0.875 0.476,0.825 0.202,1.881 -0.607,2.371 -0.021,0.011 -0.043,0.022 -0.064,0.034 l -1.44,0.789 0.697,1.488 c 0.516,1.1 0.983,2.23 1.391,3.36 l 0.555,1.539 1.572,-0.449 c 0.026,-0.008 0.053,-0.016 0.08,-0.024 0.138,-0.034 0.278,-0.051 0.418,-0.051 0.789,0 1.483,0.533 1.688,1.298 0.246,0.92 -0.292,1.868 -1.202,2.133 -0.025,0.005 -0.051,0.011 -0.076,0.018 l -1.597,0.387 0.286,1.618 c 0.208,1.174 0.365,2.387 0.468,3.606 l 0.138,1.649 1.654,-0.046 c 0.026,0 0.052,-0.002 0.078,-0.003 0.948,0.02 1.714,0.797 1.714,1.749 0,0.953 -0.766,1.731 -1.714,1.75 -0.025,-0.002 -0.051,-0.004 -0.077,-0.004 l -1.655,-0.047 -0.138,1.65 c -0.103,1.221 -0.26,2.434 -0.468,3.605 l -0.286,1.619 z"
        />
        <path
          fill="currentColor"
          d="M 49.883,16.225 C 31.23,16.225 16.108,31.346 16.108,50 16.108,68.653 31.23,83.776 49.882,83.776 68.535,83.776 83.657,68.653 83.657,50 83.658,31.346 68.536,16.225 49.883,16.225 Z m 22.645,56.42 c -6.049,6.049 -14.091,9.381 -22.646,9.381 -8.554,0 -16.596,-3.332 -22.645,-9.381 -6.049,-6.049 -9.38,-14.09 -9.38,-22.645 0,-8.554 3.331,-16.596 9.38,-22.645 6.049,-6.049 14.091,-9.38 22.645,-9.38 8.555,0 16.597,3.331 22.646,9.38 6.049,6.049 9.38,14.091 9.38,22.645 0,8.555 -3.331,16.596 -9.38,22.645 z"
        />
        <path
          fill="currentColor"
          d="m 49.883,46.509 c -1.924,0 -3.489,1.566 -3.489,3.49 0,1.924 1.565,3.491 3.489,3.491 1.925,0 3.49,-1.566 3.49,-3.491 0,-1.923 -1.565,-3.49 -3.49,-3.49 z m 0,5.231 c -0.961,0 -1.739,-0.78 -1.739,-1.741 0,-0.961 0.778,-1.74 1.739,-1.74 0.962,0 1.74,0.779 1.74,1.74 0,0.961 -0.778,1.741 -1.74,1.741 z"
        />
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
