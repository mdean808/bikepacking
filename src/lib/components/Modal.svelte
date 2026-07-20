<script lang="ts">
  import { Dialog } from 'bits-ui';
  import { X } from '@lucide/svelte';
  import type { Snippet } from 'svelte';

  interface Props {
    open?: boolean;
    /**
     * Accessible name for the dialog, announced on open. Rendered for screen
     * readers only — each caller draws its own visible heading.
     */
    title: string;
    children?: Snippet;
  }

  let { open = $bindable(false), title, children }: Props = $props();
</script>

<Dialog.Root bind:open>
  <Dialog.Portal>
    <Dialog.Overlay
      class="data-open:animate-in data-closed:animate-out data-closed:fade-out-0 data-open:fade-in-0 fixed inset-0 z-50 bg-black/60 duration-150"
    />
    <!-- h-[85vh] is a definite height, not a cap: both callers lay out a
         flex-1 min-h-0 child (a map, a photo) that would collapse to zero
         against an auto-height parent. -->
    <Dialog.Content
      class="data-open:animate-in data-closed:animate-out data-closed:fade-out-0 data-open:fade-in-0 data-closed:zoom-out-95 data-open:zoom-in-95 fixed top-1/2 left-1/2 z-50 h-[85vh] w-[calc(100%-2rem)] max-w-5xl -translate-x-1/2 -translate-y-1/2 overflow-y-auto rounded-2xl bg-white p-6 shadow-xl duration-150 outline-none"
    >
      <Dialog.Title class="sr-only">{title}</Dialog.Title>
      <Dialog.Close
        class="absolute top-4 right-4 rounded-full p-1 text-gray-400 hover:bg-gray-100 hover:text-gray-600"
        aria-label="Close"
      >
        <X size={20} />
      </Dialog.Close>

      {@render children?.()}
    </Dialog.Content>
  </Dialog.Portal>
</Dialog.Root>
