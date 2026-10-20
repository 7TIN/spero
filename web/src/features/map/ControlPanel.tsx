import { Loader2, Moon, Scan, Sun } from "lucide-react";
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
import { Switch } from "../../components/ui/switch";
import { cn } from "../../lib/utils";
import {
  BASEMAPS,
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
  type BasemapId,
} from "./constants";
import { RangeControl } from "./RangeControl";
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
                Phase 2
              </Badge>
            </CardTitle>
            <CardDescription>
              Crowd hot zones and nearby competitors from OpenStreetMap
            </CardDescription>
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

      <CardContent className="thin-scrollbar max-h-[calc(100svh-10rem)] space-y-5 overflow-y-auto">
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
                  "border transition-colors",
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
          {mode === "selection" && (
            <p className="text-xs text-muted-foreground">
              Click a cell to keep its dotted outline. Use the pin button to save
              several areas, then reopen them from the left panel.
            </p>
          )}
        </div>

        <div className="space-y-2">
          <p className="text-sm font-medium">Basemap</p>
          <div className="grid grid-cols-3 gap-2">
            {BASEMAPS.map((option) => {
              const active = basemap === option.id;

              return (
                <button
                  key={option.id}
                  type="button"
                  aria-pressed={active}
                  aria-label={`${option.label} basemap`}
                  title={`${option.label} basemap`}
                  onClick={() => onBasemapChange(option.id)}
                  className={cn(
                    "group relative aspect-square overflow-hidden rounded-lg border border-border/60 bg-muted p-0 text-left shadow-lg transition-[box-shadow,transform] hover:-translate-y-0.5 hover:shadow-xl focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background focus-visible:outline-none",
                    active &&
                      "ring-2 ring-primary ring-offset-2 ring-offset-background",
                  )}
                >
                  <span
                    aria-hidden="true"
                    className={cn(
                      "absolute inset-0",
                      option.id === "dark"
                        ? "bg-slate-900"
                        : option.id === "osm"
                          ? "bg-amber-100"
                          : "bg-slate-100",
                    )}
                  />
                  <img
                    src={option.previewUrl}
                    alt=""
                    loading="lazy"
                    decoding="async"
                    draggable={false}
                    className="relative size-full object-cover"
                    onError={(event) => {
                      event.currentTarget.style.visibility = "hidden";
                    }}
                  />
                  <span className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/80 via-black/40 to-transparent px-1.5 pt-4 pb-1 text-[10px] leading-none font-medium text-white">
                    {option.label}
                  </span>
                </button>
              );
            })}
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

        <p className="border-t pt-3 text-[10px] leading-relaxed text-muted-foreground">
          Places powered by{" "}
          <a
            className="underline underline-offset-2 hover:text-foreground"
            href="https://www.geoapify.com/"
            target="_blank"
            rel="noreferrer"
          >
            Geoapify
          </a>{" "}
          · ©{" "}
          <a
            className="underline underline-offset-2 hover:text-foreground"
            href="https://www.openstreetmap.org/copyright"
            target="_blank"
            rel="noreferrer"
          >
            OpenStreetMap
          </a>{" "}
          contributors
        </p>
      </CardContent>
    </Card>
  );
}
