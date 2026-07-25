import { getAllAlbumAssets, getAlbumShareKey } from '$lib/immich';
import { parseAssets } from '$lib/assets';
import { TRIPS } from '$lib/trips';
import { buildTrip } from '$lib/trip.server';
import { error } from '@sveltejs/kit';
import type { EntryGenerator, PageServerLoad } from './$types';

export const load: PageServerLoad = async ({ params }) => {
  const meta = TRIPS.find((t) => t.slug === params.trip);

  if (!meta) {
    error(404, `Trip "${params.trip}" not found`);
  }

  const [assets, shareKey] = await Promise.all([
    getAllAlbumAssets(meta.album),
    getAlbumShareKey(meta.album)
  ]);

  return {
    trip: buildTrip(meta),
    images: await parseAssets(assets, shareKey)
  };
};

export const entries: EntryGenerator = () => TRIPS.map((t) => ({ trip: t.slug }));
