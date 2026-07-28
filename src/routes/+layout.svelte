<script lang="ts">
  import './layout.css';
  import { page } from '$app/state';
  import { Badge } from '$lib/components/ui/badge/index.js';
  import { Copyright, ExternalLink } from '@lucide/svelte';
  import { SITE_NAME } from '$lib/seo';

  let { children } = $props();
  const isHome = $derived(page.url.pathname === '/');
</script>

<div class="px-0 gap-5">
  <a href="/" class="mx-auto text-center">
    <h1 class="text-3xl lg:text-6xl uppercase w-fit mx-auto mb-3 mt-4">
      {#if isHome}
        {SITE_NAME}
      {:else}
        {page.url.pathname.split('/')[1].replaceAll('-', ' ')}
      {/if}
    </h1>
  </a>
  {@render children()}
  <div class="mx-auto flex flex-row max-w-5xl gap-2 py-4 px-4 sm:px-8">
    <Badge variant="outline">Built by Morgan Dean</Badge>
    <a href="https://mogdan.xyz" target="_blank" class="ml-auto">
      <Badge variant="default" class="bg-blue-500 text-white">
        mogdan.xyz
        <ExternalLink />
      </Badge>
    </a>
  </div>
</div>
