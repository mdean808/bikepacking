// Prerender the whole app: SvelteKit runs every load once at build time and
// writes static HTML + __data.json, which is what GitHub Pages serves. There is
// no runtime server, so IMMICH_API_KEY is only ever used by the CI runner.
export const prerender = true;
