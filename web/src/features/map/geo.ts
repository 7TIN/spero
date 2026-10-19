import type { Bbox } from "@spero/shared";

const EARTH_RADIUS_M = 6_371_008.8;
const METERS_PER_DEG_LAT = 110_574;
const METERS_PER_DEG_LNG_EQUATOR = 111_320;

/** Square bbox that fully contains a circle of `radiusMeters`. */
export function bboxAround(
  lng: number,
  lat: number,
  radiusMeters: number,
): Bbox {
  const cos = Math.max(Math.cos((lat * Math.PI) / 180), 1e-6);
  const dLat = radiusMeters / METERS_PER_DEG_LAT;
  const dLng = radiusMeters / (METERS_PER_DEG_LNG_EQUATOR * cos);

  return {
    minLng: lng - dLng,
    minLat: lat - dLat,
    maxLng: lng + dLng,
    maxLat: lat + dLat,
  };
}

/** Great-circle distance in metres. Mirrors core/src/lib/geo.ts. */
export function haversineMeters(
  fromLng: number,
  fromLat: number,
  toLng: number,
  toLat: number,
): number {
  const toRadians = (degrees: number) => (degrees * Math.PI) / 180;
  const dLat = toRadians(toLat - fromLat);
  const dLng = toRadians(toLng - fromLng);
  const lat1 = toRadians(fromLat);
  const lat2 = toRadians(toLat);

  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(lat1) * Math.cos(lat2) * Math.sin(dLng / 2) ** 2;

  return 2 * EARTH_RADIUS_M * Math.asin(Math.min(1, Math.sqrt(a)));
}
