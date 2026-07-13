"use client";

import { useEffect, useRef } from "react";
import maplibregl, { Map as MLMap, Marker } from "maplibre-gl";
import "maplibre-gl/dist/maplibre-gl.css";
import { BBox, GeoPlace, Listing, sizeLabel } from "@/lib/types";

export type BasemapId = "voyager" | "osm" | "positron" | "satellite";

interface BasemapDef {
  label: string;
  tiles: string[];
  attribution: string;
  maxzoom?: number;
}

export const BASEMAPS: Record<BasemapId, BasemapDef> = {
  voyager: {
    label: "Plan",
    tiles: [
      "https://a.basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}.png",
      "https://b.basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}.png",
      "https://c.basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}.png",
      "https://d.basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}.png",
    ],
    attribution:
      '© <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> · © <a href="https://carto.com/attributions">CARTO</a>',
  },
  osm: {
    label: "OSM",
    tiles: [
      "https://a.tile.openstreetmap.org/{z}/{x}/{y}.png",
      "https://b.tile.openstreetmap.org/{z}/{x}/{y}.png",
      "https://c.tile.openstreetmap.org/{z}/{x}/{y}.png",
    ],
    attribution: '© <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>',
  },
  positron: {
    label: "Clair",
    tiles: [
      "https://a.basemaps.cartocdn.com/light_all/{z}/{x}/{y}.png",
      "https://b.basemaps.cartocdn.com/light_all/{z}/{x}/{y}.png",
      "https://c.basemaps.cartocdn.com/light_all/{z}/{x}/{y}.png",
      "https://d.basemaps.cartocdn.com/light_all/{z}/{x}/{y}.png",
    ],
    attribution:
      '© <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> · © <a href="https://carto.com/attributions">CARTO</a>',
  },
  satellite: {
    label: "Satellite",
    tiles: [
      "https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}",
    ],
    attribution: "Imagery © Esri, Maxar, Earthstar Geographics",
    maxzoom: 19,
  },
};

function buildStyle(id: BasemapId): maplibregl.StyleSpecification {
  const b = BASEMAPS[id];
  return {
    version: 8,
    sources: {
      basemap: {
        type: "raster",
        tiles: b.tiles,
        tileSize: 256,
        maxzoom: b.maxzoom ?? 20,
        attribution: b.attribution,
      },
    },
    layers: [
      // Solid background so the map area is never blank while tiles load.
      { id: "bg", type: "background", paint: { "background-color": "#e8eef2" } },
      { id: "basemap", type: "raster", source: "basemap" },
    ],
  };
}

// Grand Tunis default view.
const DEFAULT_CENTER: [number, number] = [10.18, 36.83];
const DEFAULT_ZOOM = 11;

function circlePolygon(lng: number, lat: number, radiusM: number, steps = 72) {
  const coords: [number, number][] = [];
  const earth = 6371000;
  const latR = (radiusM / earth) * (180 / Math.PI);
  const lngR = latR / Math.cos((lat * Math.PI) / 180);
  for (let i = 0; i <= steps; i++) {
    const theta = (i / steps) * 2 * Math.PI;
    coords.push([lng + lngR * Math.cos(theta), lat + latR * Math.sin(theta)]);
  }
  return {
    type: "FeatureCollection",
    features: [
      {
        type: "Feature",
        properties: {},
        geometry: { type: "Polygon", coordinates: [coords] },
      },
    ],
  } as GeoJSON.FeatureCollection;
}

interface Props {
  listings: Listing[];
  activeId: string | null;
  poi: GeoPlace | null;
  radiusM: number;
  basemap: BasemapId;
  pickMode: boolean;
  onActiveChange: (id: string | null) => void;
  onListingClick: (id: string) => void;
  onBBoxChange: (bbox: BBox) => void;
  onMapPick: (lng: number, lat: number) => void;
}

