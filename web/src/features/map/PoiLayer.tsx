import { Layer, Source } from "react-map-gl/maplibre";
import type { PoiFeatureCollection } from "@spero/shared";
import { CATEGORY_COLORS, POI_MIN_ZOOM } from "./constants";

interface PoiLayerProps {
  data?: PoiFeatureCollection;
}

export function PoiLayer({ data }: PoiLayerProps) {
  if (!data || data.features.length === 0) return null;

  return (
    <Source id="pois" type="geojson" data={data}>
      <Layer
        id="pois-circle"
        type="circle"
        minzoom={POI_MIN_ZOOM}
        paint={{
          "circle-radius": [
            "interpolate",
            ["linear"],
            ["zoom"],
            POI_MIN_ZOOM,
            3,
            18,
            6,
          ],
          "circle-color": [
            "match",
            ["get", "category"],
            "college",
            CATEGORY_COLORS.college,
            "school",
            CATEGORY_COLORS.school,
            "hospital",
            CATEGORY_COLORS.hospital,
            "transport",
            CATEGORY_COLORS.transport,
            "market",
            CATEGORY_COLORS.market,
            "worship",
            CATEGORY_COLORS.worship,
            "hotel",
            CATEGORY_COLORS.hotel,
            "office",
            CATEGORY_COLORS.office,
            "entertainment",
            CATEGORY_COLORS.entertainment,
            "food",
            CATEGORY_COLORS.food,
            "#64748b",
          ],
          "circle-opacity": 0.9,
          "circle-stroke-color": "#ffffff",
          "circle-stroke-width": 1,
        }}
      />
    </Source>
  );
}
