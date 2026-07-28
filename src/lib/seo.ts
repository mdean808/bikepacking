// One source for everything the page head says about the site. Every value here
// is baked into prerendered HTML at build time (see docs/deployment.md), so
// nothing in it may depend on a request.

/**
 * The origin the site is served from — static/CNAME. Social scrapers do not
 * resolve relative paths, so every URL in the head is made absolute against this.
 */
export const SITE_URL = 'https://bikepacking.mogdan.xyz';

export const SITE_NAME = "Morgan's Bikepacking";

export const SITE_DESCRIPTION = 'My bikepacking trip routes and photos, plotted on the map.';

/** --color-hazy-ipa. Tints mobile browser chrome and the installed app's title bar. */
export const THEME_COLOR = '#aa953a';

/** --color-hazy-50, the colour behind the page. */
export const BACKGROUND_COLOR = '#fbf9ef';

/** The size Facebook, Slack, iMessage and X all crop to. scripts/og.ts renders at it. */
export const OG_WIDTH = 1200;
export const OG_HEIGHT = 630;

export const absoluteUrl = (path: string): string => new URL(path, SITE_URL).href;

/**
 * The social card for one trip, or the site-wide card when `slug` is omitted.
 * These are files under static/og/, written by `pnpm og`. Nothing generates them
 * on demand — the deployed site is static, so an og:image must already exist as
 * a file when the build is uploaded.
 */
export const ogImagePath = (slug?: string): string => `/og/${slug ?? 'default'}.png`;
