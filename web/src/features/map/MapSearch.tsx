import { useEffect, useRef, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import type { GeocodeResult } from "@spero/shared";
import { Loader2, MapPin, Search, X } from "lucide-react";
import { useDebouncedRateLimitedValue } from "../../lib/use-debounced-rate-limited-value";
import { cn } from "../../lib/utils";
import { fetchGeocode } from "./api";

interface MapSearchProps {
  onSelect: (result: GeocodeResult) => void;
}

/**
 * Wait for a short pause in typing, then keep searches at least one second
 * apart. Nominatim's public endpoint asks clients for one request per second,
 * and the API already caches repeated queries.
 */
const SEARCH_DEBOUNCE_MS = 500;
const SEARCH_MIN_INTERVAL_MS = 1_000;

function humanizeCategory(value: string | null): string | null {
  if (!value) return null;

  return value
    .replace(/[_-]+/g, " ")
    .replace(/\b\w/g, (character) => character.toUpperCase());
}

/**
 * Search-as-you-type with a debounced, rate-limited query. Submitting is still
 * supported for keyboard users, and choosing a result still closes the panel.
 */
export function MapSearch({ onSelect }: MapSearchProps) {
  const [query, setQuery] = useState("");
  const [open, setOpen] = useState(false);
  const [activeIndex, setActiveIndex] = useState(-1);
  const [selectedQuery, setSelectedQuery] = useState<string | null>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  const trimmedQuery = query.trim();
  const searchQuery = useDebouncedRateLimitedValue(
    trimmedQuery,
    SEARCH_DEBOUNCE_MS,
    SEARCH_MIN_INTERVAL_MS,
  );
  const upToDate = searchQuery === trimmedQuery;
  const waitingForQuery = trimmedQuery.length >= 2 && !upToDate;
  const showPanel = open && trimmedQuery.length >= 2;

  const search = useQuery({
    queryKey: ["geocode", searchQuery],
    queryFn: ({ signal }) => fetchGeocode({ query: searchQuery, signal }),
    enabled: showPanel && upToDate && searchQuery.length >= 2,
    staleTime: 10 * 60_000,
    retry: false,
    refetchOnWindowFocus: false,
  });

  const results = upToDate ? (search.data?.results ?? []) : [];
  const loading = waitingForQuery || (upToDate && search.isFetching);

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

  function choose(result: GeocodeResult) {
    setQuery(result.name);
    setSelectedQuery(result.name);
    setOpen(false);
    setActiveIndex(-1);
    onSelect(result);
  }

  function clear() {
    setQuery("");
    setSelectedQuery(null);
    setOpen(false);
    setActiveIndex(-1);
    inputRef.current?.focus();
  }

  return (
    <div
      ref={containerRef}
      className="absolute top-3 right-16 left-3 z-50 w-auto lg:top-4 lg:right-auto lg:left-1/2 lg:z-20 lg:w-[min(360px,calc(100vw-2rem))] lg:-translate-x-1/2"
    >
      <form
        role="search"
        onSubmit={(event) => {
          event.preventDefault();
          if (activeIndex >= 0 && results[activeIndex]) {
            choose(results[activeIndex]);
            return;
          }
          if (trimmedQuery.length >= 2) setOpen(true);
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
              setSelectedQuery(null);
              setActiveIndex(-1);
              setOpen(value.trim().length >= 2);
            }}
            onFocus={() => {
              if (trimmedQuery.length >= 2 && trimmedQuery !== selectedQuery) {
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
            maxLength={160}
            className="h-10 w-full rounded-lg border bg-card pr-10 pl-9 text-sm text-foreground shadow-lg outline-none placeholder:text-muted-foreground focus-visible:ring-2 focus-visible:ring-ring"
          />
          {query.length > 0 && (
            <button
              type="button"
              onClick={clear}
              aria-label="Clear search"
              className="absolute top-1/2 right-2 flex size-6 -translate-y-1/2 items-center justify-center rounded-md text-muted-foreground hover:bg-accent hover:text-foreground"
            >
              <X className="size-3.5" />
            </button>
          )}
          {loading && (
            <Loader2 className="absolute top-1/2 right-9 size-3.5 -translate-y-1/2 animate-spin text-muted-foreground" />
          )}
        </div>
      </form>

      {showPanel && (
        <div
          id="map-search-results"
          className="mt-1.5 overflow-hidden rounded-lg border bg-popover text-popover-foreground shadow-xl"
        >
          {loading && results.length === 0 && (
            <div className="flex items-center gap-2 px-3 py-3 text-xs text-muted-foreground">
              <Loader2 className="size-3.5 animate-spin" />
              Searching the map…
            </div>
          )}

          {upToDate && search.isError && (
            <p className="px-3 py-3 text-xs text-destructive">
              {search.error instanceof Error
                ? search.error.message
                : "Search failed"}
            </p>
          )}

          {!loading &&
            upToDate &&
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
                        "flex w-full items-start gap-2.5 px-3 py-2 text-left hover:bg-accent focus-visible:bg-accent focus-visible:outline-none",
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
