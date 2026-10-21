import { Loader2, Moon, Scan, Sun } from "lucide-react";
import { POI_CATEGORIES, type PoiCategory } from "@spero/shared";
import { Button } from "../../components/ui/button";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "../../components/ui/card";
import { Switch } from "../../components/ui/switch";
import { cn } from "../../lib/utils";
import {
  CATEGORY_COLORS,
  CATEGORY_LABELS,
  CELL_SIZE_STEP_M,
  DEFAULT_CELL_SIZE_M,
  DEFAULT_RADIUS_M,
  HOTZONE_COLOR_STOPS,
  MAX_CELL_SIZE_M,
  MAX_RADIUS_M,
  MIN_CELL_SIZE_M,
  MIN_RADIUS_M,
  POI_MIN_ZOOM,
  RADIUS_STEP_M,
} from "./constants";
import { RangeControl } from "./RangeControl";
import type { SelectionMode } from "./types";

const legendGradient = `linear-gradient(90deg, ${HOTZONE_COLOR_STOPS.map(
  (stop) => `${stop.color} ${stop.score}%`,
).join(", ")})`;

interface ControlPanelProps {
  isDark: boolean;
  onToggleTheme: () => void;
  mode: SelectionMode;
  onModeChange: (value: SelectionMode) => void;
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
  mode,
  onModeChange,
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
    <Card className="flex max-h-[calc(100svh-9.5rem)] w-full flex-col overflow-hidden lg:max-h-[calc(100svh-15rem)] lg:w-80 lg:max-w-[calc(100vw-2rem)]">
      <CardHeader className="flex-row items-center justify-between gap-3 px-4 pt-3 pb-2">
        <div className="flex min-w-0 items-center gap-2">
          <CardTitle>Spero</CardTitle>
          <span className="shrink-0 rounded-full border border-border/60 bg-muted px-1.5 py-0.5 text-[10px] font-medium text-muted-foreground">
            {hotzoneCount === undefined
              ? "Loading…"
              : `${hotzoneCount} hot zones`}
          </span>
          {isFetching && (
            <Loader2 className="size-3.5 shrink-0 animate-spin text-muted-foreground" />
          )}
        </div>
        <Button
          variant="ghost"
          size="icon"
          onClick={onToggleTheme}
          aria-label="Toggle theme"
          title="Toggle theme"
        >
          {isDark ? <Sun /> : <Moon />}
        </Button>
      </CardHeader>

      <CardContent className="thin-scrollbar min-h-0 flex-1 space-y-4 overflow-y-auto px-4 pt-1 pb-4">
        {error && (
          <p className="rounded-md border border-destructive/40 bg-destructive/10 p-2 text-xs text-destructive">
            {error}
          </p>
        )}

        <div className="flex items-center justify-between gap-2">
          <p className="text-sm font-medium">Mode</p>
          <div className="flex items-center gap-2">
            <span className="text-xs text-muted-foreground">
              {mode === "selection" ? "Selection" : "Normal"}
            </span>
            <Button
              size="icon"
              variant="ghost"
              className={cn(
                "border",
                mode === "selection"
                  ? "border-zinc-300 bg-zinc-100 text-zinc-700 hover:bg-zinc-200 hover:text-zinc-900 dark:border-[#393939] dark:bg-[#303030] dark:text-[#d4d4d4] dark:hover:bg-[#393939] dark:hover:text-white"
                  : "border-transparent text-zinc-500 hover:bg-zinc-100 hover:text-zinc-900 dark:text-[#979797] dark:hover:bg-[#303030] dark:hover:text-white",
              )}
              aria-pressed={mode === "selection"}
              aria-label={
                mode === "selection"
                  ? "Turn off selection mode"
                  : "Turn on selection mode"
              }
              title={
                mode === "selection"
                  ? "Selection mode on: click a cell to keep it outlined"
                  : "Selection mode off: normal map behaviour"
              }
              onClick={() =>
                onModeChange(mode === "selection" ? "normal" : "selection")
              }
            >
              <Scan />
            </Button>
          </div>
        </div>

        <div className="space-y-3">
          <RangeControl
            label="Cell size"
            value={cellSize}
            min={MIN_CELL_SIZE_M}
            max={MAX_CELL_SIZE_M}
            step={CELL_SIZE_STEP_M}
            defaultValue={DEFAULT_CELL_SIZE_M}
            unit="m"
            onChange={onCellSizeChange}
          />
          <RangeControl
            label="Reach radius"
            value={radius}
            min={MIN_RADIUS_M}
            max={MAX_RADIUS_M}
            step={RADIUS_STEP_M}
            defaultValue={DEFAULT_RADIUS_M}
            unit="m"
            onChange={onRadiusChange}
          />
        </div>

        <div className="space-y-3">
          <p className="text-sm font-medium">Places</p>
          <div className="grid grid-cols-2 gap-x-4 gap-y-3">
            {POI_CATEGORIES.map((category) => (
              <label
                key={category}
                className="flex cursor-pointer items-center gap-2 text-[12px] font-medium text-zinc-700 dark:text-[#979797]"
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
