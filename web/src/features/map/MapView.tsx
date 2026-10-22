import { useCallback, useEffect, useRef } from "react";
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
  PLACES_ATTRIBUTION,
  type BasemapId,
} from "./constants";
import { CompetitorLayer } from "./CompetitorLayer";
import { HotzoneLayer } from "./HotzoneLayer";
import { PinnedCellsLayer } from "./PinnedCellsLayer";
import { PoiLayer } from "./PoiLayer";
import { SelectedCellOverlay } from "./SelectedCellOverlay";
import type {
  FlyToTarget,
  PinnedCell,
  SelectedCell,
  SelectionMode,
} from "./types";

interface MapViewProps {
  basemap: BasemapId;
  hotzones?: HotzoneFeatureCollection;
  pois?: PoiFeatureCollection;
  competitors?: PlaceFeatureCollection;
  focusedPlaceId: string | null;
  outlineCell: SelectedCell | null;
  selectionMode: SelectionMode;
  flyToTarget: FlyToTarget | null;
  pinnedCells: PinnedCell[];
  selectedPinId: string | null;
  pinned: boolean;
  pinLimitReached: boolean;
  onSelect: (cell: SelectedCell) => void;
  onClearSelection: () => void;
  onTogglePin: () => void;
  onSelectPin: (pin: PinnedCell) => void;
  onCompetitorSelect: (placeId: string) => void;
  onMoveStart: () => void;
  onViewportChange: (viewport: { bbox: Bbox; zoom: number }) => void;
}

/**
 * Keep the required credits visible even when no Geoapify-backed layer has
 * loaded yet. Basemap source attribution (OpenStreetMap/CARTO) is appended by
 * MapLibre automatically.
 */
const ATTRIBUTION_CONTROL = {
  // Compact keeps the attribution collapsible, matching the previous control.
  compact: true,
  customAttribution: `MapLibre | ${PLACES_ATTRIBUTION}`,
} as const;

function parseScore(value: unknown): number {
  const score = typeof value === "number" ? value : Number(value);
  return Number.isFinite(score) ? score : 0;
}

/** Bounds of a rectangular cell ring, used for the selected-cell outline. */
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
  flyToTarget,
  pinnedCells,
  selectedPinId,
  pinned,
  pinLimitReached,
  onSelect,
  onClearSelection,
  onTogglePin,
  onSelectPin,
  onCompetitorSelect,
  onMoveStart,
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

  const handleLoad = useCallback(() => {
    reportViewport();

    // MapLibre opens compact attribution once on creation. Keep the map info
    // collapsed by default so it does not cover the basemap picker on phones.
    const attribution = mapRef.current
      ?.getContainer()
      .querySelector(".maplibregl-ctrl-attrib.maplibregl-compact");
    attribution?.classList.remove("maplibregl-compact-show");
    attribution?.removeAttribute("open");
  }, [reportViewport]);

  useEffect(() => {
    const map = mapRef.current;
    if (!map || !flyToTarget) return;

    const { latitude, longitude, bbox } = flyToTarget;
    if (!bbox) {
      map.flyTo({ center: [longitude, latitude], zoom: 15, duration: 1_200 });
      return;
    }

    const span = Math.max(
      bbox.maxLng - bbox.minLng,
      bbox.maxLat - bbox.minLat,
    );

    // The scoring API accepts about 15 km per side. Fit smaller results, but
    // centre large administrative areas at a workable neighbourhood zoom.
    if (span > 0.12) {
      map.flyTo({ center: [longitude, latitude], zoom: 13, duration: 1_200 });
      return;
    }

    map.fitBounds(
      [
        [bbox.minLng, bbox.minLat],
        [bbox.maxLng, bbox.maxLat],
      ],
      { padding: 80, maxZoom: 16, duration: 1_200 },
    );
  }, [flyToTarget]);

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
      attributionControl={ATTRIBUTION_CONTROL}
      interactiveLayerIds={["hotzones-fill"]}
      onLoad={handleLoad}
      onMoveEnd={reportViewport}
      onMoveStart={onMoveStart}
      onClick={(event) => {
        // The outline's pin and close buttons sit inside MapLibre's canvas
        // container, so their clicks bubble to the map. Ignore marker clicks,
        // and ignore targets that the click handler already removed (the
        // overlay's own close button) instead of selecting the cell beneath.
        const target = event.originalEvent.target;
        if (
          !(target instanceof Element) ||
          !target.isConnected ||
          target.closest(".maplibregl-marker")
        ) {
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
      <PinnedCellsLayer
        pins={pinnedCells}
        selectedId={selectedPinId}
        onSelect={onSelectPin}
      />
      <PoiLayer data={pois} />
      <CompetitorLayer
        data={competitors}
        focusedPlaceId={focusedPlaceId}
        onSelect={onCompetitorSelect}
      />
      {showOutline && outlineCell && (
        <SelectedCellOverlay
          cell={outlineCell}
          pinned={pinned}
          pinLimitReached={pinLimitReached}
          color={basemap === "dark" ? "#f8fafc" : "#0f172a"}
          onClear={onClearSelection}
          onTogglePin={onTogglePin}
        />
      )}
    </Map>
  );
}
