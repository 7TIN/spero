import type {
  Bbox,
  BusinessTypeId,
  PlaceFeatureCollection,
} from "@spero/shared";
import { getPlacesForBbox } from "./place-source";

export interface PlacesParams {
  bbox: Bbox;
  type: BusinessTypeId;
}

/** Competitor places of one business type, as GeoJSON points with card data. */
export async function getPlaces({
  bbox,
  type,
}: PlacesParams): Promise<PlaceFeatureCollection> {
  const places = await getPlacesForBbox(bbox, type);

  return {
    type: "FeatureCollection",
    features: places.map((place) => ({
      type: "Feature" as const,
      geometry: {
        type: "Point" as const,
        coordinates: [place.lng, place.lat],
      },
      properties: {
        id: place.placeId,
        name: place.name,
        type: place.type,
        rawCategory: place.rawCategory,
        address: place.address,
        phone: place.phone,
        website: place.website,
        openingHours: place.openingHours,
      },
    })),
  };
}
