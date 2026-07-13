export type BasemapId = "voyager" | "osm" | "positron" | "satellite";

export interface BasemapDef {
  id: BasemapId;
  tiles: string[];
  attribution: string;
  maxzoom?: number;
}

export const BASEMAPS: Record<BasemapId, BasemapDef> = {
  voyager: {
    id: "voyager",
    tiles: [
      "https://a.basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}.png",
      "https://b.basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}.png",
      "https://c.basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}.png",
      "https://d.basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}.png",
    ],
    attribution: "© OpenStreetMap · © CARTO",
  },
  osm: {
    id: "osm",
    tiles: [
      "https://a.tile.openstreetmap.org/{z}/{x}/{y}.png",
      "https://b.tile.openstreetmap.org/{z}/{x}/{y}.png",
      "https://c.tile.openstreetmap.org/{z}/{x}/{y}.png",
    ],
    attribution: "© OpenStreetMap",
  },
  positron: {
    id: "positron",
    tiles: [
      "https://a.basemaps.cartocdn.com/light_all/{z}/{x}/{y}.png",
      "https://b.basemaps.cartocdn.com/light_all/{z}/{x}/{y}.png",
      "https://c.basemaps.cartocdn.com/light_all/{z}/{x}/{y}.png",
      "https://d.basemaps.cartocdn.com/light_all/{z}/{x}/{y}.png",
    ],
    attribution: "© OpenStreetMap · © CARTO",
  },
  satellite: {
    id: "satellite",
    tiles: [
      "https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}",
    ],
    attribution: "Imagery © Esri, Maxar, Earthstar Geographics",
    maxzoom: 19,
  },
};

export const BASEMAP_IDS = Object.keys(BASEMAPS) as BasemapId[];

/** Build a MapLibre raster style JSON for a given basemap. */
export function buildRasterStyle(id: BasemapId) {
  const b = BASEMAPS[id];
  return {
    version: 8 as const,
    sources: {
      basemap: {
        type: "raster" as const,
        tiles: b.tiles,
        tileSize: 256,
        maxzoom: b.maxzoom ?? 20,
        attribution: b.attribution,
      },
    },
    layers: [
      {
        id: "bg",
        type: "background" as const,
        paint: { "background-color": "#e8eef2" },
      },
      { id: "basemap", type: "raster" as const, source: "basemap" },
    ],
  };
}

/** Grand Tunis default view. */
export const DEFAULT_CENTER: [number, number] = [10.18, 36.83]; // [lng, lat]
export const DEFAULT_ZOOM = 11;

/** Radius search options, metres. */
export const RADII = [1000, 2000, 5000, 10000];
export const DEFAULT_RADIUS_M = 2000;

/** GeoJSON polygon approximating a circle of `radiusM` around a point. */
export function circlePolygon(
  lng: number,
  lat: number,
  radiusM: number,
  steps = 72
) {
  const coords: [number, number][] = [];
  const earth = 6371000;
  const latR = (radiusM / earth) * (180 / Math.PI);
  const lngR = latR / Math.cos((lat * Math.PI) / 180);
  for (let i = 0; i <= steps; i++) {
    const theta = (i / steps) * 2 * Math.PI;
    coords.push([lng + lngR * Math.cos(theta), lat + latR * Math.sin(theta)]);
  }
  return {
    type: "FeatureCollection" as const,
    features: [
      {
        type: "Feature" as const,
        properties: {},
        geometry: { type: "Polygon" as const, coordinates: [coords] },
      },
    ],
  };
}
