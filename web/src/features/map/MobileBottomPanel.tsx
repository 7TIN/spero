import {
  useRef,
  useState,
  type PointerEvent as ReactPointerEvent,
  type ReactNode,
} from "react";
import { ChevronDown, List, Sparkles } from "lucide-react";
import { Button } from "../../components/ui/button";
import { cn } from "../../lib/utils";

export type MobileMapTab = "results" | "ai";

interface MobileBottomPanelProps {
  activeTab: MobileMapTab | null;
  onTabChange: (tab: MobileMapTab | null) => void;
  results: ReactNode;
  ai: ReactNode;
}

const MIN_OPEN_HEIGHT = 280;

function maximumHeight(): number {
  return Math.max(MIN_OPEN_HEIGHT, Math.round(window.innerHeight - 92));
}

function defaultHeight(): number {
  return Math.min(600, Math.max(360, Math.round(window.innerHeight * 0.7)));
}

/**
 * Mobile bottom sheet with a persistent Results / AI switcher. Dragging the
 * notch resizes the sheet and pulling it far enough down closes it. Both
 * panels stay mounted so switching tabs does not lose chat history or a
 * populated results list.
 */
export function MobileBottomPanel({
  activeTab,
  onTabChange,
  results,
  ai,
}: MobileBottomPanelProps) {
  const [height, setHeightState] = useState(defaultHeight);
  const heightRef = useRef(height);
  const dragRef = useRef<{ startY: number; startHeight: number } | null>(null);

  const open = activeTab !== null;

  function setHeight(next: number) {
    heightRef.current = next;
    setHeightState(next);
  }

  function close() {
    setHeight(defaultHeight());
    onTabChange(null);
  }

  function handlePointerDown(event: ReactPointerEvent<HTMLButtonElement>) {
    dragRef.current = {
      startY: event.clientY,
      startHeight: heightRef.current,
    };
    event.currentTarget.setPointerCapture(event.pointerId);
  }

  function handlePointerMove(event: ReactPointerEvent<HTMLButtonElement>) {
    const drag = dragRef.current;
    if (!drag) return;

    const delta = event.clientY - drag.startY;
    const next = Math.min(
      maximumHeight(),
      Math.max(132, drag.startHeight - delta),
    );
    setHeight(next);
  }

  function handlePointerEnd() {
    if (!dragRef.current) return;
    dragRef.current = null;

    if (heightRef.current < MIN_OPEN_HEIGHT) close();
  }

  function chooseTab(tab: MobileMapTab) {
    onTabChange(activeTab === tab ? null : tab);
  }

  const visibleHeight = Math.min(height, maximumHeight());

  return (
    <div className="pointer-events-none fixed inset-x-0 bottom-0 z-40 flex justify-center">
      <section
        aria-label="Map drawers"
        className="pointer-events-auto relative flex w-full max-w-lg flex-col overflow-hidden rounded-t-2xl border border-b-0 bg-card text-card-foreground shadow-2xl"
        style={open ? { height: visibleHeight } : undefined}
      >
        {open && (
          <div className="relative flex h-8 shrink-0 items-center justify-center">
            <button
              type="button"
              aria-label="Drag to resize the map panel"
              className="flex h-8 w-28 touch-none cursor-grab items-center justify-center active:cursor-grabbing"
              onPointerDown={handlePointerDown}
              onPointerMove={handlePointerMove}
              onPointerUp={handlePointerEnd}
              onPointerCancel={handlePointerEnd}
            >
              <span
                aria-hidden="true"
                className="h-1.5 w-11 rounded-full bg-border"
              />
            </button>
            <Button
              type="button"
              variant="ghost"
              size="icon"
              onClick={close}
              aria-label="Collapse map panel"
              title="Collapse panel"
              className="absolute top-0.5 right-1 size-7"
            >
              <ChevronDown />
            </Button>
          </div>
        )}

        <div
          className={cn(
            "min-h-0 flex-1 overflow-hidden",
            !open && "hidden",
          )}
        >
          <div
            id="mobile-results-panel"
            className={cn(
              "h-full",
              !open || activeTab !== "results" ? "hidden" : undefined,
            )}
          >
            {results}
          </div>
          <div
            id="mobile-ai-panel"
            className={cn(
              "h-full",
              !open || activeTab !== "ai" ? "hidden" : undefined,
            )}
          >
            {ai}
          </div>
        </div>

        <nav
          aria-label="Map panels"
          className="grid shrink-0 grid-cols-2 gap-1 border-t bg-card px-1.5 pt-1.5 pb-[calc(0.375rem+env(safe-area-inset-bottom))]"
        >
          <button
            type="button"
            aria-expanded={activeTab === "results"}
            aria-controls="mobile-results-panel"
            onClick={() => chooseTab("results")}
            className={cn(
              "flex h-11 items-center justify-center gap-2 rounded-xl text-xs font-medium",
              activeTab === "results"
                ? "bg-accent text-accent-foreground"
                : "text-muted-foreground hover:bg-accent hover:text-accent-foreground",
            )}
          >
            <List className="size-4" />
            Results
          </button>
          <button
            type="button"
            aria-expanded={activeTab === "ai"}
            aria-controls="mobile-ai-panel"
            onClick={() => chooseTab("ai")}
            className={cn(
              "flex h-11 items-center justify-center gap-2 rounded-xl text-xs font-medium",
              activeTab === "ai"
                ? "bg-accent text-accent-foreground"
                : "text-muted-foreground hover:bg-accent hover:text-accent-foreground",
            )}
          >
            <Sparkles className="size-4" />
            AI
          </button>
        </nav>
      </section>
    </div>
  );
}
