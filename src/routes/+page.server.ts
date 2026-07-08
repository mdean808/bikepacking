import { getAlbums } from '$lib/immich';
import type { PageServerLoad } from './$types';

export const load: PageServerLoad = async () => {
  return {
    albums: await getAlbums()
  };
};
