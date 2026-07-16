// Minimal ambient types for anvaka/panzoom, which ships no declarations.
// Covers only the surface we use.
declare module 'panzoom' {
  export interface PanZoomOptions {
    maxZoom?: number;
    minZoom?: number;
    bounds?: boolean;
    boundsPadding?: number;
    zoomDoubleClickSpeed?: number;
    smoothScroll?: boolean;
    beforeWheel?: (e: WheelEvent) => boolean;
  }

  export interface PanZoom {
    dispose(): void;
    moveTo(x: number, y: number): void;
    zoomAbs(x: number, y: number, scale: number): void;
    getTransform(): { x: number; y: number; scale: number };
  }

  export default function panzoom(el: Element, options?: PanZoomOptions): PanZoom;
}
