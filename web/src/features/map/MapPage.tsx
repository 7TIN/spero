import { useCallback, useMemo, useState } from "react";
import {
  POI_CATEGORIES,
  type BusinessTypeId,
  type PoiCategory,
} from "@spero/shared";
import { useDebouncedValue } from "../../lib/use-debounced-value";
import { ControlPanel } from "./ControlPanel";
import {
  DEFAULT_CELL_SIZE_M,
  DEFAULT_RADIUS_M,
  DEFAULT_ZOOM,
  MOVE_DEBOUNCE_MS,
  POI_MIN_ZOOM,
  type BasemapId,
} from "./constants";
import { CellDetailPanel } from "./CellDetailPanel";
import { haversineMeters } from "./geo";
import { MapView } from "./MapView";
import type { MapViewport, SelectedCell, SelectionMode } from "./types";
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
  const [mode, setMode] = useState<SelectionMode>("normal");
  const [selectedCell, setSelectedCell] = useState<SelectedCell | null>(null);
  const [panelOpen, setPanelOpen] = useState(false);
  const [lockedCell, setLockedCell] = useState<SelectedCell | null>(null);
  const [businessType, setBusinessType] = useState<BusinessTypeId | null>(null);
  const [focusedPlaceId, setFocusedPlaceId] = useState<string | null>(null);
  const locked = lockedCell !== null;

  const debouncedViewport = useDebouncedValue(viewport, MOVE_DEBOUNCE_MS);

  // Locking pins the scored grid to the outlined cell, so zooming and panning
  // no longer change the cells or bring in neighbours. Selecting a finer cell
  // inside the lock only updates the panel, not the locked area.
  const hotzones = useHotzones(
    lockedCell?.bounds ?? debouncedViewport.bbox,
    cellSize,
    radius,
  );

  const poisEnabled =
    debouncedViewport.zoom >= POI_MIN_ZOOM && enabledCategories.length > 0;
  const pois = usePois(
    debouncedViewport.bbox,
    enabledCategories,
    poisEnabled,
  );

  // The competitor list belongs to the locked area when one is set, otherwise
  // to the selected cell. Keeping the query here (not in the panel) means the
  // markers survive a pan that closes the panel.
  const competitorArea = lockedCell ?? selectedCell;
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
    setPanelOpen(true);
  }, []);

  // Moving the map makes the open panel's numbers stale. In selection mode the
  // outline stays so the user keeps their bearings; normal mode behaves as before.
  const handleMoveStart = useCallback(() => {
    setPanelOpen(false);
    setFocusedPlaceId(null);
    if (mode !== "selection") {
      setSelectedCell(null);
      setLockedCell(null);
    }
  }, [mode]);

  const handlePanelClose = useCallback(() => {
    setPanelOpen(false);
    setFocusedPlaceId(null);
    if (mode !== "selection") {
      setSelectedCell(null);
      setLockedCell(null);
    }
  }, [mode]);

  const handleClearSelection = useCallback(() => {
    setSelectedCell(null);
    setPanelOpen(false);
    setLockedCell(null);
    setFocusedPlaceId(null);
  }, []);

  const handleToggleLock = useCallback(() => {
    setLockedCell((current) => (current ? null : selectedCell));
  }, [selectedCell]);

  const handleModeChange = useCallback((next: SelectionMode) => {
    setMode(next);
    if (next === "normal") {
      setSelectedCell(null);
      setPanelOpen(false);
      setLockedCell(null);
      setFocusedPlaceId(null);
    }
  }, []);

  const handleCellSizeChange = useCallback(
    (value: number) => {
      setCellSize(value);
      setPanelOpen(false);
      if (mode !== "selection") setSelectedCell(null);
    },
    [mode],
  );

  const handleRadiusChange = useCallback(
    (value: number) => {
      setRadius(value);
      setPanelOpen(false);
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
    setPanelOpen(true);
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
        outlineCell={lockedCell ?? selectedCell}
        selectionMode={mode}
        locked={locked}
        onSelect={handleSelect}
        onClearSelection={handleClearSelection}
        onToggleLock={handleToggleLock}
        onCompetitorSelect={handleCompetitorSelect}
        onMoveStart={handleMoveStart}
        onViewportChange={handleViewportChange}
      />
      <CellDetailPanel
        cell={panelOpen ? selectedCell : null}
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
        onClose={handlePanelClose}
      />
      <ControlPanel
        isDark={isDark}
        onToggleTheme={onToggleTheme}
        basemap={basemap}
        onBasemapChange={setBasemapChoice}
        mode={mode}
        onModeChange={handleModeChange}
        locked={locked}
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
