import {
  Clock,
  ExternalLink,
  Globe,
  MapPin,
  Phone,
  type LucideIcon,
} from "lucide-react";
import { Button } from "../../components/ui/button";
import { cn } from "../../lib/utils";
import {
  formatDistance,
  googleMapsUrl,
  type PlaceCardData,
} from "./place-format";

interface PlaceCardProps {
  place: PlaceCardData;
  icon: LucideIcon;
  accentColor: string;
  highlighted?: boolean;
}

function humanize(value: string): string {
  return value
    .replace(/[_-]+/g, " ")
    .replace(/\b\w/g, (character) => character.toUpperCase());
}

function categoryLabel(rawCategory: string | null): string | null {
  if (!rawCategory) return null;

  if (rawCategory.includes("=")) {
    const [, value] = rawCategory.split("=");
    return value ? humanize(value) : null;
  }

  const last = rawCategory.split(".").at(-1);
  return last ? humanize(last) : null;
}

function websiteHref(website: string): string {
  return /^https?:\/\//i.test(website) ? website : `https://${website}`;
}

function websiteLabel(website: string): string {
  try {
    return new URL(websiteHref(website)).hostname.replace(/^www\./i, "");
  } catch {
    return website;
  }
}

export function PlaceCard({
  place,
  icon: Icon,
  accentColor,
  highlighted = false,
}: PlaceCardProps) {
  const name = place.name?.trim() || "Unnamed place";
  const category = categoryLabel(place.rawCategory);
  const phoneHref = place.phone
    ? `tel:${place.phone.replace(/[^\d+]/g, "")}`
    : null;

  return (
    <article
      id={`place-card-${place.id}`}
      className={cn(
        "rounded-md border bg-card p-2 text-xs shadow-ace",
        highlighted && "ring-2 ring-fuchsia-500/70",
      )}
    >
      <div className="flex items-start gap-2">
        <span
          className="mt-0.5 flex size-6 shrink-0 items-center justify-center rounded-full text-white"
          style={{ backgroundColor: accentColor }}
        >
          <Icon className="size-3.5" />
        </span>
        <div className="min-w-0 flex-1">
          <div className="flex items-start justify-between gap-1">
            <h4 className="min-w-0 break-words font-medium leading-snug">
              {name}
            </h4>
            <span className="shrink-0 rounded bg-secondary px-1 py-0.5 text-[10px] text-muted-foreground">
              {formatDistance(place.distanceMeters)}
            </span>
          </div>
          {category && (
            <p className="mt-0.5 text-[10px] tracking-wide text-muted-foreground uppercase">
              {category}
            </p>
          )}
        </div>
      </div>

      <div className="mt-2 space-y-1 text-[11px] text-muted-foreground">
        {place.address && (
          <p className="flex items-start gap-1.5">
            <MapPin className="mt-0.5 size-3 shrink-0" />
            <span className="break-words">{place.address}</span>
          </p>
        )}
        {place.phone && phoneHref && (
          <a
            className="flex items-center gap-1.5 hover:text-foreground"
            href={phoneHref}
          >
            <Phone className="size-3 shrink-0" />
            <span className="truncate">{place.phone}</span>
          </a>
        )}
        {place.website && (
          <a
            className="flex items-center gap-1.5 hover:text-foreground"
            href={websiteHref(place.website)}
            target="_blank"
            rel="noreferrer"
            title={place.website}
          >
            <Globe className="size-3 shrink-0" />
            <span className="truncate">{websiteLabel(place.website)}</span>
          </a>
        )}
        {place.openingHours && (
          <p className="flex items-start gap-1.5">
            <Clock className="mt-0.5 size-3 shrink-0" />
            <span className="break-words">{place.openingHours}</span>
          </p>
        )}
      </div>

      <Button
        asChild
        variant="outline"
        size="sm"
        className="mt-2 w-full text-[11px]"
      >
        <a
          href={googleMapsUrl(place.name, place.latitude, place.longitude)}
          target="_blank"
          rel="noreferrer"
        >
          <ExternalLink className="size-3" />
          Open in Google Maps
        </a>
      </Button>
    </article>
  );
}
