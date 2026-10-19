import type { Bbox } from "@spero/shared";

const EARTH_RADIUS_M = 6_371_008.8;

function toRadians(degrees: number): number {
  return (degrees * Math.PI) / 180;
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
