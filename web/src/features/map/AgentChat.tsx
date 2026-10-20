import { useEffect, useRef, useState } from "react";
import { useMutation } from "@tanstack/react-query";
import {
  BUSINESS_TYPE_OPTIONS,
  type AgentContext,
  type AgentResponse,
  type AgentSource,
} from "@spero/shared";
import { ArrowUp, Loader2, Sparkles, Trash2, X } from "lucide-react";
import { Button } from "../../components/ui/button";
import { cn } from "../../lib/utils";
import { fetchAgent } from "./api";
import { BASEMAPS, CATEGORY_LABELS } from "./constants";

interface AgentChatProps {
  context: AgentContext;
  onApply: (response: AgentResponse) => void;
}

interface ChatMessage {
  id: number;
  role: "user" | "assistant";
  text: string;
  source?: AgentSource;
  response?: AgentResponse;
  error?: boolean;
}

function appliedChips(response: AgentResponse): string[] {
  const { actions } = response;
  const chips: string[] = [];

  if (response.location.result) {
    chips.push(`Moved to ${response.location.result.name}`);
  }
  if (actions.businessType) {
    const option = BUSINESS_TYPE_OPTIONS.find(
      (entry) => entry.id === actions.businessType,
    );
    if (option) chips.push(`Compare: ${option.label}`);
  }
  if (actions.categories && actions.categories.length > 0) {
    chips.push(
      `Places: ${actions.categories
        .map((category) => CATEGORY_LABELS[category])
        .join(", ")}`,
    );
  }
  if (actions.cellSizeMeters) {
    chips.push(`Cells: ${actions.cellSizeMeters} m`);
  }
  if (actions.radiusMeters) {
    chips.push(`Reach: ${actions.radiusMeters} m`);
  }
  if (actions.basemap) {
    const label =
      BASEMAPS.find((entry) => entry.id === actions.basemap)?.label ??
      actions.basemap;
    chips.push(`Basemap: ${label}`);
  }
  if (actions.mode) {
    chips.push(`Mode: ${actions.mode === "selection" ? "Selection" : "Normal"}`);
  }

  return chips;
}

function sourceLabel(source: AgentSource): string {
  return source === "gemini"
    ? "Gemini 3.5 Flash Lite"
    : "Quick planner · add GEMINI_API_KEY for AI";
}

