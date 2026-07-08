<script lang="ts">
import { MapLibre, Marker } from "svelte-maplibre-gl";
import type * as maplibregl from "maplibre-gl";
import { fade, scale } from "svelte/transition";
import { X } from "@lucide/svelte";

interface Image {
	loc: maplibregl.LngLatLike;
	url: string;
	title: string;
	description: string;
}

let modalImage: Image = $state({} as Image);
let modalOpen: boolean = $state(false);

const images: Image[] = [
	{
		loc: { lng: -123, lat: 49 },
		url: "./img/test.jpg",
		title: "No hands",
		description: "Look mom!",
	},
];

const openImageModal = (image: Image) => {
	modalImage = image;
	modalOpen = true;
};
</script>

<MapLibre class="h-full" zoom={7} center={[-123, 49]} style="https://api.jawg.io/styles/jawg-streets.json?access-token=Ii5PqKu9fD0APrg6DdjWKA9WRj9LAw6I4G4MtxzWSW0u8au1nrLDvwc4ekYMZ3Dc" >
  {#each images as image}
    <Marker lnglat={image.loc}>
    {#snippet content()}
      <button onclick={() => openImageModal(image)} title={image.title} class="w-10 h-10 hover:w-15 hover:h-15 transition-all p-1 rounded-lg bg-neutral-100">
          <img class="aspect-square object-cover object-center w-full h-full" src={image.url} alt={image.title}/>
      </button>
    {/snippet}
    </Marker>
  {/each}
</MapLibre>

{#if modalOpen}
  <!-- svelte-ignore a11y_click_events_have_key_events -->
  <!-- svelte-ignore a11y_no_static_element_interactions -->
  <div
    class="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4"
    transition:fade={{ duration: 150 }}
    onclick={() => (modalOpen = false)}
  >
    <!-- svelte-ignore a11y_no_static_element_interactions -->
    <div
      class="relative w-full max-w-lg rounded-2xl bg-white p-6 shadow-xl"
      transition:scale={{ duration: 200, start: 0.05 }}
      onclick={(e) => e.stopPropagation()}
    >
      <button
        class="absolute right-4 top-4 rounded-full p-1 text-gray-400 hover:bg-gray-100 hover:text-gray-600"
        onclick={() => (modalOpen = false)}
        aria-label="Close"
      >
        <X size={20} />
      </button>

      <h2 class="pr-8 text-lg font-semibold text-gray-900">{modalImage.title}</h2>
      <p class="mt-1 text-sm text-gray-500">{modalImage.description}</p>

      <img
        src={modalImage.url}
        alt={modalImage.title}
        class="mt-4 max-h-[70vh] w-full rounded-lg object-contain"
      />
    </div>
  </div>
{/if}
