import type { HotzoneFeatureCollection } from "@spero/shared";
import { Lock, LockOpen, X } from "lucide-react";
import { Layer, Marker, Source } from "react-map-gl/maplibre";
import type { SelectedCell } from "./types";

interface SelectedCellOverlayProps {
  cell: SelectedCell;
  locked: boolean;
  color: string;
  onClear: () => void;
  onToggleLock: () => void;
}

const iconButtonClass =
  "flex size-7 items-center justify-center rounded-md border bg-popover text-popover-foreground shadow-md transition-colors hover:bg-accent focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none";

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
  locked,
  color,
  onClear,
  onToggleLock,
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
          className={iconButtonClass}
          aria-label={locked ? "Unlock the grid" : "Lock the grid to this cell"}
          aria-pressed={locked}
          title={
            locked
              ? "Unlock the grid: score the whole view again"
              : "Lock the grid: only score cells inside this one"
          }
          onClick={(event) => {
            event.stopPropagation();
            onToggleLock();
          }}
        >
          {locked ? (
            <Lock className="size-4" />
          ) : (
            <LockOpen className="size-4" />
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