export default function MapView({
  listings,
  activeId,
  poi,
  radiusM,
  basemap,
  pickMode,
  onActiveChange,
  onListingClick,
  onBBoxChange,
  onMapPick,
}: Props) {
  const containerRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<MLMap | null>(null);
  const markersRef = useRef<globalThis.Map<string, Marker>>(new Map());
  const poiMarkerRef = useRef<Marker | null>(null);
  const onBBoxRef = useRef(onBBoxChange);
  const onActiveRef = useRef(onActiveChange);
  const onListingClickRef = useRef(onListingClick);
  const pickModeRef = useRef(pickMode);
  const onMapPickRef = useRef(onMapPick);
  onBBoxRef.current = onBBoxChange;
  onActiveRef.current = onActiveChange;
  onListingClickRef.current = onListingClick;
  pickModeRef.current = pickMode;
  onMapPickRef.current = onMapPick;

  // --- init map ---------------------------------------------------------
  useEffect(() => {
    if (!containerRef.current || mapRef.current) return;
    const map = new maplibregl.Map({
      container: containerRef.current,
      style: buildStyle(basemap),
      center: DEFAULT_CENTER,
      zoom: DEFAULT_ZOOM,
      attributionControl: { compact: true },
    });
    mapRef.current = map;

    map.addControl(new maplibregl.NavigationControl({ showCompass: false }), "bottom-right");
    map.addControl(
      new maplibregl.GeolocateControl({
        positionOptions: { enableHighAccuracy: true },
        trackUserLocation: true,
      }),
      "bottom-right"
    );

    const emitBBox = () => {
      const b = map.getBounds();
      onBBoxRef.current({
        minLng: b.getWest(),
        minLat: b.getSouth(),
        maxLng: b.getEast(),
        maxLat: b.getNorth(),
      });
    };

    // Surface any tile/style errors in the console for debugging.
    map.on("error", (e) => console.error("MapLibre error:", e?.error || e));

    map.on("load", () => {
      // Ensure the canvas matches the (now fully laid-out) container.
      map.resize();
      map.addSource("radius", {
        type: "geojson",
        data: { type: "FeatureCollection", features: [] },
      });
      map.addLayer({
        id: "radius-fill",
        type: "fill",
        source: "radius",
        paint: { "fill-color": "#2563eb", "fill-opacity": 0.08 },
      });
      map.addLayer({
        id: "radius-line",
        type: "line",
        source: "radius",
        paint: { "line-color": "#2563eb", "line-width": 2, "line-dasharray": [2, 2] },
      });
      emitBBox();
    });

    map.on("moveend", emitBBox);

    // Click-to-place: in pick mode, a map click drops the radius point there.
    map.on("click", (e) => {
      if (pickModeRef.current) {
        onMapPickRef.current(e.lngLat.lng, e.lngLat.lat);
      }
    });

    // Keep the map sized to its container (fixes blank map after mount).
    const ro = new ResizeObserver(() => map.resize());
    ro.observe(containerRef.current);
    // A couple of delayed resizes catch the dynamic-import mount transition.
    const t1 = setTimeout(() => map.resize(), 150);
    const t2 = setTimeout(() => map.resize(), 600);

    return () => {
      ro.disconnect();
      clearTimeout(t1);
      clearTimeout(t2);
      map.remove();
      mapRef.current = null;
    };
  }, []);

  // --- render listing markers ------------------------------------------
  useEffect(() => {
    const map = mapRef.current;
    if (!map) return;
    const existing = markersRef.current;
    const nextIds = new Set(listings.map((l) => l.id));

    // Remove markers no longer present.
    for (const [id, marker] of existing) {
      if (!nextIds.has(id)) {
        marker.remove();
        existing.delete(id);
      }
    }

    // Add / update markers.
    for (const l of listings) {
      let marker = existing.get(l.id);
      if (!marker) {
        const el = document.createElement("div");
        el.className = "karia-marker";
        el.textContent = sizeLabel(l);
        el.addEventListener("click", (e) => {
          e.stopPropagation();
          onActiveRef.current(l.id);
          onListingClickRef.current(l.id);
        });

        marker = new maplibregl.Marker({ element: el, anchor: "bottom" })
          .setLngLat([l.lng, l.lat])
          .addTo(map);
        existing.set(l.id, marker);
      } else {
        marker.setLngLat([l.lng, l.lat]);
        marker.getElement().textContent = sizeLabel(l);
      }
    }
  }, [listings]);

  // --- highlight active marker -----------------------------------------
  useEffect(() => {
    for (const [id, m] of markersRef.current) {
      m.getElement().classList.toggle("is-active", id === activeId);
    }
  }, [activeId]);

  // --- crosshair cursor while in "pick a point" mode --------------------
  useEffect(() => {
    const map = mapRef.current;
    if (!map) return;
    map.getCanvas().style.cursor = pickMode ? "crosshair" : "";
  }, [pickMode]);

  // --- POI marker + radius circle --------------------------------------
  useEffect(() => {
    const map = mapRef.current;
    if (!map) return;

    const draw = () => {
      const src = map.getSource("radius") as maplibregl.GeoJSONSource | undefined;
      if (poi) {
        if (src) src.setData(circlePolygon(poi.lng, poi.lat, radiusM));
        if (!poiMarkerRef.current) {
          const el = document.createElement("div");
          el.className = "karia-poi-marker";
          poiMarkerRef.current = new maplibregl.Marker({ element: el }).setLngLat([
            poi.lng,
            poi.lat,
          ]);
          poiMarkerRef.current.addTo(map);
        } else {
          poiMarkerRef.current.setLngLat([poi.lng, poi.lat]);
        }
        // Fit the circle in view — unless the point was placed on the map
        // (fit === false), in which case we leave the camera where it is.
        if (poi.fit !== false) {
          const latR = (radiusM / 6371000) * (180 / Math.PI);
          const lngR = latR / Math.cos((poi.lat * Math.PI) / 180);
          map.fitBounds(
            [
              [poi.lng - lngR, poi.lat - latR],
              [poi.lng + lngR, poi.lat + latR],
            ],
            { padding: 80, duration: 700 }
          );
        }
      } else {
        if (src) src.setData({ type: "FeatureCollection", features: [] });
        poiMarkerRef.current?.remove();
        poiMarkerRef.current = null;
      }
    };

    if (map.isStyleLoaded()) draw();
    else map.once("load", draw);
  }, [poi, radiusM]);

  // --- swap basemap tiles without touching markers / radius -------------
  const firstBasemap = useRef(true);
  useEffect(() => {
    const map = mapRef.current;
    if (!map) return;
    if (firstBasemap.current) {
      firstBasemap.current = false;
      return; // initial style already set in constructor
    }
    const apply = () => {
      const b = BASEMAPS[basemap];
      if (map.getLayer("basemap")) map.removeLayer("basemap");
      if (map.getSource("basemap")) map.removeSource("basemap");
      map.addSource("basemap", {
        type: "raster",
        tiles: b.tiles,
        tileSize: 256,
        maxzoom: b.maxzoom ?? 20,
        attribution: b.attribution,
      });
      // Insert just above the background, below radius/markers.
      const beforeId = map.getLayer("radius-fill") ? "radius-fill" : undefined;
      map.addLayer(
        { id: "basemap", type: "raster", source: "basemap" },
        beforeId
      );
    };
    if (map.isStyleLoaded()) apply();
    else map.once("idle", apply);
  }, [basemap]);

  return <div ref={containerRef} className="absolute inset-0 h-full w-full" />;
}
