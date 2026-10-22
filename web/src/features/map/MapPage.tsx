import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  CUSTOM_BUSINESS_TYPE,
  POI_CATEGORIES,
  type AgentContext,
  type AgentResponse,
  type BusinessSelection,
  type BusinessTypeId,
  type GeocodeResult,
  type PoiCategory,
} from "@spero/shared";
import { useDebouncedValue } from "../../lib/use-debounced-value";
import { useMediaQuery } from "../../lib/use-media-query";
import { AgentChat } from "./AgentChat";
import { BasemapControl } from "./BasemapControl";
import { ControlPanel } from "./ControlPanel";
import { MobileBottomPanel, type MobileMapTab } from "./MobileBottomPanel";
import { MobileControlMenu } from "./MobileControlMenu";
import {
  DEFAULT_CELL_SIZE_M,
  DEFAULT_RADIUS_M,
  DEFAULT_ZOOM,
  MAX_PINNED_CELLS,
  MAX_VIEW_COMPETITOR_MARKERS,
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
import { usePlaces, usePlacesInBbox } from "./usePlaces";
import { usePois } from "./usePois";

interface MapPageProps {
  isDark: boolean;
  onToggleTheme: () => void;
}

export function MapPage({ isDark, onToggleTheme }: MapPageProps) {
  const isDesktop = useMediaQuery("(min-width: 1024px)");
  const [mobilePanel, setMobilePanel] = useState<MobileMapTab | null>(null);
  const [mobileControlsOpen, setMobileControlsOpen] = useState(false);
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
  const [customBusinessLabel, setCustomBusinessLabel] = useState<string | null>(
    null,
  );
  const [focusedPlaceId, setFocusedPlaceId] = useState<string | null>(null);
  const [flyToTarget, setFlyToTarget] = useState<FlyToTarget | null>(null);
  const flyToId = useRef(0);

  const debouncedViewport = useDebouncedValue(viewport, MOVE_DEBOUNCE_MS);
  const viewCenter = useMemo(
    () =>
      debouncedViewport.bbox
        ? {
            lng:
              (debouncedViewport.bbox.minLng + debouncedViewport.bbox.maxLng) /
              2,
            lat:
              (debouncedViewport.bbox.minLat + debouncedViewport.bbox.maxLat) /
              2,
          }
        : null,
    [debouncedViewport.bbox],
  );

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

  // A selected cell compares competitors within its reach radius. With no cell
  // selected, the same business type becomes a standalone layer for the whole
  // current viewport, so the map is useful before choosing a hot zone.
  const businessSelection = useMemo<BusinessSelection | null>(() => {
    if (customBusinessLabel) {
      return { type: CUSTOM_BUSINESS_TYPE, label: customBusinessLabel };
    }
    return businessType ? { type: businessType } : null;
  }, [businessType, customBusinessLabel]);

  const competitorArea = selectedCell;
  const areaCompetitors = usePlaces(selectedCell, businessSelection, radius);
  const viewCompetitors = usePlacesInBbox(
    selectedCell ? null : debouncedViewport.bbox,
    businessSelection,
  );
  const competitors = selectedCell ? areaCompetitors : viewCompetitors;

  // The API returns the square bbox that contains the reach circle. Keep the
  // marker layer in sync with the distance-filtered list in the panel. In view
  // mode, hide the farthest markers when a dense area would render too many.
  const competitorMarkers = useMemo(() => {
    if (!competitors.data) return undefined;

    if (selectedCell) {
      return {
        ...competitors.data,
        features: competitors.data.features.filter((feature) => {
          const [lng, lat] = feature.geometry.coordinates;
          if (lng === undefined || lat === undefined) return false;

          return (
            haversineMeters(
              selectedCell.centerLng,
              selectedCell.centerLat,
              lng,
              lat,
            ) < radius
          );
        }),
      };
    }

    if (!viewCenter) return undefined;

    const features = [...competitors.data.features]
      .sort((a, b) => {
        const [aLng, aLat] = a.geometry.coordinates;
        const [bLng, bLat] = b.geometry.coordinates;
        if (
          aLng === undefined ||
          aLat === undefined ||
          bLng === undefined ||
          bLat === undefined
        ) {
          return 0;
        }

        return (
          haversineMeters(viewCenter.lng, viewCenter.lat, aLng, aLat) -
          haversineMeters(viewCenter.lng, viewCenter.lat, bLng, bLat)
        );
      })
      .slice(0, MAX_VIEW_COMPETITOR_MARKERS);

    return { ...competitors.data, features };
  }, [competitors.data, selectedCell, radius, viewCenter]);

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

  const handleSelect = useCallback(
    (cell: SelectedCell) => {
      setSelectedCell(cell);
      setFocusedPlaceId(null);
      if (!isDesktop) {
        setMobileControlsOpen(false);
        setMobilePanel("results");
      }
    },
    [isDesktop],
  );

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

  const handleSelectPin = useCallback(
    (pin: PinnedCell) => {
      setMode("selection");
      setSelectedCell(pin.cell);
      setFocusedPlaceId(null);

      if (!isDesktop) setMobilePanel("results");

      flyToId.current += 1;
      setFlyToTarget({
        id: flyToId.current,
        latitude: pin.cell.centerLat,
        longitude: pin.cell.centerLng,
        bbox: pin.cell.bounds,
        label: "Pinned cell",
      });
    },
    [isDesktop],
  );

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
      setCustomBusinessLabel(null);
      setFocusedPlaceId(null);
    },
    [],
  );

  const handleCustomBusinessChange = useCallback((label: string | null) => {
    setBusinessType(null);
    setCustomBusinessLabel(label);
    setFocusedPlaceId(null);
  }, []);

  const handleCompetitorSelect = useCallback(
    (placeId: string) => {
      setFocusedPlaceId(placeId);
      if (!isDesktop) setMobilePanel("results");
    },
    [isDesktop],
  );

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

  const handleAgentApply = useCallback(
    (response: AgentResponse) => {
      const { actions } = response;

      if (response.location.result) {
        handleSearchSelect(response.location.result);
      }
      if (actions.clearSelection || response.location.result) {
        handleClearSelection();
      }
      if (actions.mode === "normal") {
        handleModeChange("normal");
      } else if (actions.mode === "selection") {
        setMode("selection");
      }
      if (actions.customBusinessLabel) {
        setBusinessType(null);
        setCustomBusinessLabel(actions.customBusinessLabel);
      } else if (actions.businessType === CUSTOM_BUSINESS_TYPE) {
        setBusinessType(null);
        setCustomBusinessLabel(null);
      } else if (actions.businessType !== null) {
        setBusinessType(actions.businessType);
        setCustomBusinessLabel(null);
      }
      if (actions.categories !== null) {
        setEnabledCategories(actions.categories);
      }
      if (actions.cellSizeMeters !== null) {
        setCellSize(actions.cellSizeMeters);
      }
      if (actions.radiusMeters !== null) {
        setRadius(actions.radiusMeters);
      }
      if (actions.basemap !== null) {
        setBasemapChoice(actions.basemap);
      }
      setFocusedPlaceId(null);
    },
    [handleClearSelection, handleModeChange, handleSearchSelect],
  );

  const handleAgentApplied = useCallback(() => {
    setMobileControlsOpen(false);
    setMobilePanel("results");
  }, []);

  const agentContext = useMemo<AgentContext>(
    () => ({
      bbox: viewport.bbox,
      zoom: viewport.zoom,
      selectedCell: selectedCell
        ? {
            centerLng: selectedCell.centerLng,
            centerLat: selectedCell.centerLat,
            score: selectedCell.score,
          }
        : null,
      businessType,
      customBusinessLabel,
      cellSize,
      radius,
      enabledCategories,
      basemap,
      mode,
    }),
    [
      viewport,
      selectedCell,
      businessType,
      customBusinessLabel,
      cellSize,
      radius,
      enabledCategories,
      basemap,
      mode,
    ],
  );

  const error =
    hotzones.error instanceof Error
      ? hotzones.error.message
      : pois.error instanceof Error
        ? pois.error.message
        : competitors.error instanceof Error
          ? competitors.error.message
          : null;

  const cellPanel = (embedded: boolean) => (
    <CellDetailPanel
      cell={selectedCell}
      competitorArea={competitorArea}
      viewCenter={viewCenter}
      radius={radius}
      businessType={businessType}
      customBusinessLabel={customBusinessLabel}
      onBusinessTypeChange={handleBusinessTypeChange}
      onCustomBusinessChange={handleCustomBusinessChange}
      enabledCategories={enabledCategories}
      competitors={competitors.data}
      competitorsFetching={competitors.isFetching}
      competitorsError={
        competitors.error instanceof Error ? competitors.error : null
      }
      focusedPlaceId={focusedPlaceId}
      onCompetitorSelect={handleCompetitorSelect}
      pinnedCells={pinnedCells}
      selectedPinId={selectedPinId}
      pinned={selectedPinned}
      pinLimitReached={pinnedCells.length >= MAX_PINNED_CELLS}
      onClearCell={handleClearSelection}
      onTogglePin={handleTogglePin}
      onSelectPin={handleSelectPin}
      onRemovePin={handleRemovePin}
      embedded={embedded}
    />
  );

  const controlPanel = (
    <ControlPanel
      isDark={isDark}
      onToggleTheme={onToggleTheme}
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
  );

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

      {isDesktop ? (
        <>
          <AgentChat context={agentContext} onApply={handleAgentApply} />
          {cellPanel(false)}
          <BasemapControl
            basemap={basemap}
            onBasemapChange={setBasemapChoice}
          />
          <div className="absolute top-4 right-4 z-10">{controlPanel}</div>
        </>
      ) : (
        <>
          <MobileControlMenu
            open={mobileControlsOpen}
            onOpenChange={(open) => {
              setMobileControlsOpen(open);
              if (open) setMobilePanel(null);
            }}
          >
            {controlPanel}
          </MobileControlMenu>

          <BasemapControl
            basemap={basemap}
            onBasemapChange={setBasemapChoice}
            variant="mobile"
          />

          <MobileBottomPanel
            activeTab={mobilePanel}
            onTabChange={(tab) => {
              setMobilePanel(tab);
              if (tab) setMobileControlsOpen(false);
            }}
            results={cellPanel(true)}
            ai={
              <AgentChat
                context={agentContext}
                onApply={handleAgentApply}
                onApplied={handleAgentApplied}
                variant="embedded"
              />
            }
          />
        </>
      )}
    </div>
  );
}
