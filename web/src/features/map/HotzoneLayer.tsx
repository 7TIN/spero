import { Layer, Source } from "react-map-gl/maplibre";
import type { HotzoneFeatureCollection } from "@spero/shared";
import {
  HOTZONE_COLOR_STOPS,
  HOTZONE_FILL_OPACITY,
  PLACES_ATTRIBUTION,
} from "./constants";

const fillStops = HOTZONE_COLOR_STOPS.map(
  (stop) => [stop.score, stop.color] as [number, string],
);

interface HotzoneLayerProps {
  data?: HotzoneFeatureCollection;
}

export function HotzoneLayer({ data }: HotzoneLayerProps) {
  if (!data || data.features.length === 0) return null;

  return (
    <Source
      id="hotzones"
      type="geojson"
      data={data}
      attribution={PLACES_ATTRIBUTION}
    >
      <Layer
        id="hotzones-fill"
        type="fill"
        paint={{
          "fill-color": {
            property: "score",
            type: "interval",
            stops: fillStops,
          },
          "fill-opacity": HOTZONE_FILL_OPACITY,
        }}
      />
    </Source>
  );
}
