import { IMMICH_URL, IMMICH_API_KEY } from '$env/static/private';
import {
  createSharedLink,
  getAllAlbums,
  getAllSharedLinks,
  init,
  searchAssets,
  SharedLinkType,
  type AssetResponseDto
} from '@immich/sdk';

init({ baseUrl: IMMICH_URL, apiKey: IMMICH_API_KEY });

export const getAlbums = () => getAllAlbums({});

// Immich's /thumbnail and /original endpoints always require auth. A shared link
// adds a `key` query param that bypasses auth for that album's assets, so the
// browser can load them directly. Reuse an existing link if one exists.
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

export const paginateAlbumAssets = async (id: string, page: number = 1) => {
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
