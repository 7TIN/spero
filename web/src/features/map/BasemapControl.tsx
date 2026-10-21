import { useEffect, useRef, useState } from "react";
import { Check, Layers } from "lucide-react";
import { Button } from "../../components/ui/button";
import { cn } from "../../lib/utils";
import { BASEMAPS, type BasemapId } from "./constants";

interface BasemapControlProps {
  basemap: BasemapId;
  onBasemapChange: (value: BasemapId) => void;
}

/**
 * Floating basemap switcher for the bottom-right of the map. Keeping it out of
 * the control card leaves room for the zoom and compass controls on shorter
 * screens.
 */
export function BasemapControl({
  basemap,
  onBasemapChange,
}: BasemapControlProps) {
  const [open, setOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);
  const current = BASEMAPS.find((option) => option.id === basemap);

  useEffect(() => {
    if (!open) return;

    function handlePointerDown(event: PointerEvent) {
      if (
        event.target instanceof Node &&
        !containerRef.current?.contains(event.target)
      ) {
        setOpen(false);
      }
    }

    function handleKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") setOpen(false);
    }

    document.addEventListener("pointerdown", handlePointerDown);
    document.addEventListener("keydown", handleKeyDown);
    return () => {
      document.removeEventListener("pointerdown", handlePointerDown);
      document.removeEventListener("keydown", handleKeyDown);
    };
  }, [open]);

  return (
    <div
      ref={containerRef}
      className="absolute right-4 bottom-36 z-20 flex flex-col items-end"
    >
      {open && (
        <div
          role="dialog"
          aria-label="Choose basemap"
          className="mb-2 w-[236px] rounded-xl border bg-popover p-2 text-popover-foreground shadow-xl"
        >
          <p className="px-1 pb-2 text-xs font-semibold">Basemap</p>
          <div className="grid grid-cols-3 gap-1.5">
            {BASEMAPS.map((option) => {
              const active = basemap === option.id;

              return (
                <button
                  key={option.id}
                  type="button"
                  aria-pressed={active}
                  aria-label={`${option.label} basemap`}
                  title={`${option.label} basemap`}
                  onClick={() => {
                    onBasemapChange(option.id);
                    setOpen(false);
                  }}
                  className={cn(
                    "group relative aspect-[4/3] overflow-hidden rounded-md border border-border/60 bg-muted p-0 text-left shadow-sm transition-[box-shadow,transform] hover:-translate-y-0.5 hover:shadow-md focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-popover focus-visible:outline-none",
                    active && "ring-2 ring-primary",
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
                  <span className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/80 via-black/40 to-transparent px-1.5 pt-4 pb-1 text-[9px] leading-none font-medium text-white">
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
      )}

      <Button
        type="button"
        variant="outline"
        onClick={() => setOpen((value) => !value)}
        aria-haspopup="dialog"
        aria-expanded={open}
        aria-label={`Basemap: ${current?.label ?? basemap}. Change basemap`}
        title={`Basemap: ${current?.label ?? basemap}`}
        className="h-9 gap-2 bg-card/95 px-2.5 shadow-lg backdrop-blur"
      >
        <Layers className="size-4" />
        <span className="text-xs font-medium">{current?.label ?? basemap}</span>
      </Button>
    </div>
  );
}
