<script lang="ts">
  import Modal from './Modal.svelte';
  import { DAY_COLORS } from '$lib/geo.js';

  interface Props {
    open?: boolean;
    dayIndex: number | null;
  }

  let { open = $bindable(false), dayIndex }: Props = $props();
</script>

{#if dayIndex !== null}
  <Modal bind:open>
    <div class="flex items-center gap-3">
      <div
        class="h-3 w-3 rounded-full"
        style="background-color: {DAY_COLORS[dayIndex % DAY_COLORS.length]}"
      ></div>
      <h2 class="text-lg font-semibold text-gray-900">Day {dayIndex + 1}</h2>
    </div>

    <div class="mt-4 space-y-3">
      <div class="h-4 w-3/4 animate-pulse rounded bg-gray-200"></div>
      <div class="h-4 w-1/2 animate-pulse rounded bg-gray-200"></div>
      <div class="mt-6 h-48 animate-pulse rounded-xl bg-gray-100"></div>
      <div class="h-4 w-2/3 animate-pulse rounded bg-gray-200"></div>
      <div class="h-4 w-1/3 animate-pulse rounded bg-gray-200"></div>
    </div>
  </Modal>
{/if}
