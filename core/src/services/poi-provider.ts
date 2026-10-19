import type { Bbox } from "@spero/shared";
import { POI_PROVIDER } from "../config/poi";
import { fetchPoisForBbox as fetchFromGeoapify } from "./geoapify";
import { fetchPoisForBbox as fetchFromOverpass } from "./overpass";
import type { SourcePoi } from "./poi-types";

/** Fetch POIs for a bbox from whichever hosted provider is configured. */
export function fetchPoisForBbox(bbox: Bbox): Promise<SourcePoi[]> {
  return POI_PROVIDER === "geoapify"
    ? fetchFromGeoapify(bbox)
    : fetchFromOverpass(bbox);
}
