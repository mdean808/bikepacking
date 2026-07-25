import { TRIPS } from '$lib/trips';
import type { PageServerLoad } from './$types';

export const load: PageServerLoad = () => {
  const trips = TRIPS.map((t) => ({ name: t.name, slug: t.slug }));
  return { trips };
};
