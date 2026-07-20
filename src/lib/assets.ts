import { AssetTypeEnum, type AssetResponseDto } from '@immich/sdk';
import type { Image } from '$lib/components/map/types';

const HOST = 'https://photos.mogdan.xyz';

export const parseAssets = async (
  asssets: AssetResponseDto[],
  shareKey: string
): Promise<Image[]> => {
  // Downscaled renditions come from the thumbnail endpoint (size: thumbnail/preview).
  const thumb = (id: string, size: string) =>
    `${HOST}/api/assets/${id}/thumbnail?size=${size}&key=${shareKey}`;
  // Transcoded, streamable video.
  const playback = (id: string) => `${HOST}/api/assets/${id}/video/playback?key=${shareKey}`;

  const clean: Image[] = asssets.map((a) => {
    const isVideo = a.type === AssetTypeEnum.Video;
    // Both coordinates must be present to place a marker. Checked with != null
    // rather than a falsy test so a real 0 (equator / prime meridian) survives.
    const { latitude, longitude } = a.exifInfo ?? {};
    const image: Image = {
      loc: latitude != null && longitude != null ? { lat: latitude, lng: longitude } : null,
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
