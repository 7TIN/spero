import { useQuery } from "@tanstack/react-query";
import { POI_CATEGORIES, type PoiFeatureCollection } from "@spero/shared";
import { fetchPois } from "./api";
import { bboxAround } from "./geo";
import type { SelectedCell } from "./types";

/**
 * All places that can contribute to a cell's score: every category within the
 * reach radius of the cell centre. The sidebar category toggles only affect the
 * POI dots, so they are deliberately ignored here.
 */
export function useCellPois(cell: SelectedCell | null, radius: number) {
  const bbox = cell ? bboxAround(cell.centerLng, cell.centerLat, radius) : null;

  return useQuery({
    queryKey: [
      "cell-pois",
      cell?.centerLng ?? null,
      cell?.centerLat ?? null,
      radius,
    ],
    queryFn: ({ signal }): Promise<PoiFeatureCollection> => {
      if (!bbox) throw new Error("cell is required");
      return fetchPois({ bbox, categories: [...POI_CATEGORIES], signal });
    },
    enabled: bbox !== null,
    staleTime: 60_000,
    retry: false,
    refetchOnWindowFocus: false,
  });
}
