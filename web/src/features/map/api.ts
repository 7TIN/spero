import type {
  AgentContext,
  AgentResponse,
  Bbox,
  BusinessSelection,
  GeocodeResponse,
  HotzoneFeatureCollection,
  PlaceFeatureCollection,
  PoiCategory,
  PoiFeatureCollection,
} from "@spero/shared";
import { API_BASE_URL } from "./constants";

function bboxParam(bbox: Bbox): string {
  return [bbox.minLng, bbox.minLat, bbox.maxLng, bbox.maxLat].join(",");
}

export class AgentApiError extends Error {
  readonly status: number;

  constructor(message: string, status: number) {
    super(message);
    this.name = "AgentApiError";
    this.status = status;
  }
}

async function readError(response: Response): Promise<Error> {
  let message = `Request failed with status ${response.status}`;
  try {
    const body = (await response.json()) as { error?: string };
    if (body.error) message = body.error;
  } catch {
    // Keep the generic message when the response is not JSON.
  }
  return new AgentApiError(message, response.status);
}

async function request<T>(
  path: string,
  params: URLSearchParams,
  signal?: AbortSignal,
): Promise<T> {
  const response = await fetch(`${API_BASE_URL}${path}?${params.toString()}`, {
    signal,
  });

  if (!response.ok) throw await readError(response);

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

export interface FetchPlacesParams {
  bbox: Bbox;
  selection: BusinessSelection;
  signal?: AbortSignal;
}

export function fetchPlaces({
  bbox,
  selection,
  signal,
}: FetchPlacesParams): Promise<PlaceFeatureCollection> {
  const params = new URLSearchParams({
    bbox: bboxParam(bbox),
    type: selection.type,
  });
  if (selection.label) params.set("label", selection.label);

  return request<PlaceFeatureCollection>("/api/places", params, signal);
}

export interface FetchGeocodeParams {
  query: string;
  signal?: AbortSignal;
}

export function fetchGeocode({
  query,
  signal,
}: FetchGeocodeParams): Promise<GeocodeResponse> {
  const params = new URLSearchParams({ q: query, limit: "5" });

  return request<GeocodeResponse>("/api/geocode", params, signal);
}

export interface FetchAgentParams {
  query: string;
  context: AgentContext;
  signal?: AbortSignal;
}

export async function fetchAgent({
  query,
  context,
  signal,
}: FetchAgentParams): Promise<AgentResponse> {
  const response = await fetch(`${API_BASE_URL}/api/agent`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ query, context }),
    signal,
  });

  if (!response.ok) throw await readError(response);

  return (await response.json()) as AgentResponse;
}
