import { Store } from "lucide-react";
import type { PlaceFeatureCollection } from "@spero/shared";
import { Marker } from "react-map-gl/maplibre";
import { COMPETITOR_COLOR } from "./constants";
import { BUSINESS_TYPE_ICONS } from "./place-icons";

interface CompetitorLayerProps {
  data?: PlaceFeatureCollection;
  focusedPlaceId: string | null;
  onSelect: (placeId: string) => void;
}

/**
 * Competitor pins are DOM markers rather than MapLibre circles, so they get a
 * real business icon and are never confused with the crowd POI dots. Marker
 * clicks are ignored by the map click handler via `.maplibregl-marker`.
 */
export function CompetitorLayer({
  data,
  focusedPlaceId,
  onSelect,
}: CompetitorLayerProps) {
  if (!data || data.features.length === 0) return null;

  return (
    <>
      {data.features.map((feature) => {
        const [longitude, latitude] = feature.geometry.coordinates;
        const properties = feature.properties;
        const Icon = BUSINESS_TYPE_ICONS[properties.type] ?? Store;
        const focused = properties.id === focusedPlaceId;

        return (
          <Marker
            key={properties.id}
            longitude={longitude}
            latitude={latitude}
            anchor="center"
          >
            <button
              type="button"
              title={properties.name ?? "Competitor"}
              aria-label={`Show ${properties.name ?? "competitor"}`}
              className={`flex size-6 items-center justify-center rounded-full border-2 border-white text-white shadow-md transition-transform hover:scale-110 focus-visible:ring-2 focus-visible:ring-fuchsia-400 focus-visible:outline-none ${
                focused ? "scale-125 ring-2 ring-fuchsia-300 ring-offset-2" : ""
              }`}
              style={{ backgroundColor: COMPETITOR_COLOR }}
              onClick={(event) => {
                event.stopPropagation();
                onSelect(properties.id);
              }}
            >
              <Icon className="size-3.5" />
            </button>
          </Marker>
        );
      })}
    </>
  );
}
