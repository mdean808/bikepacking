import { TRIPS } from '$lib/trip';
import type { PageLoad } from './$types';

export const ssr = false;

export const load: PageLoad = async ({ url, data }) => {
  const tripName = url.searchParams.get('trip') ?? '';
  const selectedTrip = tripName ? TRIPS.find((t) => t.name === tripName) : undefined;

  return {
    ...data,
    trips: TRIPS,
    selectedTripName: selectedTrip ? tripName : '',
    selectedTrip
  };
};
