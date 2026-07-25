<script lang="ts">
  import './layout.css';
  import favicon from '$lib/assets/favicon.svg';
  import { page } from '$app/state';

  let { children } = $props();
  const isHome = $derived(page.url.pathname === '/');
</script>

<svelte:head><link rel="icon" href={favicon} /></svelte:head>

<div class="flex min-h-screen flex-col">
  <div class="px-0 py-5 lg:px-30 gap-5">
    <a href="/" class="mx-auto text-center">
      <h1 class="text-6xl uppercase w-fit mx-auto">
        {#if isHome}
          Morgan's Bikepacking
        {:else}
          {page.url.pathname.split('/')[1].replace('-', ' ')}
        {/if}
      </h1>
    </a>
    {@render children()}
  </div>
</div>
