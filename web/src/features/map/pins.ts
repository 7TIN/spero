import type { Bbox } from "@spero/shared";
import { MAX_PINNED_CELLS, PIN_STORAGE_KEY } from "./constants";
import type { PinnedCell, SelectedCell } from "./types";

function isBbox(value: unknown): value is Bbox {
  if (!value || typeof value !== "object") return false;

  const bounds = value as Record<string, unknown>;
  const { minLng, minLat, maxLng, maxLat } = bounds;

  return (
    typeof minLng === "number" &&
    typeof minLat === "number" &&
    typeof maxLng === "number" &&
    typeof maxLat === "number" &&
    Number.isFinite(minLng) &&
    Number.isFinite(minLat) &&
    Number.isFinite(maxLng) &&
    Number.isFinite(maxLat) &&
    minLng < maxLng &&
    minLat < maxLat
  );
}

function isSelectedCell(value: unknown): value is SelectedCell {
  if (!value || typeof value !== "object") return false;

  const cell = value as Record<string, unknown>;
  return (
    typeof cell.centerLng === "number" &&
    typeof cell.centerLat === "number" &&
    typeof cell.score === "number" &&
    Number.isFinite(cell.centerLng) &&
    Number.isFinite(cell.centerLat) &&
    Number.isFinite(cell.score) &&
    isBbox(cell.bounds)
  );
}

/** Bounds-based, so the same cell always produces the same pin key. */
export function cellKey(cell: SelectedCell): string {
  const { minLng, minLat, maxLng, maxLat } = cell.bounds;
  return [minLng, minLat, maxLng, maxLat]
    .map((value) => value.toFixed(6))
    .join(":");
}

function parsePinnedCell(value: unknown): PinnedCell | null {
  if (!value || typeof value !== "object") return null;

  const pin = value as Record<string, unknown>;
  if (!isSelectedCell(pin.cell)) return null;

  return {
    id: cellKey(pin.cell),
    cell: pin.cell,
    pinnedAt:
      typeof pin.pinnedAt === "number" && Number.isFinite(pin.pinnedAt)
        ? pin.pinnedAt
        : Date.now(),
  };
}

export function loadPinnedCells(): PinnedCell[] {
  if (typeof window === "undefined") return [];

  try {
    const raw = window.localStorage.getItem(PIN_STORAGE_KEY);
    if (!raw) return [];

    const parsed: unknown = JSON.parse(raw);
    if (!Array.isArray(parsed)) return [];

    const byId = new Map<string, PinnedCell>();
    for (const entry of parsed) {
      const pin = parsePinnedCell(entry);
      if (pin && !byId.has(pin.id)) byId.set(pin.id, pin);
      if (byId.size >= MAX_PINNED_CELLS) break;
    }

    return [...byId.values()];
  } catch {
    // A corrupt or unavailable store should never stop the map from loading.
    return [];
  }
}

export function savePinnedCells(pins: PinnedCell[]): void {
  if (typeof window === "undefined") return;

  try {
    window.localStorage.setItem(
      PIN_STORAGE_KEY,
      JSON.stringify(pins.slice(0, MAX_PINNED_CELLS)),
    );
  } catch {
    // Private browsing and full quotas can reject writes; pins still work in
    // memory for this session.
  }
}
