import { useCallback, useRef } from "react";
import Map, { NavigationControl, type MapRef } from "react-map-gl/maplibre";
import type {
  Bbox,
  HotzoneFeatureCollection,
  PoiFeatureCollection,
} from "@spero/shared";
import {
  DARK_STYLE_URL,
  DEFAULT_CENTER,
  DEFAULT_ZOOM,
  LIGHT_STYLE_URL,
  MAX_MAP_ZOOM,
  MIN_MAP_ZOOM,
  OSM_STYLE,
  type BasemapId,
} from "./constants";
import { HotzoneLayer } from "./HotzoneLayer";
import { PoiLayer } from "./PoiLayer";
import type { SelectedCell } from "./types";

interface MapViewProps {
  basemap: BasemapId;
  hotzones?: HotzoneFeatureCollection;
  pois?: PoiFeatureCollection;
  onSelect: (cell: SelectedCell | null) => void;
  onViewportChange: (viewport: { bbox: Bbox; zoom: number }) => void;
}

function parseScore(value: unknown): number {
  const score = typeof value === "number" ? value : Number(value);
  return Number.isFinite(score) ? score : 0;
}

/** Centre of a rectangular cell ring, which is where the score is measured. */
function ringCenter(
  ring: ReadonlyArray<ReadonlyArray<number>>,
): { lng: number; lat: number } | null {
  let minLng = Number.POSITIVE_INFINITY;
  let minLat = Number.POSITIVE_INFINITY;
  let maxLng = Number.NEGATIVE_INFINITY;
  let maxLat = Number.NEGATIVE_INFINITY;

  for (const position of ring) {
    const lng = position[0];
    const lat = position[1];
    if (typeof lng !== "number" || typeof lat !== "number") continue;
    minLng = Math.min(minLng, lng);
    minLat = Math.min(minLat, lat);
    maxLng = Math.max(maxLng, lng);
    maxLat = Math.max(maxLat, lat);
  }

  if (!Number.isFinite(minLng) || !Number.isFinite(minLat)) return null;

  return { lng: (minLng + maxLng) / 2, lat: (minLat + maxLat) / 2 };
}

export function MapView({
  basemap,
  hotzones,
  pois,
  onSelect,
  onViewportChange,
}: MapViewProps) {
  const mapRef = useRef<MapRef>(null);

  const reportViewport = useCallback(() => {
    const map = mapRef.current;
    if (!map) return;

    const bounds = map.getBounds();
    onViewportChange({
      bbox: {
        minLng: bounds.getWest(),
        minLat: bounds.getSouth(),
        maxLng: bounds.getEast(),
        maxLat: bounds.getNorth(),
      },
      zoom: map.getZoom(),
    });
  }, [onViewportChange]);

  return (
    <Map
      ref={mapRef}
      initialViewState={{ ...DEFAULT_CENTER, zoom: DEFAULT_ZOOM }}
      mapStyle={
        basemap === "osm"
          ? OSM_STYLE
          : basemap === "dark"
            ? DARK_STYLE_URL
            : LIGHT_STYLE_URL
      }
      minZoom={MIN_MAP_ZOOM}
      maxZoom={MAX_MAP_ZOOM}
      interactiveLayerIds={["hotzones-fill"]}
      onLoad={reportViewport}
      onMoveEnd={reportViewport}
      onMoveStart={() => onSelect(null)}
      onClick={(event) => {
        const feature = event.features?.find(
          (candidate) => candidate.layer?.id === "hotzones-fill",
        );
        if (!feature) return;

        const ring =
          feature.geometry?.type === "Polygon"
            ? feature.geometry.coordinates[0]
            : null;
        const center = ring ? ringCenter(ring) : null;
        if (!center) return;

        onSelect({
          centerLng: center.lng,
          centerLat: center.lat,
          score: parseScore(feature.properties?.score),
        });
      }}
    >
      <NavigationControl position="bottom-right" />
      <HotzoneLayer data={hotzones} />
      <PoiLayer data={pois} />
    </Map>
  );
}
