import { useEffect, useRef, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import type { GeocodeResult } from "@spero/shared";
import { Loader2, MapPin, Search, X } from "lucide-react";
import { cn } from "../../lib/utils";
import { fetchGeocode } from "./api";

interface MapSearchProps {
  onSelect: (result: GeocodeResult) => void;
}

function humanizeCategory(value: string | null): string | null {
  if (!value) return null;

  return value
    .replace(/[_-]+/g, " ")
    .replace(/\b\w/g, (character) => character.toUpperCase());
}

/**
 * Explicit search rather than autocomplete: Nominatim's public endpoint asks
 * clients to keep searches user-triggered, so the query only runs on submit.
 */
export function MapSearch({ onSelect }: MapSearchProps) {
  const [query, setQuery] = useState("");
  const [submittedQuery, setSubmittedQuery] = useState("");
  const [open, setOpen] = useState(false);
  const [activeIndex, setActiveIndex] = useState(-1);
  const containerRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  const search = useQuery({
    queryKey: ["geocode", submittedQuery],
    queryFn: ({ signal }) => fetchGeocode({ query: submittedQuery, signal }),
    enabled: submittedQuery.length >= 2,
    staleTime: 10 * 60_000,
    retry: false,
    refetchOnWindowFocus: false,
  });

  const results = search.data?.results ?? [];
  const showPanel = open && submittedQuery.length >= 2;

  useEffect(() => {
    function handlePointerDown(event: PointerEvent) {
      if (
        event.target instanceof Node &&
        !containerRef.current?.contains(event.target)
      ) {
        setOpen(false);
        setActiveIndex(-1);
      }
    }

    document.addEventListener("pointerdown", handlePointerDown);
    return () => document.removeEventListener("pointerdown", handlePointerDown);
  }, []);

  function submit() {
    const next = query.trim();
    if (next.length < 2) return;

    setSubmittedQuery(next);
    setActiveIndex(-1);
    setOpen(true);
  }

  function choose(result: GeocodeResult) {
    // Keep the submitted query key intact so choosing a result does not fire a
    // second Nominatim request for the result's short name.
    setQuery(result.name);
    setOpen(false);
    setActiveIndex(-1);
    onSelect(result);
  }

  function clear() {
    setQuery("");
    setSubmittedQuery("");
    setOpen(false);
    setActiveIndex(-1);
    inputRef.current?.focus();
  }

  return (
    <div
      ref={containerRef}
      className="absolute top-4 left-1/2 z-20 w-[min(360px,calc(100vw-2rem))] -translate-x-1/2"
    >
      <form
        role="search"
        onSubmit={(event) => {
          event.preventDefault();
          if (activeIndex >= 0 && results[activeIndex]) {
            choose(results[activeIndex]);
            return;
          }
          submit();
        }}
      >
        <div className="relative">
          <Search className="pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 text-muted-foreground" />
          <input
            ref={inputRef}
            value={query}
            onChange={(event) => {
              const value = event.target.value;
              setQuery(value);
              if (value.trim().length < 2) setSubmittedQuery("");
              if (value.trim() !== submittedQuery) {
                setOpen(false);
                setActiveIndex(-1);
              }
            }}
            onFocus={() => {
              if (query.trim() === submittedQuery && submittedQuery.length >= 2) {
                setOpen(true);
              }
            }}
            onKeyDown={(event) => {
              if (event.key === "Escape") {
                setOpen(false);
                setActiveIndex(-1);
                return;
              }
              if (!showPanel || results.length === 0) return;

              if (event.key === "ArrowDown") {
                event.preventDefault();
                setActiveIndex((current) => (current + 1) % results.length);
              } else if (event.key === "ArrowUp") {
                event.preventDefault();
                setActiveIndex((current) =>
                  current <= 0 ? results.length - 1 : current - 1,
                );
              }
            }}
            placeholder="Search city, area, or address"
            aria-label="Search for a city, area, or address"
            aria-expanded={showPanel}
            aria-controls="map-search-results"
            autoComplete="off"
            spellCheck={false}
            className="h-10 w-full rounded-lg border bg-card pr-10 pl-9 text-sm text-foreground shadow-lg outline-none placeholder:text-muted-foreground focus-visible:ring-2 focus-visible:ring-ring"
          />
          {query.length > 0 && (
            <button
              type="button"
              onClick={clear}
              aria-label="Clear search"
              className="absolute top-1/2 right-2 flex size-6 -translate-y-1/2 items-center justify-center rounded-md text-muted-foreground transition-colors hover:bg-accent hover:text-foreground"
            >
              <X className="size-3.5" />
            </button>
          )}
          {search.isFetching && (
            <Loader2 className="absolute top-1/2 right-9 size-3.5 -translate-y-1/2 animate-spin text-muted-foreground" />
          )}
        </div>
      </form>

      {showPanel && (
        <div
          id="map-search-results"
          className="mt-1.5 overflow-hidden rounded-lg border bg-popover text-popover-foreground shadow-xl"
        >
          {search.isFetching && results.length === 0 && (
            <div className="flex items-center gap-2 px-3 py-3 text-xs text-muted-foreground">
              <Loader2 className="size-3.5 animate-spin" />
              Searching the map…
            </div>
          )}

          {search.isError && (
            <p className="px-3 py-3 text-xs text-destructive">
              {search.error instanceof Error
                ? search.error.message
                : "Search failed"}
            </p>
          )}

          {!search.isFetching &&
            !search.isError &&
            search.isFetched &&
            results.length === 0 && (
              <p className="px-3 py-3 text-xs text-muted-foreground">
                No places found. Try a broader name.
              </p>
            )}

          {results.length > 0 && (
            <ul className="max-h-[min(20rem,50svh)] overflow-y-auto py-1">
              {results.map((result, index) => {
                const category = humanizeCategory(result.category);

                return (
                  <li key={result.id}>
                    <button
                      type="button"
                      onMouseEnter={() => setActiveIndex(index)}
                      onClick={() => choose(result)}
                      className={cn(
                        "flex w-full items-start gap-2.5 px-3 py-2 text-left transition-colors hover:bg-accent focus-visible:bg-accent focus-visible:outline-none",
                        activeIndex === index && "bg-accent",
                      )}
                    >
                      <MapPin className="mt-0.5 size-4 shrink-0 text-muted-foreground" />
                      <span className="min-w-0 flex-1">
                        <span className="flex items-center gap-1.5">
                          <span className="truncate text-sm font-medium">
                            {result.name}
                          </span>
                          {category && (
                            <span className="shrink-0 rounded bg-secondary px-1.5 py-0.5 text-[9px] font-medium text-secondary-foreground">
                              {category}
                            </span>
                          )}
                        </span>
                        <span className="mt-0.5 block truncate text-[11px] text-muted-foreground">
                          {result.label}
                        </span>
                      </span>
                    </button>
                  </li>
                );
              })}
            </ul>
          )}
        </div>
      )}
    </div>
  );
}
