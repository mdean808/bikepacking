import type { AssetResponseDto } from '@immich/sdk';
import type { Image } from '$lib/components/map/types';

export const parseAssets = async (
  asssets: AssetResponseDto[],
  shareKey: string
): Promise<Image[]> => {
  const url = (id: string, size: string) =>
    `https://photos.mogdan.xyz/api/assets/${id}/thumbnail?size=${size}&key=${shareKey}`;

  const clean: Image[] = asssets.map((a) => {
    const image: Image = {
      loc: { lat: a.exifInfo?.latitude || -1, lng: a.exifInfo?.longitude || -1 },
      description: a.exifInfo?.description || '',
      thumbnail: url(a.id, 'thumbnail'), // size: original/fullsize/preview/thumbnail
      preview: url(a.id, 'preview'),
      original: url(a.id, 'original')
    };
    return image;
  });
  return clean;
};
