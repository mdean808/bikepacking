<script lang="ts">
  import type { Snippet } from 'svelte';
  import { scale } from 'svelte/transition';
  import { cubicOut } from 'svelte/easing';
  import { Settings, X } from '@lucide/svelte';

  let { children }: { children: Snippet } = $props();

  /** Closed at every width until the cog is pressed, so the map starts unobscured. */
  let open = $state(false);

  /** How long the panel takes to grow out of and shrink back into the cog, in ms. */
  const PANEL_MS = 160;
  /** The size it grows from, as a fraction: 1 would be a plain fade. */
  const PANEL_FROM = 0.9;

  const glass = 'border border-white/15 bg-black/55 text-white backdrop-blur-sm';
</script>

<div class="absolute top-2 right-2 z-30 flex flex-col items-end gap-2">
  <button
    type="button"
    onclick={() => (open = !open)}
    aria-expanded={open}
    aria-label={open ? 'Hide map settings' : 'Show map settings'}
    title="Map settings"
    class="{glass} rounded-full p-2 transition hover:bg-black/70"
  >
    {#if open}
      <X size={18} />
    {:else}
      <Settings size={18} />
    {/if}
  </button>

  {#if open}
    <!-- Scaled from the corner it sits under, so it reads as coming out of the cog. -->
    <div
      class="{glass} min-w-50 text-md origin-top-right rounded-xl px-4 py-2"
      transition:scale={{ duration: PANEL_MS, start: PANEL_FROM, easing: cubicOut }}
    >
      {@render children()}
    </div>
  {/if}
</div>