export function AgentChat({ context, onApply }: AgentChatProps) {
  const [open, setOpen] = useState(false);
  const [input, setInput] = useState("");
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const nextId = useRef(0);
  const endRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  const mutation = useMutation({
    mutationFn: (query: string) =>
      fetchAgent({ query, context }),
  });

  useEffect(() => {
    if (!open) return;
    endRef.current?.scrollIntoView({ block: "end" });
  }, [open, messages, mutation.isPending]);

  function append(message: ChatMessage) {
    setMessages((current) => [...current, message].slice(-40));
  }

  function submit() {
    const query = input.trim();
    if (query.length < 2 || mutation.isPending) return;

    setInput("");
    setOpen(true);
    append({
      id: (nextId.current += 1),
      role: "user",
      text: query,
    });

    mutation.mutate(query, {
      onSuccess: (response) => {
        append({
          id: (nextId.current += 1),
          role: "assistant",
          text: response.message,
          source: response.source,
          response,
        });
        onApply(response);
      },
      onError: (error) => {
        append({
          id: (nextId.current += 1),
          role: "assistant",
          text:
            error instanceof Error
              ? error.message
              : "The agent could not answer. Try again.",
          error: true,
        });
      },
    });
  }

  function clear() {
    setMessages([]);
    setInput("");
    setOpen(false);
  }

  return (
    <div className="absolute bottom-5 left-1/2 z-30 w-[min(680px,calc(100vw-2rem))] -translate-x-1/2 lg:w-[min(680px,calc(100vw-38rem))]">
      {open && (
        <section
          aria-label="Spero Agent conversation"
          className="mb-2 flex h-[min(60svh,560px)] flex-col overflow-hidden rounded-2xl border bg-popover/95 text-popover-foreground shadow-2xl backdrop-blur supports-[backdrop-filter]:bg-popover/90"
        >
          <header className="flex items-center justify-between gap-3 border-b px-4 py-3">
            <div className="flex min-w-0 items-center gap-2.5">
              <span className="flex size-8 shrink-0 items-center justify-center rounded-lg bg-primary text-primary-foreground shadow-sheen">
                <Sparkles className="size-4" />
              </span>
              <div className="min-w-0">
                <p className="text-sm font-semibold">Spero Agent</p>
                <p className="truncate text-[10px] text-muted-foreground">
                  Turn one sentence into map controls
                </p>
              </div>
            </div>
            <div className="flex items-center gap-1">
              <Button
                variant="ghost"
                size="icon"
                onClick={clear}
                disabled={messages.length === 0 && !mutation.isPending}
                aria-label="Clear agent conversation"
                title="Clear conversation"
              >
                <Trash2 />
              </Button>
              <Button
                variant="ghost"
                size="icon"
                onClick={() => setOpen(false)}
                aria-label="Close agent conversation"
                title="Close"
              >
                <X />
              </Button>
            </div>
          </header>

          <div
            className="thin-scrollbar min-h-0 flex-1 space-y-4 overflow-y-auto px-4 py-4"
            aria-live="polite"
          >
            {messages.map((message) => {
              if (message.role === "user") {
                return (
                  <div key={message.id} className="flex justify-end">
                    <div className="max-w-[86%] rounded-2xl rounded-br-sm bg-primary px-3 py-2 text-sm leading-relaxed text-primary-foreground shadow-sheen">
                      {message.text}
                    </div>
                  </div>
                );
              }

              const chips = message.response
                ? appliedChips(message.response)
                : [];

              return (
                <div key={message.id} className="flex items-start gap-2.5">
                  <span
                    className={cn(
                      "mt-0.5 flex size-7 shrink-0 items-center justify-center rounded-full",
                      message.error
                        ? "bg-destructive/10 text-destructive"
                        : "bg-primary/10 text-primary",
                    )}
                  >
                    <Sparkles className="size-3.5" />
                  </span>
                  <div
                    className={cn(
                      "max-w-[86%] rounded-2xl rounded-bl-sm border px-3 py-2 text-sm leading-relaxed",
                      message.error
                        ? "border-destructive/30 bg-destructive/10 text-destructive"
                        : "bg-muted/45 text-foreground",
                    )}
                  >
                    <p>{message.text}</p>
                    {chips.length > 0 && (
                      <div className="flex flex-wrap gap-1.5 pt-2">
                        {chips.map((chip) => (
                          <span
                            key={chip}
                            className="rounded-full border bg-background/70 px-2 py-0.5 text-[10px] font-medium text-muted-foreground"
                          >
                            {chip}
                          </span>
                        ))}
                      </div>
                    )}
                    {message.source && (
                      <p className="pt-2 text-[9px] text-muted-foreground">
                        {sourceLabel(message.source)}
                      </p>
                    )}
                  </div>
                </div>
              );
            })}

            {mutation.isPending && (
              <div className="flex items-start gap-2.5">
                <span className="mt-0.5 flex size-7 shrink-0 items-center justify-center rounded-full bg-primary/10 text-primary">
                  <Sparkles className="size-3.5" />
                </span>
                <div className="flex items-center gap-2 rounded-2xl rounded-bl-sm border bg-muted/45 px-3 py-2 text-xs text-muted-foreground">
                  <Loader2 className="size-3.5 animate-spin" />
                  Reading the map and choosing controls…
                </div>
              </div>
            )}
            <div ref={endRef} />
          </div>
        </section>
      )}

      <form
        onSubmit={(event) => {
          event.preventDefault();
          submit();
        }}
        className="rounded-2xl border bg-card/95 p-1.5 shadow-2xl backdrop-blur supports-[backdrop-filter]:bg-card/90"
      >
        <div className="flex items-center gap-2">
          <div className="relative min-w-0 flex-1">
            <Sparkles className="pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 text-muted-foreground" />
            <input
              ref={inputRef}
              value={input}
              onChange={(event) => setInput(event.target.value)}
              onFocus={() => {
                if (messages.length > 0) setOpen(true);
              }}
              onKeyDown={(event) => {
                if (event.key === "Escape") setOpen(false);
              }}
              placeholder="Ask Spero: I want to start a gym in this area…"
              aria-label="Ask the Spero agent about an area or business"
              autoComplete="off"
              spellCheck={false}
              className="h-12 w-full rounded-xl border-0 bg-transparent pr-3 pl-9 text-sm text-foreground shadow-none outline-none placeholder:text-muted-foreground focus-visible:ring-0"
            />
          </div>
          <Button
            type="submit"
            size="icon"
            className="size-10 rounded-xl"
            disabled={input.trim().length < 2 || mutation.isPending}
            aria-label="Send to Spero Agent"
            title="Send"
          >
            {mutation.isPending ? (
              <Loader2 className="animate-spin" />
            ) : (
              <ArrowUp />
            )}
          </Button>
        </div>
        <div className="flex items-center justify-between px-2 pt-0.5 pb-0.5 text-[10px] text-muted-foreground">
          <span>Agent can move the map, compare a business, and change controls</span>
          <span className="hidden sm:inline">Enter to send</span>
        </div>
      </form>
    </div>
  );
}
