import { albumShareUrl, thumbnailUrl } from '$lib/assets';
import { buildTripElevation } from '$lib/elevation';
import { getAlbumCover, getAlbumShareKey } from '$lib/immich';
import { buildTrip } from '$lib/trip.server';
import { TRIPS, type TripCard, type TripCardDay, type TripMeta } from '$lib/trips';
import type { Position } from 'geojson';
import type { PageServerLoad } from './$types';

/**
 * How many points of a day's track reach the browser. The index draws every trip
 * at once at card size, where a full GPX day is tens of thousands of points
 * resolving to well under a pixel apart. The trip pages keep the full tracks.
 */
const CARD_POINTS_PER_DAY = 150;
/** Decimal places kept on each coordinate. Five is roughly a metre. */
const COORD_PRECISION = 5;

/** Thins a day's track to at most `CARD_POINTS_PER_DAY` points, keeping both ends. */
const thin = (coords: Position[]): [number, number][] => {
  const round = (n: number) => Number(n.toFixed(COORD_PRECISION));
  const stride = Math.max(1, Math.ceil(coords.length / CARD_POINTS_PER_DAY));
  return coords
    .filter((_, i) => i % stride === 0 || i === coords.length - 1)
    .map((c) => [round(c[0]), round(c[1])]);
};

/** Returns the box every day's line fits inside, or null when none has points. */
const boundsOf = (days: TripCardDay[]): [number, number, number, number] | null => {
  let minLng = Infinity;
  let minLat = Infinity;
  let maxLng = -Infinity;
  let maxLat = -Infinity;

  for (const day of days) {
    for (const [lng, lat] of day.line) {
      if (lng < minLng) minLng = lng;
      if (lat < minLat) minLat = lat;
      if (lng > maxLng) maxLng = lng;
      if (lat > maxLat) maxLat = lat;
    }
  }

  return minLng <= maxLng ? [minLng, minLat, maxLng, maxLat] : null;
};

const toCard = async (meta: TripMeta): Promise<TripCard> => {
  const trip = buildTrip(meta);
  const elevation = buildTripElevation(trip.days.map((d) => d.geoJSON));

  const [shareKey, cover] = await Promise.all([
    getAlbumShareKey(meta.album),
    getAlbumCover(meta.album)
  ]);

  const days = trip.days.map((day, i) => ({
    title: day.title,
    distanceKm: elevation.dayLengthsKm[i] ?? 0,
    line: thin(elevation.dayLines[i]?.geometry.coordinates ?? [])
  }));

  return {
    name: meta.name,
    slug: meta.slug,
    description: meta.description,
    date: meta.date,
    totalKm: elevation.totalKm,
    days,
    bounds: boundsOf(days),
    album: {
      url: albumShareUrl(shareKey),
      cover: cover.coverAssetId ? thumbnailUrl(cover.coverAssetId, 'preview', shareKey) : null,
      photoCount: cover.assetCount
    }
  };
};

export const load: PageServerLoad = async () => {
  const trips = await Promise.all(TRIPS.map(toCard));
  // Newest first, so the page opens on the most recent ride.
  trips.sort((a, b) => b.date.getTime() - a.date.getTime());
  return { trips };
};
