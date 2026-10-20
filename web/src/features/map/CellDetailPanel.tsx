import { useEffect, useMemo, useState } from "react";
import {
  Check,
  ChevronDown,
  Copy,
  Loader2,
  Pin,
  PinOff,
  SquareDashed,
  X,
} from "lucide-react";
import {
  BUSINESS_TYPE_OPTIONS,
  isBusinessTypeId,
  type BusinessTypeId,
  type PoiCategory,
  type PlaceFeatureCollection,
} from "@spero/shared";
import { Badge } from "../../components/ui/badge";
import { Button } from "../../components/ui/button";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "../../components/ui/card";
import {
  CATEGORY_COLORS,
  CATEGORY_LABELS,
  COMPETITOR_COLOR,
  MAX_PINNED_CELLS,
} from "./constants";
import { haversineMeters } from "./geo";
import { cn } from "../../lib/utils";
import {
  BUSINESS_TYPE_ICONS,
  CATEGORY_ICONS,
} from "./place-icons";
import { formatDistance, type PlaceCardData } from "./place-format";
import { PlaceCard } from "./PlaceCard";
import type { PinnedCell, SelectedCell } from "./types";
import { useCellPois } from "./useCellPois";

interface CellDetailPanelProps {
  cell: SelectedCell | null;
  competitorArea: SelectedCell | null;
  radius: number;
  businessType: BusinessTypeId | null;
  onBusinessTypeChange: (type: BusinessTypeId | null) => void;
  competitors?: PlaceFeatureCollection;
  competitorsFetching: boolean;
  competitorsError: Error | null;
  focusedPlaceId: string | null;
  pinnedCells: PinnedCell[];
  selectedPinId: string | null;
  pinned: boolean;
  pinLimitReached: boolean;
  onClearCell: () => void;
  onTogglePin: () => void;
  onSelectPin: (pin: PinnedCell) => void;
  onRemovePin: (id: string) => void;
}

interface CellPlace extends PlaceCardData {
  category: PoiCategory;
}

interface CategoryGroup {
  category: PoiCategory;
  places: CellPlace[];
}

interface CompetitorPlace extends PlaceCardData {
  type: BusinessTypeId;
}

const UNNAMED_PLACE = "Unnamed place";

function toCardData(
  properties: PlaceCardData,
  longitude: number,
  latitude: number,
  centerLng: number,
  centerLat: number,
): PlaceCardData {
  return {
    ...properties,
    longitude,
    latitude,
    distanceMeters: haversineMeters(centerLng, centerLat, longitude, latitude),
  };
}

