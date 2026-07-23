// Shared hover position along the trip's elevation, decoupling the map from the
// elevation profile. Both read `distanceKm` to draw their indicator; `source`
// records who last moved it so each side's *write* handler can ignore updates it
// didn't originate and never fight the other.
//
// A factory (not a module singleton) mirrors hover.svelte.ts, so switching trips
// starts each BikeMap with fresh state instead of a lingering distance.
export type HoverSource = 'map' | 'profile';

class RouteHover {
  /** Cumulative distance along the trip, in km, or null when nothing is hovered. */
  distanceKm = $state<number | null>(null);
  /** Which side set the current value. */
  source = $state<HoverSource | null>(null);

  set(distanceKm: number, source: HoverSource) {
    this.distanceKm = distanceKm;
    this.source = source;
  }

  /** Clear only if `only` originated the value, so one side can't wipe the other's hover. */
  clear(only?: HoverSource) {
    if (only && this.source !== only) return;
    this.distanceKm = null;
    this.source = null;
  }
}

export type RouteHoverState = RouteHover;
export const createRouteHover = (): RouteHover => new RouteHover();
