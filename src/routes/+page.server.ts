import { getAlbums, getAllAlbumAssets, getAlbumShareKey } from '$lib/immich';
import { parseAssets } from '$lib/assets';
import { TRIPS } from '$lib/trip';
import type { PageServerLoad } from './$types';

export const load: PageServerLoad = async ({ url }) => {
  const tripName = url.searchParams.get('trip');
  const trip = tripName ? TRIPS.find((t) => t.name === tripName) : undefined;

  if (!trip) {
    return { albums: await getAlbums(), images: [] };
  }

  const [assets, shareKey] = await Promise.all([
    getAllAlbumAssets(trip.album),
    getAlbumShareKey(trip.album)
  ]);
  const images = await parseAssets(assets, shareKey);

  return {
    albums: await getAlbums(),
    images
  };
};
