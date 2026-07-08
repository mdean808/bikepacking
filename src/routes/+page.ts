import { TRIPS } from '$lib/trip';
import type { PageLoad } from './$types';

export const ssr = false;

export const load: PageLoad = async ({ url, data }) => {
  const tripName = url.searchParams.get('trip') ?? TRIPS[0].name;
  const selectedTrip = TRIPS.find((t) => t.name === tripName) ?? TRIPS[0];

  return {
    ...data,
    trips: TRIPS,
    selectedTripName: tripName,
    selectedTrip
  };
};
