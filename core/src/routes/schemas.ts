import { z } from "zod";
import { POI_CATEGORIES, type Bbox, type PoiCategory } from "@spero/shared";
import {
  DEFAULT_CELL_SIZE_M,
  DEFAULT_RADIUS_M,
  MAX_BBOX_SPAN_M,
  MAX_CELL_SIZE_M,
  MAX_RADIUS_M,
  MIN_CELL_SIZE_M,
  MIN_RADIUS_M,
} from "../config/scoring";
import { bboxSpanMeters } from "../lib/geo";

const CATEGORY_SET = new Set<string>(POI_CATEGORIES);

const bboxSchema = z
  .string()
  .transform((value, ctx): Bbox => {
    const parts = value.split(",").map((part) => Number.parseFloat(part.trim()));

    if (parts.length !== 4 || parts.some((part) => !Number.isFinite(part))) {
      ctx.addIssue({
        code: "custom",
        message:
          "bbox must be four comma-separated numbers: minLng,minLat,maxLng,maxLat",
      });
      return z.NEVER;
    }

    const [minLng, minLat, maxLng, maxLat] = parts as [
      number,
      number,
      number,
      number,
    ];

    if (minLng < -180 || maxLng > 180 || minLat < -90 || maxLat > 90) {
      ctx.addIssue({
        code: "custom",
        message: "bbox coordinates are out of range",
      });
      return z.NEVER;
    }

    if (minLng >= maxLng || minLat >= maxLat) {
      ctx.addIssue({
        code: "custom",
        message: "bbox must satisfy minLng < maxLng and minLat < maxLat",
      });
      return z.NEVER;
    }

    return { minLng, minLat, maxLng, maxLat };
  })
  .refine((bbox) => bboxSpanMeters(bbox) <= MAX_BBOX_SPAN_M, {
    message: `bbox is too large, keep the area within about ${MAX_BBOX_SPAN_M / 1000} km`,
  });

export const hotzonesQuerySchema = z.object({
  bbox: bboxSchema,
  cell: z.coerce
    .number()
    .min(MIN_CELL_SIZE_M)
    .max(MAX_CELL_SIZE_M)
    .default(DEFAULT_CELL_SIZE_M),
  radius: z.coerce
    .number()
    .min(MIN_RADIUS_M)
    .max(MAX_RADIUS_M)
    .default(DEFAULT_RADIUS_M),
});

export const poisQuerySchema = z
  .object({
    bbox: bboxSchema,
    categories: z.string().optional(),
  })
  .transform((query, ctx): { bbox: Bbox; categories: PoiCategory[] } => {
    if (query.categories === undefined) {
      return { bbox: query.bbox, categories: [...POI_CATEGORIES] };
    }

    const requested = query.categories
      .split(",")
      .map((category) => category.trim())
      .filter(Boolean);

    const invalid = requested.filter((category) => !CATEGORY_SET.has(category));
    if (invalid.length > 0) {
      ctx.addIssue({
        code: "custom",
        message: `unknown categories: ${invalid.join(", ")}`,
      });
      return z.NEVER;
    }

    return { bbox: query.bbox, categories: requested as PoiCategory[] };
  });

export type HotzonesQuery = z.infer<typeof hotzonesQuerySchema>;
export type PoisQuery = z.infer<typeof poisQuerySchema>;
