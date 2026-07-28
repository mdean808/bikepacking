import { getAllAlbumAssets, getAlbumShareKey } from '$lib/immich';
import { parseAssets } from '$lib/assets';
import { buildTripElevation } from '$lib/elevation';
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

  const trip = buildTrip(meta);

  return {
    trip,
    // Measured here so the page's description can quote the trip's real length.
    // Costs nothing at runtime: this load only ever runs during the build.
    totalKm: buildTripElevation(trip.days.map((d) => d.geoJSON)).totalKm,
    images: await parseAssets(assets, shareKey)
  };
};

export const entries: EntryGenerator = () => TRIPS.map((t) => ({ trip: t.slug }));
