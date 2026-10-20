import type { Bbox } from "@spero/shared";
import type { BusinessTypeSource } from "../config/business-types";
import { POI_PROVIDER } from "../config/poi";
import {
  fetchPlacesForType as fetchPlacesFromGeoapify,
  fetchPoisForBbox as fetchFromGeoapify,
} from "./geoapify";
import {
  fetchPlacesForType as fetchPlacesFromOverpass,
  fetchPoisForBbox as fetchFromOverpass,
} from "./overpass";
import type { SourcePlace, SourcePoi } from "./poi-types";

/** Fetch POIs for a bbox from whichever hosted provider is configured. */
export function fetchPoisForBbox(bbox: Bbox): Promise<SourcePoi[]> {
  return POI_PROVIDER === "geoapify"
    ? fetchFromGeoapify(bbox)
    : fetchFromOverpass(bbox);
}

/** Fetch competitors of one business type from the configured provider. */
export function fetchPlacesForType(
  bbox: Bbox,
  source: BusinessTypeSource,
): Promise<SourcePlace[]> {
  return POI_PROVIDER === "geoapify"
    ? fetchPlacesFromGeoapify(bbox, source)
    : fetchPlacesFromOverpass(bbox, source);
}
