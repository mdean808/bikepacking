<script lang="ts">
  import Modal from './Modal.svelte';
  import type { Image } from './types.js';

  interface Props {
    open?: boolean;
    image: Image;
  }

  let { open = $bindable(false), image }: Props = $props();
</script>

<Modal bind:open>
  <h2 class="pr-8 text-lg font-semibold text-gray-900">{image.title}</h2>
  <p class="mt-1 text-sm text-gray-500">{image.description}</p>

  <img
    src={image.url}
    alt={image.title}
    class="mt-4 max-h-[70vh] w-full rounded-2xl object-contain"
  />
</Modal>
