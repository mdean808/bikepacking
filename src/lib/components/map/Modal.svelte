<script lang="ts">
  import { fade, scale } from 'svelte/transition';
  import { X } from '@lucide/svelte';
  import type { Snippet } from 'svelte';

  interface Props {
    open?: boolean;
    children?: Snippet;
  }

  let { open = $bindable(false), children }: Props = $props();
</script>

{#if open}
  <!-- svelte-ignore a11y_click_events_have_key_events -->
  <!-- svelte-ignore a11y_no_static_element_interactions -->
  <div
    class="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4"
    transition:fade={{ duration: 150 }}
    onclick={() => (open = false)}
  >
    <!-- svelte-ignore a11y_no_static_element_interactions -->
    <div
      class="relative w-full max-w-lg rounded-2xl bg-white p-6 shadow-xl"
      transition:scale={{ duration: 200, start: 0.05 }}
      onclick={(e) => e.stopPropagation()}
    >
      <button
        class="absolute right-4 top-4 rounded-full p-1 text-gray-400 hover:bg-gray-100 hover:text-gray-600"
        onclick={() => (open = false)}
        aria-label="Close"
      >
        <X size={20} />
      </button>

      {@render children?.()}
    </div>
  </div>
{/if}
