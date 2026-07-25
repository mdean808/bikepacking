import { IMMICH_URL, IMMICH_API_KEY } from '$env/static/private';
import {
  createSharedLink,
  getAllSharedLinks,
  init,
  searchAssets,
  SharedLinkType,
  type AssetResponseDto
} from '@immich/sdk';

init({ baseUrl: IMMICH_URL, apiKey: IMMICH_API_KEY });

/**
 * Returns a share key for an album, creating the shared link if one doesn't exist
 * yet. The key lets the browser load that album's assets without authenticating.
 */
export const getAlbumShareKey = async (albumId: string): Promise<string> => {
  const existing = await getAllSharedLinks({ albumId });
  const link =
    existing.find((l) => l.album?.id === albumId && l.type === SharedLinkType.Album) ??
    (await createSharedLink({
      sharedLinkCreateDto: {
        type: SharedLinkType.Album,
        albumId,
        showMetadata: true,
        allowDownload: true
      }
    }));
  return link.key;
};

const paginateAlbumAssets = async (id: string, page: number = 1) => {
  const n = 100;
  const res = await searchAssets({
    metadataSearchDto: {
      albumIds: [id],
      withExif: true,
      size: n,
      page
    }
  });
  return {
    assets: res.assets.items,
    next: res.assets.nextPage ? Number(res.assets.nextPage) : null
  };
};

/** Fetches every asset in an album, following pagination to the last page. */
export const getAllAlbumAssets = async (id: string) => {
  let page: number | null = 1;
  const assets: AssetResponseDto[] = [];

  while (page !== null) {
    const res = await paginateAlbumAssets(id, page);
    assets.push(...res.assets);
    page = res.next;
  }
  return assets;
};
