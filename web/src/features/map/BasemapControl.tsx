import { Check } from "lucide-react";
import { cn } from "../../lib/utils";
import { BASEMAPS, type BasemapId } from "./constants";

interface BasemapControlProps {
  basemap: BasemapId;
  onBasemapChange: (value: BasemapId) => void;
}

/**
 * Compact basemap switcher at the bottom-right of the map. The active basemap
 * is kept first in the row so the current choice always sits on the left.
 */
export function BasemapControl({
  basemap,
  onBasemapChange,
}: BasemapControlProps) {
  const ordered = [...BASEMAPS].sort((a, b) => {
    if (a.id === basemap) return -1;
    if (b.id === basemap) return 1;
    return 0;
  });

  return (
    <div className="absolute right-2.5 bottom-12 z-20 rounded-xl border bg-popover/95 p-1.5 text-popover-foreground shadow-xl backdrop-blur">
      <div role="group" aria-label="Basemap" className="flex items-end gap-1.5">
        {ordered.map((option) => {
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
                "group relative h-11 w-14 overflow-hidden rounded-md border border-border/60 bg-muted p-0 text-left shadow-sm transition-[box-shadow,transform] hover:-translate-y-0.5 hover:shadow-md focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none",
                active && "ring-2 ring-primary ring-offset-1 ring-offset-popover",
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
              <span className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/80 via-black/40 to-transparent px-1.5 pt-3 pb-1 text-[9px] leading-none font-medium text-white">
                {option.label}
              </span>
              {active && (
                <span className="absolute top-1 right-1 flex size-4 items-center justify-center rounded-full bg-primary text-primary-foreground">
                  <Check className="size-2.5" />
                </span>
              )}
            </button>
          );
        })}
      </div>
    </div>
  );
}
