import { useEffect, useRef, useState } from "react";
import { Check, Layers } from "lucide-react";
import { cn } from "../../lib/utils";
import { BASEMAPS, type BasemapId } from "./constants";

interface BasemapControlProps {
  basemap: BasemapId;
  onBasemapChange: (value: BasemapId) => void;
  variant?: "desktop" | "mobile";
}

function previewBackground(id: BasemapId): string {
  return id === "dark"
    ? "bg-slate-900"
    : id === "osm"
      ? "bg-amber-100"
      : "bg-slate-100";
}

function BasemapCard({
  option,
  active,
  onSelect,
}: {
  option: (typeof BASEMAPS)[number];
  active: boolean;
  onSelect: () => void;
}) {
  return (
    <button
      type="button"
      aria-pressed={active}
      aria-label={`${option.label} basemap`}
      title={`${option.label} basemap`}
      onClick={onSelect}
      className={cn(
        "group relative h-11 w-14 overflow-hidden rounded-md border border-border/60 bg-muted p-0 text-left shadow-sm transition-[box-shadow,transform] hover:-translate-y-0.5 hover:shadow-md focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none",
        active && "ring-2 ring-primary ring-offset-1 ring-offset-popover",
      )}
    >
      <span
        aria-hidden="true"
        className={cn("absolute inset-0", previewBackground(option.id))}
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
}

function MobileBasemapControl({
  basemap,
  onBasemapChange,
}: Omit<BasemapControlProps, "variant">) {
  const [open, setOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);
  const activeOption = BASEMAPS.find((option) => option.id === basemap) ?? BASEMAPS[0];

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
      className="absolute right-2.5 bottom-[calc(5.75rem+env(safe-area-inset-bottom))] z-30"
    >
      {open && (
        <div
          role="group"
          aria-label="Basemap"
          className="absolute right-0 bottom-[calc(100%+0.5rem)] flex items-end gap-1.5 rounded-xl border bg-popover/95 p-1.5 text-popover-foreground shadow-xl backdrop-blur"
        >
          {BASEMAPS.map((option) => (
            <BasemapCard
              key={option.id}
              option={option}
              active={basemap === option.id}
              onSelect={() => {
                onBasemapChange(option.id);
                setOpen(false);
              }}
            />
          ))}
        </div>
      )}

      <button
        type="button"
        aria-expanded={open}
        aria-label={`Basemap: ${activeOption.label}. ${
          open ? "Close basemap options" : "Open basemap options"
        }`}
        title={open ? "Close basemap options" : "Basemap options"}
        onClick={() => setOpen((current) => !current)}
        className="flex items-center gap-1 rounded-xl border bg-popover/95 p-1 text-popover-foreground shadow-xl backdrop-blur focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none"
      >
        <span
          className={cn(
            "relative h-9 w-12 overflow-hidden rounded-md border border-border/60",
            previewBackground(activeOption.id),
          )}
        >
          <img
            src={activeOption.previewUrl}
            alt=""
            loading="lazy"
            decoding="async"
            draggable={false}
            className="size-full object-cover"
            onError={(event) => {
              event.currentTarget.style.visibility = "hidden";
            }}
          />
        </span>
        <span className="flex size-9 items-center justify-center rounded-md text-muted-foreground">
          <Layers className="size-4" />
        </span>
      </button>
    </div>
  );
}

/**
 * Desktop keeps the compact three-card row. Mobile collapses the picker to the
 * selected basemap preview plus a stack icon, which expands upward on tap.
 */
export function BasemapControl({
  basemap,
  onBasemapChange,
  variant = "desktop",
}: BasemapControlProps) {
  if (variant === "mobile") {
    return (
      <MobileBasemapControl
        basemap={basemap}
        onBasemapChange={onBasemapChange}
      />
    );
  }

  const ordered = [...BASEMAPS].sort((a, b) => {
    if (a.id === basemap) return -1;
    if (b.id === basemap) return 1;
    return 0;
  });

  return (
    <div className="absolute right-2.5 bottom-12 z-20 rounded-xl border bg-popover/95 p-1.5 text-popover-foreground shadow-xl backdrop-blur">
      <div role="group" aria-label="Basemap" className="flex items-end gap-1.5">
        {ordered.map((option) => (
          <BasemapCard
            key={option.id}
            option={option}
            active={basemap === option.id}
            onSelect={() => onBasemapChange(option.id)}
          />
        ))}
      </div>
    </div>
  );
}
