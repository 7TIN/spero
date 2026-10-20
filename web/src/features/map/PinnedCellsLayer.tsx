import type { HotzoneFeatureCollection } from "@spero/shared";
import { Pin } from "lucide-react";
import { Layer, Marker, Source } from "react-map-gl/maplibre";
import { PIN_COLOR } from "./constants";
import type { PinnedCell } from "./types";

interface PinnedCellsLayerProps {
  pins: PinnedCell[];
  selectedId: string | null;
  onSelect: (pin: PinnedCell) => void;
}

function pinsCollection(pins: PinnedCell[]): HotzoneFeatureCollection {
  return {
    type: "FeatureCollection",
    features: pins.map((pin) => {
      const { minLng, minLat, maxLng, maxLat } = pin.cell.bounds;

      return {
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
      };
    }),
  };
}

/**
 * Saved cells are drawn under the active selection. Their centre badges are
 * real buttons, so a pin can be reopened even when the scored grid has moved.
 */
export function PinnedCellsLayer({
  pins,
  selectedId,
  onSelect,
}: PinnedCellsLayerProps) {
  if (pins.length === 0) return null;

  return (
    <>
      <Source id="pinned-cells" type="geojson" data={pinsCollection(pins)}>
        <Layer
          id="pinned-cells-casing"
          type="line"
          layout={{ "line-cap": "round", "line-join": "round" }}
          paint={{
            "line-color": "#111827",
            "line-width": 5,
            "line-opacity": 0.35,
          }}
        />
        <Layer
          id="pinned-cells-outline"
          type="line"
          layout={{ "line-cap": "round", "line-join": "round" }}
          paint={{
            "line-color": PIN_COLOR,
            "line-width": 2,
            "line-dasharray": [1.2, 1.6],
            "line-opacity": 0.9,
          }}
        />
      </Source>

      {pins.map((pin, index) => {
        const active = pin.id === selectedId;

        return (
          <Marker
            key={pin.id}
            longitude={pin.cell.centerLng}
            latitude={pin.cell.centerLat}
            anchor="center"
          >
            <button
              type="button"
              onClick={(event) => {
                event.stopPropagation();
                onSelect(pin);
              }}
              aria-label={`Select pinned cell ${index + 1}`}
              title={`Pinned cell ${index + 1} · score ${pin.cell.score.toFixed(0)}`}
              className="flex h-5 items-center gap-0.5 rounded-full border border-white/70 bg-amber-500 px-1.5 text-[9px] font-semibold text-white shadow-md transition-transform hover:scale-110 focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none"
              style={
                active
                  ? { boxShadow: "0 0 0 2px rgba(245, 158, 11, 0.35)" }
                  : undefined
              }
            >
              <Pin className="size-2.5" />
              {index + 1}
            </button>
          </Marker>
        );
      })}
    </>
  );
}
