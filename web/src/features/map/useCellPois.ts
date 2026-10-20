import { useQuery } from "@tanstack/react-query";
import type { PoiCategory, PoiFeatureCollection } from "@spero/shared";
import { fetchPois } from "./api";
import { bboxAround } from "./geo";
import type { SelectedCell } from "./types";

/**
 * Places in the categories enabled on the right panel, within the selected
 * cell's reach radius. The left panel shows the same filtered list.
 */
export function useCellPois(
  cell: SelectedCell | null,
  radius: number,
  categories: PoiCategory[],
) {
  const bbox = cell ? bboxAround(cell.centerLng, cell.centerLat, radius) : null;
  const sortedCategories = [...categories].sort();

  return useQuery({
    queryKey: [
      "cell-pois",
      cell?.centerLng ?? null,
      cell?.centerLat ?? null,
      radius,
      sortedCategories,
    ],
    queryFn: ({ signal }): Promise<PoiFeatureCollection> => {
      if (!bbox) throw new Error("cell is required");
      return fetchPois({ bbox, categories: sortedCategories, signal });
    },
    enabled: bbox !== null && sortedCategories.length > 0,
    staleTime: 60_000,
    retry: false,
    refetchOnWindowFocus: false,
  });
}
