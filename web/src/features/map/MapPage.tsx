import { useCallback, useState } from "react";
import { POI_CATEGORIES, type PoiCategory } from "@spero/shared";
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
import { MapView } from "./MapView";
import type { MapViewport } from "./types";
import { useHotzones } from "./useHotzones";
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

  const debouncedViewport = useDebouncedValue(viewport, MOVE_DEBOUNCE_MS);

  const hotzones = useHotzones(debouncedViewport.bbox, cellSize, radius);

  const poisEnabled =
    debouncedViewport.zoom >= POI_MIN_ZOOM && enabledCategories.length > 0;
  const pois = usePois(
    debouncedViewport.bbox,
    enabledCategories,
    poisEnabled,
  );

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
        onViewportChange={handleViewportChange}
      />
      <ControlPanel
        isDark={isDark}
        onToggleTheme={onToggleTheme}
        basemap={basemap}
        onBasemapChange={setBasemapChoice}
        cellSize={cellSize}
        radius={radius}
        onCellSizeChange={setCellSize}
        onRadiusChange={setRadius}
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
