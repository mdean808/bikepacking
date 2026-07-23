import { getAllAlbumAssets, getAlbumShareKey } from '$lib/immich';
import { parseAssets } from '$lib/assets';
import { TRIPS } from '$lib/trips';
import { buildTrip } from '$lib/trip.server';
import type { EntryGenerator, PageServerLoad } from './$types';

export const load: PageServerLoad = async ({ params }) => {
  // Name + slug for every trip: the wheel/select show the name, navigation
  // routes by slug. Shipping every trip's parsed GeoJSON to render one is what
  // made the old client bundle enormous, so still send only these two fields.
  const trips = TRIPS.map((t) => ({ name: t.name, slug: t.slug }));

  // `params.trip` is the optional `[[trip]]` segment: a slug on /haida-gwaii,
  // undefined on /. Resolving from the path (not url.searchParams) is what lets
  // this load prerender — accessing url.search throws under prerendering.
  const meta = params.trip ? TRIPS.find((t) => t.slug === params.trip) : undefined;

  if (!meta) {
    return { trips, trip: null, images: [] };
  }

  const [assets, shareKey] = await Promise.all([
    getAllAlbumAssets(meta.album),
    getAlbumShareKey(meta.album)
  ]);

  return {
    trips,
    trip: buildTrip(meta),
    images: await parseAssets(assets, shareKey)
  };
};

// One prerendered page per trip, e.g. /haida-gwaii. The bare `/` (trip omitted)
// is generated for free by the default prerender.entries `['*']`, which already
// covers routes whose params are all optional.
export const entries: EntryGenerator = () => TRIPS.map((t) => ({ trip: t.slug }));
