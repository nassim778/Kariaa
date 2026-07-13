import { describe, expect, it } from "vitest";
import {
  geocodeQuerySchema,
  listingsQuerySchema,
  reverseGeocodeQuerySchema,
} from "./validation";

describe("listingsQuerySchema", () => {
  it("accepts a valid bbox query", () => {
    const r = listingsQuerySchema.safeParse({
      minLng: "10",
      minLat: "36",
      maxLng: "11",
      maxLat: "37",
      types: "apartment,villa",
    });
    expect(r.success).toBe(true);
    if (r.success) {
      expect(r.data.types).toEqual(["apartment", "villa"]);
      expect(r.data.minLng).toBe(10);
    }
  });

  it("rejects inverted bbox", () => {
    const r = listingsQuerySchema.safeParse({
      minLng: "11",
      minLat: "36",
      maxLng: "10",
      maxLat: "37",
    });
    expect(r.success).toBe(false);
  });

  it("rejects invalid property type", () => {
    const r = listingsQuerySchema.safeParse({ types: "castle" });
    expect(r.success).toBe(false);
  });
});

describe("geocodeQuerySchema", () => {
  it("requires non-empty q", () => {
    expect(geocodeQuerySchema.safeParse({ q: "  " }).success).toBe(false);
    expect(geocodeQuerySchema.safeParse({ q: "La Marsa" }).success).toBe(true);
  });
});

describe("reverseGeocodeQuerySchema", () => {
  it("validates lat/lng", () => {
    expect(
      reverseGeocodeQuerySchema.safeParse({ lat: "36.8", lng: "10.2" }).success
    ).toBe(true);
    expect(
      reverseGeocodeQuerySchema.safeParse({ lat: "120", lng: "10" }).success
    ).toBe(false);
  });
});
