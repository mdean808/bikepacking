export interface Image {
  description: string;
  /** Geotag from EXIF, or null when the asset has no usable coordinates. */
  loc: { lng: number; lat: number } | null;
  /** Capture instant in ms, or null when the asset carries no usable timestamp. */
  takenAt: number | null;
  type: 'image' | 'video';
  thumbnail: string;
  preview: string;
  fullsize: string;
  /** Playback URL, only set for videos. */
  video?: string;
}
