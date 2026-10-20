import type { HotzoneFeatureCollection } from "@spero/shared";
import { Pin, PinOff, X } from "lucide-react";
import { Layer, Marker, Source } from "react-map-gl/maplibre";
import { cn } from "../../lib/utils";
import type { SelectedCell } from "./types";

interface SelectedCellOverlayProps {
  cell: SelectedCell;
  pinned: boolean;
  pinLimitReached: boolean;
  color: string;
  onClear: () => void;
  onTogglePin: () => void;
}

const iconButtonClass =
  "flex size-7 items-center justify-center rounded-md border bg-popover text-popover-foreground shadow-md transition-colors hover:bg-accent focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none disabled:pointer-events-none disabled:opacity-50";

function cellPolygon(cell: SelectedCell): HotzoneFeatureCollection {
  const { minLng, minLat, maxLng, maxLat } = cell.bounds;

  return {
    type: "FeatureCollection",
    features: [
      {
        type: "Feature",
        geometry: {
          type: "Polygon",
          coordinates: [
            [
              [minLng, minLat],
              [maxLng, minLat],
              [maxLng, maxLat],
              [minLng, maxLat],
              [minLng, minLat],
            ],
          ],
        },
        // The outline layer only reads the geometry, so score is a placeholder.
        properties: { score: 0, breakdown: [] },
      },
    ],
  };
}

export function SelectedCellOverlay({
  cell,
  pinned,
  pinLimitReached,
  color,
  onClear,
  onTogglePin,
}: SelectedCellOverlayProps) {
  const { minLng, maxLng, maxLat } = cell.bounds;

  return (
    <>
      <Source id="selected-cell" type="geojson" data={cellPolygon(cell)}>
        <Layer
          id="selected-cell-outline"
          type="line"
          layout={{ "line-cap": "round" }}
          paint={{
            "line-color": color,
            "line-width": 3,
            // A very short dash with a round cap reads as a dotted line.
            "line-dasharray": [0.2, 1.8],
          }}
        />
      </Source>

      <Marker
        longitude={minLng}
        latitude={maxLat}
        anchor="bottom-right"
        offset={[-5, -5]}
      >
        <button
          type="button"
          className={cn(
            iconButtonClass,
            pinned &&
              "border-amber-500/50 bg-amber-500/15 text-amber-600 dark:text-amber-300",
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
          onClick={(event) => {
            event.stopPropagation();
            onTogglePin();
          }}
        >
          {pinned ? (
            <PinOff className="size-4" />
          ) : (
            <Pin className="size-4" />
          )}
        </button>
      </Marker>

      <Marker
        longitude={maxLng}
        latitude={maxLat}
        anchor="bottom-left"
        offset={[5, -5]}
      >
        <button
          type="button"
          className={iconButtonClass}
          aria-label="Clear the selected cell"
          title="Clear the selected cell"
          onClick={(event) => {
            event.stopPropagation();
            onClear();
          }}
        >
          <X className="size-4" />
        </button>
      </Marker>
    </>
  );
}
