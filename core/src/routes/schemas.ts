import { z } from "zod";
import {
  BASEMAP_IDS,
  CUSTOM_BUSINESS_LABEL_MAX_LENGTH,
  CUSTOM_BUSINESS_TYPE,
  isBusinessTypeId,
  isBusinessTypeKey,
  POI_CATEGORIES,
  SELECTION_MODES,
  type Bbox,
  type BusinessTypeId,
  type BusinessTypeKey,
  type PoiCategory,
} from "@spero/shared";
import {
  DEFAULT_CELL_SIZE_M,
  DEFAULT_RADIUS_M,
  MAX_BBOX_SPAN_M,
  MAX_CELL_SIZE_M,
  MAX_RADIUS_M,
  MIN_CELL_SIZE_M,
  MIN_RADIUS_M,
} from "../config/scoring";
import { AGENT_MAX_QUERY_LENGTH } from "../config/agent";
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

const businessSelectionTypeSchema = z.custom<BusinessTypeKey>(
  (value) => typeof value === "string" && isBusinessTypeKey(value),
  { message: "unknown business type" },
);

export const placesQuerySchema = z
  .object({
    bbox: bboxSchema,
    type: businessSelectionTypeSchema,
    label: z
      .string()
      .trim()
      .min(2, "custom business needs at least two characters")
      .max(
        CUSTOM_BUSINESS_LABEL_MAX_LENGTH,
        "custom business label is too long",
      )
      .optional(),
  })
  .superRefine((value, ctx) => {
    if (value.type === CUSTOM_BUSINESS_TYPE && !value.label) {
      ctx.addIssue({
        code: "custom",
        message: "custom business needs a label",
        path: ["label"],
      });
    }
  });

export const geocodeQuerySchema = z.object({
  q: z
    .string()
    .trim()
    .min(2, "search needs at least two characters")
    .max(160, "search is too long"),
  limit: z.coerce.number().int().min(1).max(8).default(5),
});

const agentBboxSchema = z
  .object({
    minLng: z.number().min(-180).max(180),
    minLat: z.number().min(-90).max(90),
    maxLng: z.number().min(-180).max(180),
    maxLat: z.number().min(-90).max(90),
  })
  .refine(
    (bbox) => bbox.minLng < bbox.maxLng && bbox.minLat < bbox.maxLat,
    { message: "bbox must satisfy minLng < maxLng and minLat < maxLat" },
  );

export const agentContextSchema = z.object({
  bbox: agentBboxSchema.nullable(),
  zoom: z.number().min(0).max(24),
  selectedCell: z
    .object({
      centerLng: z.number().min(-180).max(180),
      centerLat: z.number().min(-90).max(90),
      score: z.number().min(0).max(100),
    })
    .nullable(),
  businessType: z
    .custom<BusinessTypeId>(
      (value) => typeof value === "string" && isBusinessTypeId(value),
      { message: "unknown business type" },
    )
    .nullable(),
  customBusinessLabel: z
    .string()
    .trim()
    .max(CUSTOM_BUSINESS_LABEL_MAX_LENGTH)
    .nullable()
    .default(null),
  cellSize: z.number().int().min(MIN_CELL_SIZE_M).max(MAX_CELL_SIZE_M),
  radius: z.number().int().min(MIN_RADIUS_M).max(MAX_RADIUS_M),
  enabledCategories: z
    .array(z.enum(POI_CATEGORIES))
    .max(POI_CATEGORIES.length),
  basemap: z.enum(BASEMAP_IDS),
  mode: z.enum(SELECTION_MODES),
});

export const agentRequestSchema = z.object({
  query: z
    .string()
    .trim()
    .min(2, "agent needs at least two characters")
    .max(AGENT_MAX_QUERY_LENGTH, "agent query is too long"),
  context: agentContextSchema,
});

export type HotzonesQuery = z.infer<typeof hotzonesQuerySchema>;
export type PoisQuery = z.infer<typeof poisQuerySchema>;
export type PlacesQuery = z.infer<typeof placesQuerySchema>;
export type GeocodeQuery = z.infer<typeof geocodeQuerySchema>;
export type AgentRequest = z.infer<typeof agentRequestSchema>;
