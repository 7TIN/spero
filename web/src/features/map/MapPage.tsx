import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  POI_CATEGORIES,
  type BusinessTypeId,
  type GeocodeResult,
  type PoiCategory,
} from "@spero/shared";
import { useDebouncedValue } from "../../lib/use-debounced-value";
import { ControlPanel } from "./ControlPanel";
import {
  DEFAULT_CELL_SIZE_M,
  DEFAULT_RADIUS_M,
  DEFAULT_ZOOM,
  MAX_PINNED_CELLS,
  MOVE_DEBOUNCE_MS,
  POI_MIN_ZOOM,
  type BasemapId,
} from "./constants";
import { CellDetailPanel } from "./CellDetailPanel";
import { haversineMeters } from "./geo";
import { MapSearch } from "./MapSearch";
import { MapView } from "./MapView";
import { cellKey, loadPinnedCells, savePinnedCells } from "./pins";
import type {
  FlyToTarget,
  MapViewport,
  PinnedCell,
  SelectedCell,
  SelectionMode,
} from "./types";
import { useHotzones } from "./useHotzones";
import { usePlaces } from "./usePlaces";
import { usePois } from "./usePois";

interface MapPageProps {
  isDark: boolean;
  onToggleTheme: () => void;
}

export function MapPage({ isDark, onToggleTheme }: MapPageProps) {
  const [cellSize, setCellSize] = useState(DEFAULT_CELL_SIZE_M);
  const [radius, setRadius] = useState(DEFAULT_RADIUS_M);
  const [enabledCategories, setEnabledCategories] = useState<PoiCategory[]>([
    ...POI_CATEGORIES,
  ]);
  // Until the user picks a basemap explicitly, follow the app theme.
  const [basemapChoice, setBasemapChoice] = useState<BasemapId | null>(null);
  const basemap: BasemapId =
    basemapChoice ?? (isDark ? "dark" : "light");
  const [viewport, setViewport] = useState<MapViewport>({
    bbox: null,
    zoom: DEFAULT_ZOOM,
  });
  const [mode, setMode] = useState<SelectionMode>("selection");
  const [selectedCell, setSelectedCell] = useState<SelectedCell | null>(null);
  const [pinnedCells, setPinnedCells] = useState<PinnedCell[]>(() =>
    loadPinnedCells(),
  );
  const [businessType, setBusinessType] = useState<BusinessTypeId | null>(null);
  const [focusedPlaceId, setFocusedPlaceId] = useState<string | null>(null);
  const [flyToTarget, setFlyToTarget] = useState<FlyToTarget | null>(null);
  const flyToId = useRef(0);

  const debouncedViewport = useDebouncedValue(viewport, MOVE_DEBOUNCE_MS);

  // Pins are saved areas, not a scoring lock: the grid keeps following the
  // viewport so panning to another neighbourhood still scores that area.
  const hotzones = useHotzones(debouncedViewport.bbox, cellSize, radius);

  useEffect(() => {
    savePinnedCells(pinnedCells);
  }, [pinnedCells]);

  const poisEnabled =
    debouncedViewport.zoom >= POI_MIN_ZOOM && enabledCategories.length > 0;
  const pois = usePois(
    debouncedViewport.bbox,
    enabledCategories,
    poisEnabled,
  );

  // The competitor list follows the selected cell. Pins are saved shortcuts to
  // cells, so choosing one simply selects it again. Keeping the query here (not
  // in the panel) keeps the markers in sync with the panel's empty state.
  const competitorArea = selectedCell;
  const competitors = usePlaces(competitorArea, businessType, radius);

  // The API returns the square bbox that contains the reach circle. Keep the
  // marker layer in sync with the distance-filtered list in the panel.
  const competitorMarkers = useMemo(() => {
    if (!competitors.data || !competitorArea) return undefined;

    return {
      ...competitors.data,
      features: competitors.data.features.filter((feature) => {
        const [lng, lat] = feature.geometry.coordinates;
        if (lng === undefined || lat === undefined) return false;

        return (
          haversineMeters(
            competitorArea.centerLng,
            competitorArea.centerLat,
            lng,
            lat,
          ) < radius
        );
      }),
    };
  }, [competitors.data, competitorArea, radius]);

  const toggleCategory = useCallback((category: PoiCategory) => {
    setEnabledCategories((current) =>
      current.includes(category)
        ? current.filter((entry) => entry !== category)
        : [...current, category],
    );
  }, []);

  const handleViewportChange = useCallback(
    (next: { bbox: MapViewport["bbox"]; zoom: number }) => {
      if (!next.bbox) return;
      setViewport({ bbox: next.bbox, zoom: next.zoom });
    },
    [],
  );

  const handleSelect = useCallback((cell: SelectedCell) => {
    setSelectedCell(cell);
    setFocusedPlaceId(null);
  }, []);

  // The left panel stays visible and falls back to its empty state. In normal
  // mode a moving map drops the selection; selection mode keeps the outline so
  // the user keeps their bearings.
  const handleMoveStart = useCallback(() => {
    setFocusedPlaceId(null);
    if (mode !== "selection") {
      setSelectedCell(null);
    }
  }, [mode]);

  const handleClearSelection = useCallback(() => {
    setSelectedCell(null);
    setFocusedPlaceId(null);
  }, []);

  const handleTogglePin = useCallback(() => {
    if (!selectedCell) return;

    const id = cellKey(selectedCell);
    setPinnedCells((current) => {
      if (current.some((pin) => pin.id === id)) {
        return current.filter((pin) => pin.id !== id);
      }

      if (current.length >= MAX_PINNED_CELLS) return current;

      return [
        ...current,
        { id, cell: selectedCell, pinnedAt: Date.now() },
      ];
    });
  }, [selectedCell]);

  const handleSelectPin = useCallback((pin: PinnedCell) => {
    setMode("selection");
    setSelectedCell(pin.cell);
    setFocusedPlaceId(null);

    flyToId.current += 1;
    setFlyToTarget({
      id: flyToId.current,
      latitude: pin.cell.centerLat,
      longitude: pin.cell.centerLng,
      bbox: pin.cell.bounds,
      label: "Pinned cell",
    });
  }, []);

  const handleRemovePin = useCallback((id: string) => {
    setPinnedCells((current) => current.filter((pin) => pin.id !== id));
  }, []);

  const handleModeChange = useCallback((next: SelectionMode) => {
    setMode(next);
    if (next === "normal") {
      setSelectedCell(null);
      setFocusedPlaceId(null);
    }
  }, []);

  const handleCellSizeChange = useCallback(
    (value: number) => {
      setCellSize(value);
      if (mode !== "selection") setSelectedCell(null);
    },
    [mode],
  );

  const handleRadiusChange = useCallback(
    (value: number) => {
      setRadius(value);
      if (mode !== "selection") setSelectedCell(null);
    },
    [mode],
  );

  const handleBusinessTypeChange = useCallback(
    (value: BusinessTypeId | null) => {
      setBusinessType(value);
      setFocusedPlaceId(null);
    },
    [],
  );

  const handleCompetitorSelect = useCallback((placeId: string) => {
    setFocusedPlaceId(placeId);
  }, []);

  const selectedPinId = selectedCell ? cellKey(selectedCell) : null;
  const selectedPinned =
    selectedPinId !== null &&
    pinnedCells.some((pin) => pin.id === selectedPinId);

  const handleSearchSelect = useCallback((result: GeocodeResult) => {
    flyToId.current += 1;
    setFlyToTarget({
      id: flyToId.current,
      latitude: result.latitude,
      longitude: result.longitude,
      bbox: result.bbox,
      label: result.name,
    });
  }, []);

  const error =
    hotzones.error instanceof Error
      ? hotzones.error.message
      : pois.error instanceof Error
        ? pois.error.message
        : null;

  return (
    <div className="relative h-svh w-full overflow-hidden bg-background">
      <MapView
        basemap={basemap}
        hotzones={hotzones.data}
        pois={pois.data}
        competitors={competitorMarkers}
        focusedPlaceId={focusedPlaceId}
        outlineCell={selectedCell}
        selectionMode={mode}
        flyToTarget={flyToTarget}
        pinnedCells={pinnedCells}
        selectedPinId={selectedPinId}
        pinned={selectedPinned}
        pinLimitReached={pinnedCells.length >= MAX_PINNED_CELLS}
        onSelect={handleSelect}
        onClearSelection={handleClearSelection}
        onTogglePin={handleTogglePin}
        onSelectPin={handleSelectPin}
        onCompetitorSelect={handleCompetitorSelect}
        onMoveStart={handleMoveStart}
        onViewportChange={handleViewportChange}
      />
      <MapSearch onSelect={handleSearchSelect} />
      <CellDetailPanel
        cell={selectedCell}
        competitorArea={competitorArea}
        radius={radius}
        businessType={businessType}
        onBusinessTypeChange={handleBusinessTypeChange}
        competitors={competitors.data}
        competitorsFetching={competitors.isFetching}
        competitorsError={
          competitors.error instanceof Error ? competitors.error : null
        }
        focusedPlaceId={focusedPlaceId}
        pinnedCells={pinnedCells}
        selectedPinId={selectedPinId}
        pinned={selectedPinned}
        pinLimitReached={pinnedCells.length >= MAX_PINNED_CELLS}
        onClearCell={handleClearSelection}
        onTogglePin={handleTogglePin}
        onSelectPin={handleSelectPin}
        onRemovePin={handleRemovePin}
      />
      <ControlPanel
        isDark={isDark}
        onToggleTheme={onToggleTheme}
        basemap={basemap}
        onBasemapChange={setBasemapChoice}
        mode={mode}
        onModeChange={handleModeChange}
        cellSize={cellSize}
        radius={radius}
        onCellSizeChange={handleCellSizeChange}
        onRadiusChange={handleRadiusChange}
        enabledCategories={enabledCategories}
        onToggleCategory={toggleCategory}
        isFetching={hotzones.isFetching || pois.isFetching}
        error={error}
        hotzoneCount={hotzones.data?.features.length}
        showPoiHint={viewport.zoom < POI_MIN_ZOOM}
      />
    </div>
  );
}
