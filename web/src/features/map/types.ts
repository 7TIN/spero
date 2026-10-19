import type { Bbox } from "@spero/shared";

export interface MapViewport {
  bbox: Bbox | null;
  zoom: number;
}
