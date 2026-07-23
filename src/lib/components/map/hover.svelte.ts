// Hover coordination for the map, in one place.
//
// Three things can be hovered and they physically overlap: route lines (a
// maplibre layer, hovered through canvas events) plus day markers and image
// markers (both DOM overlays sitting on top of that canvas). Sliding the cursor
// from a route onto an overlay makes the canvas fire the layer's mouseleave
// *after* the overlay's mouseenter, so any handler that assigns shared state
// races with itself and the last writer wins by accident of event order.
//
// The fix is to stop assigning outputs at all. Handlers record only which of the
// three inputs they own, and every output is derived from all three under one
// explicit precedence: image > day marker > route. Event order stops mattering
// because no output is ever written twice.
class HoverState {
  // Which day's route line the canvas reports as hovered, if any.
  #route: number | null = $state(null);
  // Which day's start marker is hovered, if any.
  #marker: number | null = $state(null);
  // Whether any photo marker is hovered. Only one can be at a time, and nothing
  // needs to know which, so a boolean is enough.
  #image = $state(false);
  // Which day the elevation profile reports as hovered, if any. Its own slot
  // (not #route) so profile and map hover never clobber each other as the cursor
  // crosses between them — see routeHover.svelte.ts.
  #profile: number | null = $state(null);

  /** The day that should read as highlighted, or null when none does. */
  readonly dayIndex: number | null = $derived(
    this.#image ? null : (this.#marker ?? this.#route ?? this.#profile)
  );

  /**
   * Cursor for the map canvas. Derived rather than assigned — this is the value
   * the ordering race used to corrupt, leaving a stale '' while a photo marker
   * was still hovered.
   */
  readonly cursor: string = $derived(
    this.#image || this.#marker !== null || this.#route !== null ? 'pointer' : ''
  );

  /** True while any day is highlighted — photo markers hide so the route reads. */
  readonly anyDayHovered: boolean = $derived(this.dayIndex !== null);

  /** A day is dimmed when some *other* day is the highlighted one. */
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
