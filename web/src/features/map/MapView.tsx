import { useCallback, useRef, useState } from "react";
import Map, { NavigationControl, type MapRef } from "react-map-gl/maplibre";
import type {
  Bbox,
  HotzoneFeatureCollection,
  PlaceFeatureCollection,
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
  POI_MIN_ZOOM,
  type BasemapId,
} from "./constants";
import { CompetitorLayer } from "./CompetitorLayer";
import { HotzoneLayer } from "./HotzoneLayer";
import { PoiLayer } from "./PoiLayer";
import { SelectedCellOverlay } from "./SelectedCellOverlay";
import type { SelectedCell, SelectionMode } from "./types";

interface MapViewProps {
  basemap: BasemapId;
  hotzones?: HotzoneFeatureCollection;
  pois?: PoiFeatureCollection;
  competitors?: PlaceFeatureCollection;
  focusedPlaceId: string | null;
  outlineCell: SelectedCell | null;
  selectionMode: SelectionMode;
  locked: boolean;
  onSelect: (cell: SelectedCell) => void;
  onClearSelection: () => void;
  onToggleLock: () => void;
  onCompetitorSelect: (placeId: string) => void;
  onMoveStart: () => void;
  onViewportChange: (viewport: { bbox: Bbox; zoom: number }) => void;
}

function parseScore(value: unknown): number {
  const score = typeof value === "number" ? value : Number(value);
  return Number.isFinite(score) ? score : 0;
}

/** Bounds of a rectangular cell ring, used for the outline and the lock. */
function ringBounds(ring: ReadonlyArray<ReadonlyArray<number>>): Bbox | null {
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

  return { minLng, minLat, maxLng, maxLat };
}

export function MapView({
  basemap,
  hotzones,
  pois,
  competitors,
  focusedPlaceId,
  outlineCell,
  selectionMode,
  locked,
  onSelect,
  onClearSelection,
  onToggleLock,
  onCompetitorSelect,
  onMoveStart,
  onViewportChange,
}: MapViewProps) {
  const mapRef = useRef<MapRef>(null);
  const [zoom, setZoom] = useState(DEFAULT_ZOOM);

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

  const showOutline = selectionMode === "selection" && outlineCell !== null;

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
      onMoveStart={onMoveStart}
      onZoom={(event) => setZoom(event.viewState.zoom)}
      onClick={(event) => {
        // The outline's lock and close buttons sit inside MapLibre's canvas
        // container, so a click on them also reaches the map. Ignore those
        // clicks instead of selecting whatever cell sits under the button.
        const target = event.originalEvent.target;
        if (target instanceof Element && target.closest(".maplibregl-marker")) {
          return;
        }

        const feature = event.features?.find(
          (candidate) => candidate.layer?.id === "hotzones-fill",
        );
        if (!feature) return;

        const ring =
          feature.geometry?.type === "Polygon"
            ? feature.geometry.coordinates[0]
            : null;
        const bounds = ring ? ringBounds(ring) : null;
        if (!bounds) return;

        onSelect({
          centerLng: (bounds.minLng + bounds.maxLng) / 2,
          centerLat: (bounds.minLat + bounds.maxLat) / 2,
          score: parseScore(feature.properties?.score),
          bounds,
        });
      }}
    >
      <NavigationControl position="bottom-right" />
      <HotzoneLayer data={hotzones} />
      <PoiLayer data={pois} />
      {zoom >= POI_MIN_ZOOM && (
        <CompetitorLayer
          data={competitors}
          focusedPlaceId={focusedPlaceId}
          onSelect={onCompetitorSelect}
        />
      )}
      {showOutline && outlineCell && (
        <SelectedCellOverlay
          cell={outlineCell}
          locked={locked}
          color={basemap === "dark" ? "#f8fafc" : "#0f172a"}
          onClear={onClearSelection}
          onToggleLock={onToggleLock}
        />
      )}
    </Map>
  );
}
