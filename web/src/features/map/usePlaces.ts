import { useQuery } from "@tanstack/react-query";
import type {
  Bbox,
  BusinessSelection,
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
  selection: BusinessSelection | null,
  radius: number,
) {
  const bbox =
    area && selection
      ? bboxAround(area.centerLng, area.centerLat, radius)
      : null;
  const label = selection?.label ?? null;

  return useQuery({
    queryKey: ["places", "area", selection?.type ?? null, label, bbox],
    queryFn: ({ signal }): Promise<PlaceFeatureCollection> => {
      if (!bbox || !selection) throw new Error("area and type are required");
      return fetchPlaces({ bbox, selection, signal });
    },
    enabled: bbox !== null && selection !== null,
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
  selection: BusinessSelection | null,
) {
  const label = selection?.label ?? null;

  return useQuery({
    queryKey: ["places", "view", selection?.type ?? null, label, bbox],
    queryFn: ({ signal }): Promise<PlaceFeatureCollection> => {
      if (!bbox || !selection) throw new Error("bbox and type are required");
      return fetchPlaces({ bbox, selection, signal });
    },
    enabled: bbox !== null && selection !== null,
    staleTime: 30_000,
    retry: false,
    refetchOnWindowFocus: false,
  });
}
