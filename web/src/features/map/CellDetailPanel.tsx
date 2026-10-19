import { useMemo, useState } from "react";
import { Check, Copy, Loader2, X } from "lucide-react";
import type { PoiCategory } from "@spero/shared";
import { Badge } from "../../components/ui/badge";
import { Button } from "../../components/ui/button";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "../../components/ui/card";
import { CATEGORY_COLORS, CATEGORY_LABELS } from "./constants";
import { haversineMeters } from "./geo";
import type { SelectedCell } from "./types";
import { useCellPois } from "./useCellPois";

interface CellDetailPanelProps {
  cell: SelectedCell | null;
  radius: number;
  onClose: () => void;
}

interface CategoryGroup {
  category: PoiCategory;
  names: string[];
}

const UNNAMED_PLACE = "Unnamed place";

export function CellDetailPanel({
  cell,
  radius,
  onClose,
}: CellDetailPanelProps) {
  const { data, isFetching, error } = useCellPois(cell, radius);
  const [copied, setCopied] = useState(false);

  const groups = useMemo<CategoryGroup[]>(() => {
    if (!cell || !data) return [];

    const byCategory = new Map<PoiCategory, string[]>();

    for (const feature of data.features) {
      const [lng, lat] = feature.geometry.coordinates;
      if (haversineMeters(cell.centerLng, cell.centerLat, lng, lat) >= radius) {
        continue;
      }

      const name = feature.properties?.name?.trim() || UNNAMED_PLACE;
      const names = byCategory.get(feature.properties.category) ?? [];
      names.push(name);
      byCategory.set(feature.properties.category, names);
    }

    return [...byCategory.entries()]
      .map(([category, names]) => ({
        category,
        names: names.sort((a, b) => a.localeCompare(b)),
      }))
      .sort((a, b) => {
        const byCount = b.names.length - a.names.length;
        if (byCount !== 0) return byCount;
        return CATEGORY_LABELS[a.category].localeCompare(
          CATEGORY_LABELS[b.category],
        );
      });
  }, [cell, data, radius]);

  const totalPlaces = groups.reduce(
    (total, group) => total + group.names.length,
    0,
  );

  const handleCopy = async () => {
    const text = groups
      .map((group) =>
        [CATEGORY_LABELS[group.category], ...group.names].join("\n"),
      )
      .join("\n\n");

    try {
      await navigator.clipboard.writeText(text);
      setCopied(true);
      window.setTimeout(() => setCopied(false), 1500);
    } catch {
      // The browser can block clipboard access; leave the button as it is.
    }
  };

  if (!cell) return null;

  return (
    <Card className="absolute top-5 bottom-5 left-5 z-10 flex w-[250px] flex-col overflow-hidden">
      <CardHeader className="flex-row items-start justify-between gap-3 border-b pb-3">
        <div className="space-y-1">
          <CardTitle>Hot zone</CardTitle>
          <p className="text-xs text-muted-foreground">
            {isFetching
              ? "Loading places…"
              : `${totalPlaces} places within ${radius} m`}
          </p>
        </div>
        <div className="flex items-center gap-1">
          <Badge className="border-transparent bg-primary text-primary-foreground">
            {cell.properties.score.toFixed(0)}
          </Badge>
          <Button
            variant="ghost"
            size="icon"
            aria-label="Close"
            onClick={onClose}
          >
            <X />
          </Button>
        </div>
      </CardHeader>

      <div className="flex items-center justify-between gap-2 border-b px-4 py-2">
        <span className="text-xs text-muted-foreground">By place type</span>
        <Button
          size="sm"
          variant="outline"
          disabled={totalPlaces === 0}
          onClick={handleCopy}
        >
          {copied ? <Check /> : <Copy />}
          {copied ? "Copied" : "Copy names"}
        </Button>
      </div>

      <CardContent className="thin-scrollbar min-h-0 flex-1 overflow-y-auto pt-4">
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
                      style={{ backgroundColor: CATEGORY_COLORS[group.category] }}
                    />
                    {CATEGORY_LABELS[group.category]}
                  </span>
                  <span className="text-muted-foreground">
                    {group.names.length}
                  </span>
                </div>
                <ul className="space-y-1">
                  {group.names.map((name, index) => (
                    <li
                      key={`${name}-${index}`}
                      className="truncate text-xs text-muted-foreground"
                      title={name}
                    >
                      {name}
                    </li>
                  ))}
                </ul>
              </section>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
