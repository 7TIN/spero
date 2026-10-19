import type { Bbox } from "@spero/shared";

const EARTH_RADIUS_M = 6_371_008.8;

/** Metres per degree of latitude (WGS84 mean). */
export const METERS_PER_DEG_LAT = 110_574;

/** Metres per degree of longitude at the equator. */
const METERS_PER_DEG_LNG_EQUATOR = 111_320;

function toRadians(degrees: number): number {
  return (degrees * Math.PI) / 180;
}

/** Metres per degree of longitude at a given latitude. */
export function metersPerDegreeLng(latitude: number): number {
  const cos = Math.cos(toRadians(latitude));
  return METERS_PER_DEG_LNG_EQUATOR * Math.max(cos, 1e-6);
}

/** Great-circle distance in metres. */
export function haversineMeters(
  fromLng: number,
  fromLat: number,
  toLng: number,
  toLat: number,
): number {
  const dLat = toRadians(toLat - fromLat);
  const dLng = toRadians(toLng - fromLng);
  const lat1 = toRadians(fromLat);
  const lat2 = toRadians(toLat);

  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(lat1) * Math.cos(lat2) * Math.sin(dLng / 2) ** 2;

  return 2 * EARTH_RADIUS_M * Math.asin(Math.min(1, Math.sqrt(a)));
}

/** Longest side of a bbox, in metres. */
export function bboxSpanMeters(bbox: Bbox): number {
  const midLat = (bbox.minLat + bbox.maxLat) / 2;
  const width = haversineMeters(bbox.minLng, midLat, bbox.maxLng, midLat);
  const height = haversineMeters(bbox.minLng, bbox.minLat, bbox.minLng, bbox.maxLat);

  return Math.max(width, height);
}

/** Grow a bbox by `meters` on every side. */
export function expandBbox(bbox: Bbox, meters: number): Bbox {
  const midLat = (bbox.minLat + bbox.maxLat) / 2;
  const dLat = meters / METERS_PER_DEG_LAT;
  const dLng = meters / metersPerDegreeLng(midLat);

  return {
    minLng: bbox.minLng - dLng,
    minLat: bbox.minLat - dLat,
    maxLng: bbox.maxLng + dLng,
    maxLat: bbox.maxLat + dLat,
  };
}
