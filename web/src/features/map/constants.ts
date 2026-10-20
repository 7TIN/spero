import type { StyleSpecification } from "maplibre-gl";
import type { PoiCategory } from "@spero/shared";

/** Default map centre (Pune) and zoom. Change these to move the app. */
export const DEFAULT_CENTER = {
  longitude: 73.8567,
  latitude: 18.5204,
} as const;

/**
 * Roughly a 3-12 km wide view on common screens, which keeps the scored bbox
 * comfortably inside the API's 15 km limit. Keep this fairly tight.
 */
export const DEFAULT_ZOOM = 15;
export const MIN_MAP_ZOOM = 10;
export const MAX_MAP_ZOOM = 18;

/** Fetch hot zones after the map has been still for this long. */
export const MOVE_DEBOUNCE_MS = 400;

/** POI circles are only shown from this zoom level up. */
export const POI_MIN_ZOOM = 14;

export const DEFAULT_CELL_SIZE_M = 250;
export const MIN_CELL_SIZE_M = 50;
export const MAX_CELL_SIZE_M = 1000;
export const CELL_SIZE_STEP_M = 50;

export const DEFAULT_RADIUS_M = 500;
export const MIN_RADIUS_M = 100;
export const MAX_RADIUS_M = 2000;
export const RADIUS_STEP_M = 50;

/** Pins are deliberately capped so saved areas stay legible on the map. */
export const MAX_PINNED_CELLS = 6;
export const PIN_COLOR = "#f59e0b";
export const PIN_STORAGE_KEY = "spero:pinned-cells:v1";

/**
 * A viewport can contain hundreds of identical business markers. Keep the
 * layer responsive by showing the nearest subset and saying so in the panel.
 */
export const MAX_VIEW_COMPETITOR_MARKERS = 250;
export const MAX_VIEW_COMPETITOR_CARDS = 40;

export const API_BASE_URL =
  import.meta.env.VITE_API_URL ?? "http://localhost:3000";

/** Falls back to a free CARTO style when no key is configured. */
export const LIGHT_STYLE_URL =
  import.meta.env.VITE_MAP_STYLE_URL ??
  "https://basemaps.cartocdn.com/gl/positron-gl-style/style.json";

export const DARK_STYLE_URL =
  import.meta.env.VITE_MAP_STYLE_URL_DARK ??
  "https://basemaps.cartocdn.com/gl/dark-matter-gl-style/style.json";

/**
 * Classic OpenStreetMap raster tiles, built as a local style so the basemap
 * still works if a vector style host is unreachable.
 *
 * The public tile server is fine for development and light use. Read the
 * usage policy before deploying: https://operations.osmfoundation.org/policies/tiles/
 */
export const OSM_STYLE: StyleSpecification = {
  version: 8,
  sources: {
    osm: {
      type: "raster",
      tiles: ["https://tile.openstreetmap.org/{z}/{x}/{y}.png"],
      tileSize: 256,
      maxzoom: 19,
      attribution:
        '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors',
    },
  },
  layers: [{ id: "osm", type: "raster", source: "osm" }],
};

/**
 * Local thumbnails rendered from the same styles as the live map, so the
 * preview cards do not depend on a tile API key at runtime.
 */
export const BASEMAPS = [
  {
    id: "light",
    label: "Light",
    previewUrl: `${import.meta.env.BASE_URL}basemaps/light.png`,
  },
  {
    id: "dark",
    label: "Dark",
    previewUrl: `${import.meta.env.BASE_URL}basemaps/dark.png`,
  },
  {
    id: "osm",
    label: "OSM",
    previewUrl: `${import.meta.env.BASE_URL}basemaps/osm.png`,
  },
] as const;

export type BasemapId = (typeof BASEMAPS)[number]["id"];

/** Shared by the fill layer and the legend. */
export const HOTZONE_COLOR_STOPS = [
  { score: 0, color: "rgba(250, 204, 21, 0)" },
  { score: 30, color: "#facc15" },
  { score: 55, color: "#f97316" },
  { score: 80, color: "#ef4444" },
  { score: 100, color: "#b91c1c" },
] as const;

export const HOTZONE_FILL_OPACITY = 0.55;

/** Competitor markers use a colour that never appears in the crowd dots. */
export const COMPETITOR_COLOR = "#d946ef";

export const PLACES_ATTRIBUTION =
  'Powered by <a href="https://www.geoapify.com/" target="_blank" rel="noreferrer">Geoapify</a> | &copy; <a href="https://www.openstreetmap.org/copyright" target="_blank" rel="noreferrer">OpenStreetMap</a> contributors';

export const CATEGORY_LABELS: Record<PoiCategory, string> = {
  college: "College",
  school: "School",
  hospital: "Hospital",
  transport: "Transport",
  market: "Market",
  worship: "Worship",
  hotel: "Hotel",
  office: "Office",
  entertainment: "Entertainment",
  food: "Food",
};

export const CATEGORY_COLORS: Record<PoiCategory, string> = {
  college: "#8b5cf6",
  school: "#3b82f6",
  hospital: "#ef4444",
  transport: "#f97316",
  market: "#22c55e",
  worship: "#a16207",
  hotel: "#06b6d4",
  office: "#64748b",
  entertainment: "#ec4899",
  food: "#84cc16",
};
