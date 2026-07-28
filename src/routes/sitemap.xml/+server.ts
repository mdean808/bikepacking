import { SITE_URL } from '$lib/seo';
import { TRIPS } from '$lib/trips';
import type { RequestHandler } from './$types';

// Written to build/sitemap.xml at build time. Set here as well as in
// +layout.ts because a server route does not take its page options from a
// layout, and an un-prerendered route in a static build is a 404.
export const prerender = true;

/** `lastmod` wants a date only; the ride date is the one date a trip has. */
const day = (d: Date) => d.toISOString().slice(0, 10);

export const GET: RequestHandler = async () => {
  const newest = TRIPS.reduce((a, b) => (a.date > b.date ? a : b)).date;

  const urls = [
    { loc: `${SITE_URL}/`, lastmod: day(newest), priority: '1.0' },
    ...TRIPS.map((trip) => ({
      loc: `${SITE_URL}/${trip.slug}`,
      lastmod: day(trip.date),
      priority: '0.8'
    }))
  ];

  const xml = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
${urls
  .map(
    ({ loc, lastmod, priority }) =>
      `  <url>\n    <loc>${loc}</loc>\n    <lastmod>${lastmod}</lastmod>\n    <priority>${priority}</priority>\n  </url>`
  )
  .join('\n')}
</urlset>
`;

  return new Response(xml, { headers: { 'content-type': 'application/xml' } });
};
