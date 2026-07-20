import { getAllAlbumAssets, getAlbumShareKey } from '$lib/immich';
import { parseAssets } from '$lib/assets';
import { TRIPS } from '$lib/trips';
import { buildTrip } from '$lib/trip.server';
import type { PageServerLoad } from './$types';

export const load: PageServerLoad = async ({ url }) => {
  // Only the names are needed to populate the selector; shipping every trip's
  // parsed GeoJSON to render one is what made the old client bundle enormous.
  const tripNames = TRIPS.map((t) => t.name);

  const tripName = url.searchParams.get('trip');
  const meta = tripName ? TRIPS.find((t) => t.name === tripName) : undefined;

  if (!meta) {
    return { tripNames, trip: null, images: [] };
  }

  const [assets, shareKey] = await Promise.all([
    getAllAlbumAssets(meta.album),
    getAlbumShareKey(meta.album)
  ]);

  return {
    tripNames,
    trip: buildTrip(meta),
    images: await parseAssets(assets, shareKey)
  };
};
