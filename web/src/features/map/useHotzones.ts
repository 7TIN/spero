import { keepPreviousData, useQuery } from "@tanstack/react-query";
import type { Bbox } from "@spero/shared";
import { fetchHotzones } from "./api";

export function useHotzones(bbox: Bbox | null, cell: number, radius: number) {
  return useQuery({
    queryKey: ["hotzones", bbox, cell, radius],
    queryFn: ({ signal }) => {
      if (!bbox) throw new Error("bbox is required");
      return fetchHotzones({ bbox, cell, radius, signal });
    },
    enabled: bbox !== null,
    placeholderData: keepPreviousData,
    staleTime: 30_000,
  });
}
