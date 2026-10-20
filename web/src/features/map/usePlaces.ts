import { useQuery } from "@tanstack/react-query";
import type {
  Bbox,
  BusinessTypeId,
  PlaceFeatureCollection,
} from "@spero/shared";
import { fetchPlaces } from "./api";
import { bboxAround } from "./geo";
import type { SelectedCell } from "./types";

/**
 * Competitors of the selected business type. The query is disabled until both
 * an area and a type are chosen, so the default view never spends credits.
 */
export function usePlaces(
  area: SelectedCell | null,
  type: BusinessTypeId | null,
  radius: number,
) {
  const bbox =
    area && type ? bboxAround(area.centerLng, area.centerLat, radius) : null;

  return useQuery({
    queryKey: ["places", "area", type, bbox],
    queryFn: ({ signal }): Promise<PlaceFeatureCollection> => {
      if (!bbox || !type) throw new Error("area and type are required");
      return fetchPlaces({ bbox, type, signal });
    },
    enabled: bbox !== null && type !== null,
    staleTime: 30_000,
    // Overpass already tries several endpoints; do not add request retries.
    retry: false,
    refetchOnWindowFocus: false,
  });
}

/**
 * The standalone competitor layer: every place of the chosen type inside the
 * current viewport, independent of a selected cell. Callers disable it while a
 * cell is selected so the area query remains the single source of markers.
 */
export function usePlacesInBbox(
  bbox: Bbox | null,
  type: BusinessTypeId | null,
) {
  return useQuery({
    queryKey: ["places", "view", type, bbox],
    queryFn: ({ signal }): Promise<PlaceFeatureCollection> => {
      if (!bbox || !type) throw new Error("bbox and type are required");
      return fetchPlaces({ bbox, type, signal });
    },
    enabled: bbox !== null && type !== null,
    staleTime: 30_000,
    retry: false,
    refetchOnWindowFocus: false,
  });
}
