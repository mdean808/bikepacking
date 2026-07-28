<script lang="ts">
  import './layout.css';
  import favicon from '$lib/assets/favicon.png';
  import { page } from '$app/state';
  import { Badge } from '$lib/components/ui/badge/index.js';
  import { Copyright, ExternalLink } from '@lucide/svelte';

  let { children } = $props();
  const isHome = $derived(page.url.pathname === '/');
</script>

<svelte:head><link rel="icon" href={favicon} /></svelte:head>

<div class="px-0 gap-5">
  <a href="/" class="mx-auto text-center">
    <h1 class="text-2xl lg:text-6xl uppercase w-fit mx-auto mb-3 mt-4">
      {#if isHome}
        Bikepacking Trips
      {:else}
        {page.url.pathname.split('/')[1].replace('-', ' ')}
      {/if}
    </h1>
  </a>
  {@render children()}
  <div class="mx-auto flex flex-row max-w-5xl gap-2 py-4 sm:px-8">
    <Badge variant="outline">Built by Morgan Dean</Badge>
    <a href="https://mogdan.xyz" target="_blank" class="ml-auto">
      <Badge variant="default" class="bg-blue-500 text-white">
        mogdan.xyz
        <ExternalLink />
      </Badge>
    </a>
  </div>
</div>
