export interface PlaceCardData {
  id: string;
  name: string | null;
  rawCategory: string | null;
  address: string | null;
  phone: string | null;
  website: string | null;
  openingHours: string | null;
  longitude: number;
  latitude: number;
  distanceMeters: number;
}

/** Free Google Maps URL: a search link, no API key or Google API call. */
export function googleMapsUrl(
  name: string | null,
  latitude: number,
  longitude: number,
): string {
  const namePart = name?.trim()
    ? `${encodeURIComponent(name.trim()).replace(/%20/g, "+")}+`
    : "";

  return `https://www.google.com/maps/search/?api=1&query=${namePart}${latitude},${longitude}`;
}

export function formatDistance(distanceMeters: number): string {
  if (distanceMeters < 1000) return `${Math.round(distanceMeters)} m`;
  return `${(distanceMeters / 1000).toFixed(1)} km`;
}
