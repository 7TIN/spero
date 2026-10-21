import { useEffect, useRef, type ReactNode } from "react";
import { Menu, X } from "lucide-react";
import { Button } from "../../components/ui/button";
import { cn } from "../../lib/utils";

interface MobileControlMenuProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  children: ReactNode;
}

/**
 * Mobile replacement for the always-visible desktop control card. The trigger
 * sits beside the search bar; the panel opens underneath it and closes on a
 * second tap, on Escape, or on a tap anywhere outside the menu.
 */
export function MobileControlMenu({
  open,
  onOpenChange,
  children,
}: MobileControlMenuProps) {
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;

    function handlePointerDown(event: PointerEvent) {
      if (
        event.target instanceof Node &&
        !containerRef.current?.contains(event.target)
      ) {
        onOpenChange(false);
      }
    }

    function handleKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") onOpenChange(false);
    }

    document.addEventListener("pointerdown", handlePointerDown);
    document.addEventListener("keydown", handleKeyDown);

    return () => {
      document.removeEventListener("pointerdown", handlePointerDown);
      document.removeEventListener("keydown", handleKeyDown);
    };
  }, [open, onOpenChange]);

  return (
    <div
      ref={containerRef}
      className="pointer-events-none absolute inset-x-0 top-0 z-40"
    >
      <Button
        type="button"
        variant="outline"
        size="icon"
        aria-expanded={open}
        aria-controls="mobile-map-controls"
        aria-label={open ? "Close map controls" : "Open map controls"}
        title={open ? "Close map controls" : "Open map controls"}
        onClick={() => onOpenChange(!open)}
        className={cn(
          "pointer-events-auto absolute top-3 right-3 size-10 rounded-xl border-border/70 bg-card/95 shadow-xl backdrop-blur supports-[backdrop-filter]:bg-card/90",
          open && "bg-accent text-accent-foreground",
        )}
      >
        {open ? <X /> : <Menu />}
      </Button>

      {open && (
        <div
          id="mobile-map-controls"
          className="pointer-events-auto absolute top-[4.25rem] right-3 w-[min(20rem,calc(100vw-1.5rem))]"
        >
          {children}
        </div>
      )}
    </div>
  );
}
