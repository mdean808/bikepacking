// One hovered position along the trip, shared between the map and the elevation
// profile. `source` records which of the two last wrote it, so neither reacts to
// its own update.
export type HoverSource = 'map' | 'profile';

class RouteHover {
  /** Measured from the start of the trip, not the start of the day. */
  distanceKm = $state<number | null>(null);
  source = $state<HoverSource | null>(null);

  set(distanceKm: number, source: HoverSource) {
    this.distanceKm = distanceKm;
    this.source = source;
  }

  clear(only?: HoverSource) {
    if (only && this.source !== only) return;
    this.distanceKm = null;
    this.source = null;
  }
}

export type RouteHoverState = RouteHover;
export const createRouteHover = (): RouteHover => new RouteHover();
