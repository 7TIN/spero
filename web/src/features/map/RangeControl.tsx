import { useEffect, useRef } from "react";
import { RotateCcw } from "lucide-react";

interface RangeControlProps {
  label: string;
  value: number;
  min: number;
  max: number;
  step: number;
  defaultValue: number;
  unit?: string;
  onChange: (value: number) => void;
}

function clamp(value: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, value));
}

function snap(value: number, min: number, max: number, step: number): number {
  const snapped = Math.round((value - min) / step) * step + min;
  return clamp(Number(snapped.toFixed(6)), min, max);
}

export function RangeControl({
  label,
  value,
  min,
  max,
  step,
  defaultValue,
  unit,
  onChange,
}: RangeControlProps) {
  const trackRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const ratio = clamp((value - min) / (max - min), 0, 1);

  useEffect(() => {
    const input = inputRef.current;
    if (!input || document.activeElement === input) return;
    input.value = String(value);
  }, [value]);

  const setValue = (next: number) => {
    onChange(snap(next, min, max, step));
  };

  const updateFromClientX = (clientX: number) => {
    const track = trackRef.current;
    if (!track) return;

    const rect = track.getBoundingClientRect();
    const bandWidth = track.clientWidth - 74;
    if (bandWidth <= 0) return;

    const x = clientX - rect.left - 1 - 16;
    const nextRatio = clamp(x / bandWidth, 0, 1);
    setValue(min + nextRatio * (max - min));
  };

  const commitDraft = (input: HTMLInputElement) => {
    const raw = input.value.trim();
    const parsed = Number(raw);
    if (!raw || !Number.isFinite(parsed)) {
      input.value = String(value);
      return;
    }

    const next = snap(parsed, min, max, step);
    input.value = String(next);
    onChange(next);
  };

  const displayValue = `${value} ${unit ?? ""}`.trim();

  return (
    <div className="grid gap-1.5">
      <div className="flex items-center justify-between gap-3">
        <span className="text-[12px] font-medium text-zinc-700 dark:text-[#979797]">
          {label}
        </span>
        <span className="rounded-md bg-zinc-100 px-1.5 py-0.5 font-mono text-[10px] tabular-nums text-zinc-500 dark:bg-[#282828] dark:text-[#979797]">
          {displayValue}
        </span>
      </div>

      <div className="flex items-center gap-1.5">
        <div
          ref={trackRef}
          role="slider"
          tabIndex={0}
          aria-label={label}
          aria-valuemin={min}
          aria-valuemax={max}
          aria-valuenow={value}
          aria-valuetext={displayValue}
          className="group/track relative h-6 min-w-0 flex-1 cursor-pointer touch-none select-none rounded border border-zinc-200 bg-zinc-200/60 outline-none transition-colors hover:border-zinc-300 focus-visible:ring-2 focus-visible:ring-zinc-400/60 dark:border-[#282828] dark:bg-[#282828] dark:hover:border-[#393939] dark:focus-visible:ring-white/20"
          onPointerDown={(event) => {
            event.currentTarget.focus();
            event.currentTarget.setPointerCapture(event.pointerId);
            updateFromClientX(event.clientX);
          }}
          onPointerMove={(event) => {
            if (event.currentTarget.hasPointerCapture(event.pointerId)) {
              updateFromClientX(event.clientX);
            }
          }}
          onPointerUp={(event) => {
            if (event.currentTarget.hasPointerCapture(event.pointerId)) {
              event.currentTarget.releasePointerCapture(event.pointerId);
            }
          }}
          onPointerCancel={(event) => {
            if (event.currentTarget.hasPointerCapture(event.pointerId)) {
              event.currentTarget.releasePointerCapture(event.pointerId);
            }
          }}
          onKeyDown={(event) => {
            if (event.key === "ArrowLeft" || event.key === "ArrowDown") {
              event.preventDefault();
              setValue(value - step);
            } else if (event.key === "ArrowRight" || event.key === "ArrowUp") {
              event.preventDefault();
              setValue(value + step);
            } else if (event.key === "Home") {
              event.preventDefault();
              setValue(min);
            } else if (event.key === "End") {
              event.preventDefault();
              setValue(max);
            }
          }}
        >
          <span
            aria-hidden
            style={{ width: `calc(14px + (100% - 74px) * ${ratio})` }}
            className="pointer-events-none absolute inset-y-0.5 left-0.5 rounded-[3px] bg-zinc-300 shadow-[inset_0_1px_2px_rgba(0,0,0,0.08)] dark:bg-white/[0.14] dark:shadow-[0_1px_2px_rgba(0,0,0,0.4)]"
          />

          <span className="pointer-events-none absolute inset-y-0 left-[16px] right-[58px]">
            <span
              aria-hidden
              style={{
                left: `${ratio * 100}%`,
                transform: "translate(-50%, -50%) translateX(-6px)",
              }}
              className="absolute top-1/2 flex flex-col items-center gap-[2px] text-zinc-500 transition-colors group-hover/track:text-zinc-700 dark:text-white/50 dark:group-hover/track:text-white"
            >
              <span className="size-[3px] rounded-full bg-current" />
              <span className="size-[3px] rounded-full bg-current" />
              <span className="size-[3px] rounded-full bg-current" />
            </span>
          </span>

          <span
            className="absolute inset-y-0 right-0 flex w-[51px] items-center"
            onPointerDown={(event) => event.stopPropagation()}
          >
            <input
              ref={inputRef}
              type="number"
              min={min}
              max={max}
              step={step}
              defaultValue={value}
              aria-label={`${label} value`}
              className="min-w-0 flex-1 cursor-text bg-transparent pr-2.5 text-right font-mono text-[11px] tabular-nums text-zinc-600 [appearance:textfield] focus:outline-none dark:text-[#979797] [&::-webkit-inner-spin-button]:appearance-none [&::-webkit-outer-spin-button]:appearance-none"
              onBlur={(event) => commitDraft(event.currentTarget)}
              onKeyDown={(event) => {
                if (event.key === "Enter") {
                  event.currentTarget.blur();
                } else if (event.key === "Escape") {
                  event.currentTarget.value = String(value);
                  event.currentTarget.blur();
                }
              }}
            />
          </span>
        </div>

        <button
          type="button"
          aria-label={`Reset ${label.toLowerCase()}`}
          title={`Reset ${label.toLowerCase()}`}
          disabled={value === defaultValue}
          onClick={() => onChange(defaultValue)}
          className="flex size-5 shrink-0 items-center justify-center rounded-[3px] text-zinc-500 transition-colors hover:bg-zinc-100 hover:text-zinc-950 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#2792ff] disabled:cursor-default disabled:opacity-40 dark:text-[#979797] dark:hover:bg-[#303030] dark:hover:text-[#bcbcbc]"
        >
          <RotateCcw className="size-3" />
        </button>
      </div>
    </div>
  );
}
