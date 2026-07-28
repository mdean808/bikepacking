<script lang="ts">
  import type { Snippet } from 'svelte';
  let { children }: { children: Snippet } = $props();
</script>

<div
  class="absolute top-2 right-2 z-30 min-w-50 text-md rounded-xl border border-white/15 bg-black/55 px-4 py-2 text-white backdrop-blur-sm"
>
  {@render children()}
</div>
