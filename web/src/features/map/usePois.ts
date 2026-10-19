import { keepPreviousData, useQuery } from "@tanstack/react-query";
import type { Bbox, PoiCategory } from "@spero/shared";
import { fetchPois } from "./api";

export function usePois(
  bbox: Bbox | null,
  categories: PoiCategory[],
  enabled: boolean,
) {
  const sortedCategories = [...categories].sort();

  return useQuery({
    queryKey: ["pois", bbox, sortedCategories],
    queryFn: ({ signal }) => {
      if (!bbox) throw new Error("bbox is required");
      return fetchPois({ bbox, categories: sortedCategories, signal });
    },
    enabled: enabled && bbox !== null && sortedCategories.length > 0,
    placeholderData: keepPreviousData,
    staleTime: 30_000,
    // Overpass already tries several endpoints; do not add request retries.
    retry: false,
    refetchOnWindowFocus: false,
  });
}
