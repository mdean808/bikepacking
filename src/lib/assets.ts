import { AssetTypeEnum, type AssetResponseDto } from '@immich/sdk';
import type { Image } from '$lib/components/map/types';

const HOST = 'https://photos.mogdan.xyz';

/**
 * Converts Immich assets into the Image shape the map uses, building the thumbnail,
 * preview and full-size URLs from `shareKey`.
 */
export const parseAssets = async (
  asssets: AssetResponseDto[],
  shareKey: string
): Promise<Image[]> => {
  const thumb = (id: string, size: string) =>
    `${HOST}/api/assets/${id}/thumbnail?size=${size}&key=${shareKey}`;
  const playback = (id: string) => `${HOST}/api/assets/${id}/video/playback?key=${shareKey}`;

  const clean: Image[] = asssets.map((a) => {
    const isVideo = a.type === AssetTypeEnum.Video;
    // Checked against null rather than falsiness, so a real 0 coordinate survives.
    const { latitude, longitude } = a.exifInfo ?? {};
    const taken = Date.parse(a.exifInfo?.dateTimeOriginal ?? a.fileCreatedAt ?? '');
    const image: Image = {
      loc: latitude != null && longitude != null ? { lat: latitude, lng: longitude } : null,
      takenAt: Number.isNaN(taken) ? null : taken,
      description: a.exifInfo?.description || '',
      type: isVideo ? 'video' : 'image',
      thumbnail: thumb(a.id, 'thumbnail'),
      preview: thumb(a.id, 'preview'),
      fullsize: thumb(a.id, 'fullsize'),
      ...(isVideo ? { video: playback(a.id) } : {})
    };
    return image;
  });
  return clean;
};
