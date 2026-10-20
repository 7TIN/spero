import {
  CUSTOM_BUSINESS_TYPE,
  type Bbox,
  type BusinessTypeKey,
  type PlaceFeatureCollection,
} from "@spero/shared";
import {
  customBusinessSource,
  getBusinessType,
} from "../config/business-types";
import { getPlacesForBbox } from "./place-source";

export interface PlacesParams {
  bbox: Bbox;
  type: BusinessTypeKey;
  label?: string;
}

/** Competitor places of one business type, as GeoJSON points with card data. */
export async function getPlaces({
  bbox,
  type,
  label,
}: PlacesParams): Promise<PlaceFeatureCollection> {
  const source =
    type === CUSTOM_BUSINESS_TYPE
      ? customBusinessSource(label ?? "")
      : getBusinessType(type);
  const places = await getPlacesForBbox(bbox, source);

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
