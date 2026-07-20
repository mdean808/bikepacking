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
  // Full-resolution image bytes come from the dedicated original endpoint.
  const original = (id: string) => `${HOST}/api/assets/${id}/original?key=${shareKey}`;
  // Transcoded, streamable video.
  const playback = (id: string) => `${HOST}/api/assets/${id}/video/playback?key=${shareKey}`;

  const clean: Image[] = asssets.map((a) => {
    const isVideo = a.type === AssetTypeEnum.Video;
    const image: Image = {
      loc: { lat: a.exifInfo?.latitude || -1, lng: a.exifInfo?.longitude || -1 },
      description: a.exifInfo?.description || '',
      type: isVideo ? 'video' : 'image',
      thumbnail: thumb(a.id, 'thumbnail'),
      preview: thumb(a.id, 'preview'),
      fullsize: thumb(a.id, 'fullsize'),
      original: original(a.id),
      ...(isVideo ? { video: playback(a.id) } : {})
    };
    return image;
  });
  return clean;
};
