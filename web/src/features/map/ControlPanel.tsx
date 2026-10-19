import { Loader2, Moon, Sun } from "lucide-react";
import { POI_CATEGORIES, type PoiCategory } from "@spero/shared";
import { Badge } from "../../components/ui/badge";
import { Button } from "../../components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "../../components/ui/card";
import { Slider } from "../../components/ui/slider";
import { Switch } from "../../components/ui/switch";
import {
  BASEMAPS,
  CATEGORY_COLORS,
  CATEGORY_LABELS,
  CELL_SIZE_STEP_M,
  HOTZONE_COLOR_STOPS,
  MAX_CELL_SIZE_M,
  MAX_RADIUS_M,
  MIN_CELL_SIZE_M,
  MIN_RADIUS_M,
  POI_MIN_ZOOM,
  RADIUS_STEP_M,
  type BasemapId,
} from "./constants";
import type { SelectionMode } from "./types";

const legendGradient = `linear-gradient(90deg, ${HOTZONE_COLOR_STOPS.map(
  (stop) => `${stop.color} ${stop.score}%`,
).join(", ")})`;

interface ControlPanelProps {
  isDark: boolean;
  onToggleTheme: () => void;
  basemap: BasemapId;
  onBasemapChange: (value: BasemapId) => void;
  mode: SelectionMode;
  onModeChange: (value: SelectionMode) => void;
  locked: boolean;
  cellSize: number;
  radius: number;
  onCellSizeChange: (value: number) => void;
  onRadiusChange: (value: number) => void;
  enabledCategories: PoiCategory[];
  onToggleCategory: (category: PoiCategory) => void;
  isFetching: boolean;
  error: string | null;
  hotzoneCount?: number;
  showPoiHint: boolean;
}

export function ControlPanel({
  isDark,
  onToggleTheme,
  basemap,
  onBasemapChange,
  mode,
  onModeChange,
  locked,
  cellSize,
  radius,
  onCellSizeChange,
  onRadiusChange,
  enabledCategories,
  onToggleCategory,
  isFetching,
  error,
  hotzoneCount,
  showPoiHint,
}: ControlPanelProps) {
  return (
    <Card className="absolute top-4 right-4 z-10 w-80 max-w-[calc(100vw-2rem)]">
      <CardHeader>
        <div className="flex items-start justify-between gap-3">
          <div className="space-y-1">
            <CardTitle className="flex items-center gap-2">
              Spero
              <Badge className="border-transparent bg-secondary text-secondary-foreground">
                Phase 1
              </Badge>
            </CardTitle>
            <CardDescription>Crowd hot zones from OpenStreetMap</CardDescription>
          </div>
          <Button
            variant="ghost"
            size="icon"
            onClick={onToggleTheme}
            aria-label="Toggle theme"
          >
            {isDark ? <Sun /> : <Moon />}
          </Button>
        </div>
      </CardHeader>

      <CardContent className="max-h-[calc(100svh-10rem)] space-y-5 overflow-y-auto">
        <div className="flex items-center gap-2 text-xs text-muted-foreground">
          {isFetching && <Loader2 className="size-3.5 animate-spin" />}
          <span>
            {hotzoneCount === undefined
              ? "Waiting for the map…"
              : `${hotzoneCount} hot zones`}
          </span>
        </div>

        {error && (
          <p className="rounded-md border border-destructive/40 bg-destructive/10 p-2 text-xs text-destructive">
            {error}
          </p>
        )}

        <div className="space-y-2">
          <p className="text-sm font-medium">Mode</p>
          <div className="grid grid-cols-2 gap-2">
            <Button
              size="sm"
              variant={mode === "normal" ? "default" : "outline"}
              aria-pressed={mode === "normal"}
              onClick={() => onModeChange("normal")}
            >
              Normal
            </Button>
            <Button
              size="sm"
              variant={mode === "selection" ? "default" : "outline"}
              aria-pressed={mode === "selection"}
              onClick={() => onModeChange("selection")}
            >
              Selection
            </Button>
          </div>
          {mode === "selection" && (
            <p className="text-xs text-muted-foreground">
              {locked
                ? "Locked: only the outlined cell is scored. Lower the cell size to see finer cells inside it."
                : "Click a cell to keep its dotted outline. The lock scores only that cell."}
            </p>
          )}
        </div>

        <div className="space-y-2">
          <p className="text-sm font-medium">Basemap</p>
          <div className="grid grid-cols-3 gap-2">
            {BASEMAPS.map((option) => (
              <Button
                key={option.id}
                size="sm"
                variant={basemap === option.id ? "default" : "outline"}
                aria-pressed={basemap === option.id}
                onClick={() => onBasemapChange(option.id)}
              >
                {option.label}
              </Button>
            ))}
          </div>
        </div>

        <div className="space-y-3">
          <div className="space-y-2">
            <div className="flex items-center justify-between text-sm">
              <span>Cell size</span>
              <span className="text-muted-foreground">{cellSize} m</span>
            </div>
            <Slider
              value={[cellSize]}
              min={MIN_CELL_SIZE_M}
              max={MAX_CELL_SIZE_M}
              step={CELL_SIZE_STEP_M}
              onValueChange={(value) => onCellSizeChange(value[0] ?? cellSize)}
            />
          </div>

          <div className="space-y-2">
            <div className="flex items-center justify-between text-sm">
              <span>Reach radius</span>
              <span className="text-muted-foreground">{radius} m</span>
            </div>
            <Slider
              value={[radius]}
              min={MIN_RADIUS_M}
              max={MAX_RADIUS_M}
              step={RADIUS_STEP_M}
              onValueChange={(value) => onRadiusChange(value[0] ?? radius)}
            />
          </div>
        </div>

        <div className="space-y-3">
          <p className="text-sm font-medium">Places</p>
          <div className="grid grid-cols-2 gap-x-4 gap-y-3">
            {POI_CATEGORIES.map((category) => (
              <label
                key={category}
                className="flex cursor-pointer items-center gap-2 text-sm"
              >
                <Switch
                  checked={enabledCategories.includes(category)}
                  onCheckedChange={() => onToggleCategory(category)}
                />
                <span className="flex items-center gap-1.5">
                  <span
                    className="size-2 rounded-full"
                    style={{ backgroundColor: CATEGORY_COLORS[category] }}
                  />
                  {CATEGORY_LABELS[category]}
                </span>
              </label>
            ))}
          </div>
          {showPoiHint && enabledCategories.length > 0 && (
            <p className="text-xs text-muted-foreground">
              Zoom to level {POI_MIN_ZOOM} to see places.
            </p>
          )}
        </div>

        <div className="space-y-2">
          <div className="flex items-center justify-between text-sm font-medium">
            <span>Score</span>
            <span className="text-xs font-normal text-muted-foreground">
              low → high
            </span>
          </div>
          <div
            className="h-2 w-full rounded-full"
            style={{ background: legendGradient }}
          />
          <div className="flex items-center justify-between text-[10px] text-muted-foreground">
            <span>0</span>
            <span>50</span>
            <span>100</span>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
