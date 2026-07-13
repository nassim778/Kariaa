import { z } from "zod";

const PROPERTY_TYPES = [
  "apartment",
  "house",
  "studio",
  "villa",
  "room",
  "office",
] as const;

export const listingsQuerySchema = z
  .object({
    minPrice: z.coerce.number().min(0).optional(),
    maxPrice: z.coerce.number().min(0).optional(),
    minBeds: z.coerce.number().int().min(0).max(20).optional(),
    types: z
      .string()
      .optional()
      .transform((v) =>
        v
          ? v
              .split(",")
              .map((s) => s.trim())
              .filter(Boolean)
          : undefined
      )
      .pipe(z.array(z.enum(PROPERTY_TYPES)).optional()),
    centerLng: z.coerce.number().min(-180).max(180).optional(),
    centerLat: z.coerce.number().min(-90).max(90).optional(),
    radius: z.coerce.number().min(50).max(100_000).optional(),
    minLng: z.coerce.number().min(-180).max(180).optional(),
    minLat: z.coerce.number().min(-90).max(90).optional(),
    maxLng: z.coerce.number().min(-180).max(180).optional(),
    maxLat: z.coerce.number().min(-90).max(90).optional(),
  })
  .superRefine((v, ctx) => {
    const hasCenter =
      v.centerLng !== undefined &&
      v.centerLat !== undefined &&
      v.radius !== undefined;
    const hasBBox =
      v.minLng !== undefined &&
      v.minLat !== undefined &&
      v.maxLng !== undefined &&
      v.maxLat !== undefined;
    if (hasBBox && (v.minLng! >= v.maxLng! || v.minLat! >= v.maxLat!)) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: "Invalid bounding box",
      });
    }
    if (
      v.minPrice !== undefined &&
      v.maxPrice !== undefined &&
      v.minPrice > v.maxPrice
    ) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: "minPrice cannot exceed maxPrice",
      });
    }
    void hasCenter;
  });

export const geocodeQuerySchema = z.object({
  q: z.string().trim().min(1).max(200),
  lang: z.enum(["fr", "en", "tn", "ar"]).optional(),
});

export const reverseGeocodeQuerySchema = z.object({
  lat: z.coerce.number().min(-90).max(90),
  lng: z.coerce.number().min(-180).max(180),
  lang: z.enum(["fr", "en", "tn", "ar"]).optional(),
});

export type ListingsQuery = z.infer<typeof listingsQuerySchema>;
