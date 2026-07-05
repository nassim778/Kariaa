"use client";

import { useEffect, useRef } from "react";
import maplibregl, { Map as MLMap, Marker } from "maplibre-gl";
import "maplibre-gl/dist/maplibre-gl.css";

const STYLE: maplibregl.StyleSpecification = {
  version: 8,
  sources: {
    basemap: {
      type: "raster",
      tiles: [
        "https://a.basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}.png",
        "https://b.basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}.png",
        "https://c.basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}.png",
      ],
      tileSize: 256,
      attribution: "© OpenStreetMap · © CARTO",
    },
  },
  layers: [
    { id: "bg", type: "background", paint: { "background-color": "#e8eef2" } },
    { id: "basemap", type: "raster", source: "basemap" },
  ],
};

interface Props {
  lat: number;
  lng: number;
  onChange: (lng: number, lat: number) => void;
}

/** Compact map with a draggable marker to fine-tune a listing's location. */
export default function MiniMapPicker({ lat, lng, onChange }: Props) {
  const containerRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<MLMap | null>(null);
  const markerRef = useRef<Marker | null>(null);
  const onChangeRef = useRef(onChange);
  onChangeRef.current = onChange;

  useEffect(() => {
    if (!containerRef.current || mapRef.current) return;
    const map = new maplibregl.Map({
      container: containerRef.current,
      style: STYLE,
      center: [lng, lat],
      zoom: 15,
      attributionControl: false,
    });
    mapRef.current = map;
    map.addControl(new maplibregl.NavigationControl({ showCompass: false }), "top-right");

    const el = document.createElement("div");
    el.className = "karia-poi-marker";
    const marker = new maplibregl.Marker({ element: el, draggable: true })
      .setLngLat([lng, lat])
      .addTo(map);
    markerRef.current = marker;

    marker.on("dragend", () => {
      const p = marker.getLngLat();
      onChangeRef.current(p.lng, p.lat);
    });

    // Click on the map moves the marker there too.
    map.on("click", (e) => {
      marker.setLngLat(e.lngLat);
      onChangeRef.current(e.lngLat.lng, e.lngLat.lat);
    });

    setTimeout(() => map.resize(), 100);

    return () => {
      map.remove();
      mapRef.current = null;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Keep the marker in sync if the location changes from outside.
  useEffect(() => {
    const marker = markerRef.current;
    const map = mapRef.current;
    if (!marker || !map) return;
    const cur = marker.getLngLat();
    if (Math.abs(cur.lng - lng) > 1e-7 || Math.abs(cur.lat - lat) > 1e-7) {
      marker.setLngLat([lng, lat]);
      map.easeTo({ center: [lng, lat], duration: 300 });
    }
  }, [lat, lng]);

  return (
    <div
      ref={containerRef}
      className="h-40 w-full overflow-hidden rounded-lg border border-slate-200"
    />
  );
}
