/**
 * Lucide's chevron-right, for the direction arrows repeated along a route.
 *
 * The chevron points along +x, which is the direction `symbol-placement: 'line'`
 * rotates each copy to, so it ends up pointing the way the day was ridden.
 */
const CHEVRON_RIGHT = 'm9 18 6-6-6-6';

/** Arrows sit on top of the day's own colour, so they need to contrast with it. */
export const ARROW_COLOR = '#ffffff';

/** Stroke weight in the icon's 24-unit box. Lucide draws at 2; heavier reads better small. */
export const ARROW_STROKE_WIDTH = 3;

/** Size of the registered image in logical px, before `icon-size` scales it. */
export const ARROW_PX = 24;

/** The chevron is rasterised at this multiple of `ARROW_PX` to stay crisp on HiDPI screens. */
export const ARROW_PIXEL_RATIO = 2;

let cached: ImageData | null = null;

/**
 * Draws the chevron to a canvas and returns its pixels for `map.addImage`.
 *
 * It goes through a canvas rather than an SVG URL because `map.loadImage` labels
 * everything it fetches as `image/png` before decoding, so an SVG fails there no
 * matter how it is encoded. `Path2D` reads the same path syntax lucide ships.
 *
 * Returns null on the server, where there is no canvas to draw on.
 */
export const arrowImageData = (): ImageData | null => {
  if (typeof document === 'undefined') return null;
  if (cached) return cached;

  const size = ARROW_PX * ARROW_PIXEL_RATIO;
  const canvas = document.createElement('canvas');
  canvas.width = size;
  canvas.height = size;

  const ctx = canvas.getContext('2d');
  if (!ctx) return null;

  ctx.scale(ARROW_PIXEL_RATIO, ARROW_PIXEL_RATIO);
  ctx.strokeStyle = ARROW_COLOR;
  ctx.lineWidth = ARROW_STROKE_WIDTH;
  ctx.lineCap = 'round';
  ctx.lineJoin = 'round';
  ctx.stroke(new Path2D(CHEVRON_RIGHT));

  cached = ctx.getImageData(0, 0, size, size);
  return cached;
};
