import type {
  Bbox,
  HotzoneFeatureCollection,
  PoiCategory,
  PoiFeatureCollection,
} from "@spero/shared";
import { API_BASE_URL } from "./constants";

function bboxParam(bbox: Bbox): string {
  return [bbox.minLng, bbox.minLat, bbox.maxLng, bbox.maxLat].join(",");
}

async function request<T>(
  path: string,
  params: URLSearchParams,
  signal?: AbortSignal,
): Promise<T> {
  const response = await fetch(`${API_BASE_URL}${path}?${params.toString()}`, {
    signal,
  });

  if (!response.ok) {
    let message = `Request failed with status ${response.status}`;
    try {
      const body = (await response.json()) as { error?: string };
      if (body.error) message = body.error;
    } catch {
      // Keep the generic message when the response is not JSON.
    }
    throw new Error(message);
  }

  return (await response.json()) as T;
}

export interface FetchHotzonesParams {
  bbox: Bbox;
  cell: number;
  radius: number;
  signal?: AbortSignal;
}

export function fetchHotzones({
  bbox,
  cell,
  radius,
  signal,
}: FetchHotzonesParams): Promise<HotzoneFeatureCollection> {
  const params = new URLSearchParams({
    bbox: bboxParam(bbox),
    cell: String(cell),
    radius: String(radius),
  });

  return request<HotzoneFeatureCollection>("/api/hotzones", params, signal);
}

export interface FetchPoisParams {
  bbox: Bbox;
  categories: PoiCategory[];
  signal?: AbortSignal;
}

export function fetchPois({
  bbox,
  categories,
  signal,
}: FetchPoisParams): Promise<PoiFeatureCollection> {
  const params = new URLSearchParams({ bbox: bboxParam(bbox) });
  if (categories.length > 0) {
    params.set("categories", categories.join(","));
  }

  return request<PoiFeatureCollection>("/api/pois", params, signal);
}
