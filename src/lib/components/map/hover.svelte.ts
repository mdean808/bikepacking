// Tracks which of the map's overlapping targets the cursor is on.
//
// Route lines are a maplibre canvas layer; day and photo markers are DOM overlays
// above it. Moving from a route onto an overlay fires the route's mouseleave after
// the overlay's mouseenter, so each handler only records its own target, and the
// outputs below derive from all of them in a fixed priority: photo, day marker,
// route.
class HoverState {
  #route: number | null = $state(null);
  #marker: number | null = $state(null);
  #image = $state(false);
  /** Kept apart from #route so the map and the profile can't overwrite each other. */
  #profile: number | null = $state(null);

  readonly dayIndex: number | null = $derived(
    this.#image ? null : (this.#marker ?? this.#route ?? this.#profile)
  );

  readonly cursor: string = $derived(
    this.#image || this.#marker !== null || this.#route !== null ? 'pointer' : ''
  );

  readonly anyDayHovered: boolean = $derived(this.dayIndex !== null);

  isDimmed(i: number): boolean {
    return this.dayIndex !== null && this.dayIndex !== i;
  }

  enterRoute(i: number) {
    this.#route = i;
  }
  leaveRoute() {
    this.#route = null;
  }
  enterMarker(i: number) {
    this.#marker = i;
  }
  leaveMarker() {
    this.#marker = null;
  }
  enterImage() {
    this.#image = true;
  }
  leaveImage() {
    this.#image = false;
  }
  enterProfile(i: number) {
    this.#profile = i;
  }
  leaveProfile() {
    this.#profile = null;
  }
}

export const createHoverState = () => new HoverState();