export function CellDetailPanel({
  cell,
  competitorArea,
  radius,
  businessType,
  onBusinessTypeChange,
  competitors,
  competitorsFetching,
  competitorsError,
  focusedPlaceId,
  pinnedCells,
  selectedPinId,
  pinned,
  pinLimitReached,
  onClearCell,
  onTogglePin,
  onSelectPin,
  onRemovePin,
}: CellDetailPanelProps) {
  const { data, isFetching, error } = useCellPois(cell, radius);
  const [copied, setCopied] = useState(false);

  const groups = useMemo<CategoryGroup[]>(() => {
    if (!cell || !data) return [];

    const byCategory = new Map<PoiCategory, CellPlace[]>();

    for (const feature of data.features) {
      const [lng, lat] = feature.geometry.coordinates;
      if (lng === undefined || lat === undefined) continue;

      const properties = feature.properties;
      const place: CellPlace = {
        ...toCardData(
          {
            id: `${properties.category}:${lng}:${lat}`,
            name: properties.name,
            rawCategory: properties.rawCategory,
            address: properties.address,
            phone: properties.phone,
            website: properties.website,
            openingHours: properties.openingHours,
            longitude: lng,
            latitude: lat,
            distanceMeters: 0,
          },
          lng,
          lat,
          cell.centerLng,
          cell.centerLat,
        ),
        category: properties.category,
      };

      if (place.distanceMeters >= radius) continue;

      const places = byCategory.get(properties.category) ?? [];
      places.push(place);
      byCategory.set(properties.category, places);
    }

    return [...byCategory.entries()]
      .map(([category, places]) => ({
        category,
        places: places.sort((a, b) => {
          const byDistance = a.distanceMeters - b.distanceMeters;
          if (byDistance !== 0) return byDistance;
          return (a.name ?? "").localeCompare(b.name ?? "");
        }),
      }))
      .sort((a, b) => {
        const byCount = b.places.length - a.places.length;
        if (byCount !== 0) return byCount;
        return CATEGORY_LABELS[a.category].localeCompare(
          CATEGORY_LABELS[b.category],
        );
      });
  }, [cell, data, radius]);

  const competitorPlaces = useMemo<CompetitorPlace[]>(() => {
    if (!competitorArea || !competitors) return [];

    return competitors.features
      .map((feature): CompetitorPlace | null => {
        const [lng, lat] = feature.geometry.coordinates;
        if (lng === undefined || lat === undefined) return null;

        const properties = feature.properties;
        return {
          ...toCardData(
            {
              id: properties.id,
              name: properties.name,
              rawCategory: properties.rawCategory,
              address: properties.address,
              phone: properties.phone,
              website: properties.website,
              openingHours: properties.openingHours,
              longitude: lng,
              latitude: lat,
              distanceMeters: 0,
            },
            lng,
            lat,
            competitorArea.centerLng,
            competitorArea.centerLat,
          ),
          type: properties.type,
        };
      })
      .filter(
        (place): place is CompetitorPlace =>
          place !== null && place.distanceMeters < radius,
      )
      .sort((a, b) => a.distanceMeters - b.distanceMeters);
  }, [competitorArea, competitors, radius]);

  const totalPlaces = groups.reduce(
    (total, group) => total + group.places.length,
    0,
  );

  const businessTypeOption = businessType
    ? BUSINESS_TYPE_OPTIONS.find((option) => option.id === businessType)
    : null;
  const competitorNoun =
    competitorPlaces.length === 1
      ? businessTypeOption?.label.toLowerCase()
      : businessTypeOption?.plural;
  const nearestCompetitor = competitorPlaces[0]?.distanceMeters ?? null;

  useEffect(() => {
    if (!focusedPlaceId) return;

    document
      .getElementById(`place-card-${focusedPlaceId}`)
      ?.scrollIntoView({ block: "nearest", behavior: "smooth" });
  }, [focusedPlaceId, competitorPlaces]);

  const handleCopy = async () => {
    const text = groups
      .map((group) => {
        const lines = group.places.map((place) => {
          const name = place.name?.trim() || UNNAMED_PLACE;
          return place.address ? `${name} — ${place.address}` : name;
        });
        return [CATEGORY_LABELS[group.category], ...lines].join("\n");
      })
      .join("\n\n");

    try {
      await navigator.clipboard.writeText(text);
      setCopied(true);
      window.setTimeout(() => setCopied(false), 1500);
    } catch {
      // The browser can block clipboard access; leave the button as it is.
    }
  };

  return (
    <Card className="absolute top-5 bottom-5 left-5 z-10 flex w-[250px] flex-col overflow-hidden">
      <CardHeader className="flex-row items-start justify-between gap-3 border-b pb-3">
        <div className="space-y-1">
          <CardTitle>Hot zone</CardTitle>
          <p className="text-xs text-muted-foreground">
            {cell
              ? isFetching
                ? "Loading places…"
                : `${totalPlaces} places within ${radius} m`
              : "No cell selected"}
          </p>
        </div>
        {cell && (
          <div className="flex items-center gap-1">
            <Badge className="border-transparent bg-primary text-primary-foreground">
              {cell.score.toFixed(0)}
            </Badge>
            <Button
              variant="ghost"
              size="icon"
              className={cn(
                pinned && "text-amber-600 dark:text-amber-300",
              )}
              aria-label={pinned ? "Unpin this cell" : "Pin this cell"}
              aria-pressed={pinned}
              disabled={!pinned && pinLimitReached}
              title={
                pinned
                  ? "Unpin this cell"
                  : pinLimitReached
                    ? "Pin limit reached: unpin a cell first"
                    : "Pin this cell to keep it in the saved list"
              }
              onClick={onTogglePin}
            >
              {pinned ? <PinOff /> : <Pin />}
            </Button>
            <Button
              variant="ghost"
              size="icon"
              aria-label="Clear selected cell"
              title="Clear selected cell"
              onClick={onClearCell}
            >
              <X />
            </Button>
          </div>
        )}
      </CardHeader>

      <div className="space-y-1 border-b px-4 py-2">
        <label
          htmlFor="business-type"
          className="text-[11px] font-medium text-muted-foreground"
        >
          Compare with
        </label>
        <div className="relative">
          <select
            id="business-type"
            value={businessType ?? ""}
            className="h-8 w-full appearance-none rounded-md border bg-background px-2 pr-7 text-xs shadow-ace outline-none focus-visible:ring-2 focus-visible:ring-ring"
            onChange={(event) => {
              const value = event.target.value;
              onBusinessTypeChange(
                isBusinessTypeId(value) ? value : null,
              );
            }}
          >
            <option value="">No business type</option>
            {BUSINESS_TYPE_OPTIONS.map((option) => (
              <option key={option.id} value={option.id}>
                {option.label}
              </option>
            ))}
          </select>
          <ChevronDown className="pointer-events-none absolute top-1/2 right-2 size-3.5 -translate-y-1/2 text-muted-foreground" />
        </div>
      </div>

      {pinnedCells.length > 0 && (
        <div className="border-b px-3 py-2">
          <div className="flex items-center justify-between px-1">
            <p className="text-[10px] font-medium tracking-wide text-muted-foreground uppercase">
              Pinned cells
            </p>
            <span className="text-[10px] tabular-nums text-muted-foreground">
              {pinnedCells.length}/{MAX_PINNED_CELLS}
            </span>
          </div>
          <div className="thin-scrollbar mt-1 max-h-32 space-y-1 overflow-y-auto pr-0.5">
            {pinnedCells.map((pin, index) => {
              const active = pin.id === selectedPinId;

              return (
                <div
                  key={pin.id}
                  className={cn(
                    "flex items-center gap-0.5 rounded-md border px-1 py-0.5 transition-colors",
                    active
                      ? "border-amber-500/40 bg-amber-500/10"
                      : "border-transparent hover:bg-accent",
                  )}
                >
                  <button
                    type="button"
                    onClick={() => onSelectPin(pin)}
                    className="flex min-w-0 flex-1 items-center gap-1.5 rounded-sm py-0.5 pl-0.5 text-left focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none"
                    title="Open this pinned cell"
                  >
                    <span className="flex size-5 shrink-0 items-center justify-center rounded-full bg-amber-500 text-[9px] font-semibold text-white">
                      {index + 1}
                    </span>
                    <span className="min-w-0 flex-1">
                      <span className="block truncate text-[11px] font-medium">
                        Cell {index + 1}
                      </span>
                      <span className="block truncate text-[9px] tabular-nums text-muted-foreground">
                        {pin.cell.centerLat.toFixed(4)},{" "}
                        {pin.cell.centerLng.toFixed(4)}
                      </span>
                    </span>
                    <Badge className="border-transparent bg-secondary px-1.5 text-[9px] text-secondary-foreground">
                      {pin.cell.score.toFixed(0)}
                    </Badge>
                  </button>
                  <button
                    type="button"
                    onClick={() => onRemovePin(pin.id)}
                    aria-label={`Remove pinned cell ${index + 1}`}
                    title="Remove pin"
                    className="flex size-5 shrink-0 items-center justify-center rounded-sm text-muted-foreground transition-colors hover:bg-destructive/10 hover:text-destructive focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none"
                  >
                    <X className="size-3" />
                  </button>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {!cell ? (
        <div className="flex flex-1 flex-col items-center justify-center gap-3 px-6 text-center">
          <div className="flex size-11 items-center justify-center rounded-full border bg-muted text-muted-foreground">
            <SquareDashed className="size-5" />
          </div>
          <div className="space-y-1">
            <p className="text-sm font-medium">Select a cell</p>
            <p className="text-xs leading-relaxed text-muted-foreground">
              Click any hot-zone cell on the map, or reopen one of your pinned
              cells above.
            </p>
          </div>
        </div>
      ) : (
        <CardContent className="thin-scrollbar min-h-0 flex-1 space-y-4 overflow-y-auto pt-4 pr-1.5 pl-4 [scrollbar-gutter:stable]">
          {businessType && businessTypeOption && (
            <section className="space-y-2 border-b pb-4">
              <div className="flex flex-wrap items-center justify-between gap-1">
                <p className="text-xs font-semibold">
                  {competitorPlaces.length} {competitorNoun} within {radius} m
                </p>
                {nearestCompetitor !== null && (
                  <Badge className="border-fuchsia-500/30 bg-fuchsia-500/15 text-fuchsia-700 dark:text-fuchsia-300">
                    Nearest {formatDistance(nearestCompetitor)}
                  </Badge>
                )}
              </div>

              {competitorsError ? (
                <p className="text-xs text-destructive">
                  {competitorsError.message}
                </p>
              ) : competitorsFetching ? (
                <p className="flex items-center gap-2 text-xs text-muted-foreground">
                  <Loader2 className="size-3.5 animate-spin" />
                  Finding {businessTypeOption.plural}…
                </p>
              ) : competitorPlaces.length === 0 ? (
                <p className="text-xs text-muted-foreground">
                  No competitors found within {radius} m.
                </p>
              ) : (
                <div className="space-y-2">
                  {competitorPlaces.map((place) => (
                    <PlaceCard
                      key={place.id}
                      place={place}
                      icon={BUSINESS_TYPE_ICONS[place.type]}
                      accentColor={COMPETITOR_COLOR}
                      highlighted={place.id === focusedPlaceId}
                    />
                  ))}
                </div>
              )}
            </section>
          )}

          <section className="space-y-2">
            <div className="flex items-center justify-between gap-2">
              <p className="text-xs font-semibold">All places</p>
              <Button
                size="sm"
                variant="outline"
                disabled={totalPlaces === 0}
                onClick={handleCopy}
              >
                {copied ? (
                  <Check className="size-3.5" />
                ) : (
                  <Copy className="size-3.5" />
                )}
                {copied ? "Copied" : "Copy names"}
              </Button>
            </div>

            {error ? (
              <p className="text-xs text-destructive">
                {error instanceof Error ? error.message : "Could not load places."}
              </p>
            ) : groups.length === 0 ? (
              <p className="flex items-center gap-2 text-xs text-muted-foreground">
                {isFetching && <Loader2 className="size-3.5 animate-spin" />}
                {isFetching ? "Loading places…" : "No places in range."}
              </p>
            ) : (
              <div className="space-y-4">
                {groups.map((group) => (
                  <section key={group.category} className="space-y-1.5">
                    <div className="flex items-center justify-between gap-2 text-xs font-medium">
                      <span className="flex items-center gap-1.5">
                        <span
                          className="size-2 rounded-full"
                          style={{
                            backgroundColor: CATEGORY_COLORS[group.category],
                          }}
                        />
                        {CATEGORY_LABELS[group.category]}
                      </span>
                      <span className="text-muted-foreground">
                        {group.places.length}
                      </span>
                    </div>
                    <div className="space-y-2">
                      {group.places.map((place) => (
                        <PlaceCard
                          key={place.id}
                          place={place}
                          icon={CATEGORY_ICONS[group.category]}
                          accentColor={CATEGORY_COLORS[group.category]}
                        />
                      ))}
                    </div>
                  </section>
                ))}
              </div>
            )}
          </section>
        </CardContent>
      )}
    </Card>
  );
}
