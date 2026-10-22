import { useCallback, useMemo } from "react";
import {
  useQueries,
  useQuery,
  type UseQueryOptions,
  type UseQueryResult,
} from "@tanstack/react-query";
import type {
  Bbox,
  BusinessSelection,
  PlaceFeature,
  PlaceFeatureCollection,
} from "@spero/shared";
import { fetchPlaces } from "./api";
import { MAX_VIEW_BBOX_SPAN_M } from "./constants";
import { bboxAround, bboxSpanMeters } from "./geo";
import {
  MAX_VIEW_PLACE_TILES,
  placeTileQueryBounds,
  placeTilesForBbox,
  type PlaceTile,
} from "./tiles";
import type { SelectedCell } from "./types";

const AREA_STALE_TIME_MS = 30_000;

/**
 * The browser keeps fetched tiles for half an hour even though the backend
 * keeps them for 30 days. TanStack Query still serves stale data while it
 * refreshes in the background, so a revisit stays instant.
 */
const VIEW_TILE_STALE_TIME_MS = 30 * 60_000;
const VIEW_TILE_GC_TIME_MS = 60 * 60_000;

const VIEW_BBOX_TOO_LARGE_ERROR = new Error(
  `bbox is too large, keep the area within about ${MAX_VIEW_BBOX_SPAN_M / 1000} km`,
);

export interface ViewPlacesResult {
  data?: PlaceFeatureCollection;
  isFetching: boolean;
  error: Error | null;
}

interface TilePlan {
  tiles: PlaceTile[];
  tooLarge: boolean;
}

function planTiles(bbox: Bbox | null): TilePlan {
  if (!bbox) return { tiles: [], tooLarge: false };

  if (bboxSpanMeters(bbox) > MAX_VIEW_BBOX_SPAN_M) {
    return { tiles: [], tooLarge: true };
  }

  const tiles = placeTilesForBbox(bbox);
  if (tiles.length > MAX_VIEW_PLACE_TILES) {
    return { tiles: [], tooLarge: true };
  }

  return { tiles, tooLarge: false };
}

function insideBbox(lng: number, lat: number, bbox: Bbox): boolean {
  return (
    lng >= bbox.minLng &&
    lng <= bbox.maxLng &&
    lat >= bbox.minLat &&
    lat <= bbox.maxLat
  );
}

/**
 * Merge cached tile responses into the layer returned for the current
 * viewport. Tiles outside the viewport stay in TanStack Query's cache but are
 * filtered out here, so panning back is immediate without showing stale
 * markers outside the visible area.
 */
function mergeTileResults(
  results: Array<UseQueryResult<PlaceFeatureCollection>>,
  bbox: Bbox | null,
): ViewPlacesResult {
  if (!bbox || results.length === 0) {
    return { data: undefined, isFetching: false, error: null };
  }

  const byPlaceId = new Map<string, PlaceFeature>();
  let isFetching = false;
  let error: Error | null = null;

  for (const result of results) {
    isFetching ||= result.isFetching;
    if (!error && result.error) error = result.error;

    for (const feature of result.data?.features ?? []) {
      const [lng, lat] = feature.geometry.coordinates;
      if (lng === undefined || lat === undefined) continue;
      if (!insideBbox(lng, lat, bbox)) continue;

      byPlaceId.set(feature.properties.id, feature);
    }
  }

  return {
    data: {
      type: "FeatureCollection",
      features: [...byPlaceId.values()],
    },
    isFetching,
    error,
  };
}

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
    staleTime: AREA_STALE_TIME_MS,
    // Overpass already tries several endpoints; do not add request retries.
    retry: false,
    refetchOnWindowFocus: false,
  });
}

/**
 * The standalone competitor layer: every place of the chosen type inside the
 * current viewport, independent of a selected cell. Callers disable it while a
 * cell is selected so the area query remains the single source of markers.
 *
 * Requests are scoped to the backend's 0.05 degree tiles. Moving within a tile
 * reuses its cached response; crossing a tile boundary fetches only the tiles
 * that are newly visible.
 */
export function usePlacesInBbox(
  bbox: Bbox | null,
  selection: BusinessSelection | null,
): ViewPlacesResult {
  const label = selection?.label ?? null;
  const tilePlan = useMemo(() => planTiles(bbox), [bbox]);

  const queries = useMemo<Array<UseQueryOptions<PlaceFeatureCollection>>>(
    () => {
      if (!selection || tilePlan.tiles.length === 0) return [];

      return tilePlan.tiles.map((tile) => ({
        queryKey: [
          "places",
          "tile",
          selection.type,
          label,
          tile.x,
          tile.y,
        ],
        queryFn: ({ signal }) =>
          fetchPlaces({
            bbox: placeTileQueryBounds(tile),
            selection,
            signal,
          }),
        staleTime: VIEW_TILE_STALE_TIME_MS,
        gcTime: VIEW_TILE_GC_TIME_MS,
        // Overpass already tries several endpoints; do not add request retries.
        retry: false,
        refetchOnWindowFocus: false,
      }));
    },
    [label, selection, tilePlan.tiles],
  );

  const combine = useCallback(
    (results: Array<UseQueryResult<PlaceFeatureCollection>>) =>
      mergeTileResults(results, bbox),
    [bbox],
  );

  const merged = useQueries({ queries, combine });

  if (selection && tilePlan.tooLarge) {
    return {
      data: undefined,
      isFetching: false,
      error: VIEW_BBOX_TOO_LARGE_ERROR,
    };
  }

  return merged;
}
