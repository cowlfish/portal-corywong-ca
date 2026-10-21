"use client";

import { useEffect, useRef, useState } from "react";
import type { Map as LeafletMap, LayerGroup } from "leaflet";

interface MapListing {
  id: string;
  mlsNumber: string;
  listPrice: string | number;
  latitude: string | number | null;
  longitude: string | number | null;
  streetNumber: string | null;
  streetName: string | null;
  city: string | null;
  bedrooms: number | null;
  bathrooms: number | null;
  transactionType?: string | null;
}

interface Props {
  listings: MapListing[];
  onBoundsChange?: (bounds: string) => void;
  // The map fits itself to the listings once per distinct key (e.g. when filters change),
  // not on every update: results reload as the map moves, and refitting would loop.
  fitKey?: string;
  zoom?: number;
}

function formatPrice(price: string | number): string {
  const n = typeof price === "string" ? parseFloat(price) : price;
  if (n >= 1_000_000) return `$${(n / 1_000_000).toFixed(1)}M`;
  if (n >= 1000) return `$${(n / 1000).toFixed(0)}K`;
  return `$${n}`;
}

function escapeHtml(s: string): string {
  return s.replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[c]!);
}

export default function ListingMap({ listings, onBoundsChange, fitKey = "", zoom }: Props) {
  const containerRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<LeafletMap | null>(null);
  const markersRef = useRef<LayerGroup | null>(null);
  const leafletRef = useRef<typeof import("leaflet") | null>(null);
  const fittedKey = useRef<string | null>(null);
  // Latest callback without re-creating the map when the parent re-renders
  const onBoundsRef = useRef(onBoundsChange);
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    onBoundsRef.current = onBoundsChange;
  }, [onBoundsChange]);

  // Create the map once
  useEffect(() => {
    if (!containerRef.current || mapRef.current) return;
    let cancelled = false;
    let resizeObserver: ResizeObserver | undefined;
    let moveTimer: ReturnType<typeof setTimeout> | undefined;

    (async () => {
      const L = await import("leaflet");
      await import("leaflet/dist/leaflet.css");
      if (cancelled || !containerRef.current) return;

      const map = L.map(containerRef.current, { center: [43.6532, -79.3832], zoom: zoom ?? 11, zoomControl: true });
      L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
        attribution:
          '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>' +
          ' · Locations by postal code: <a href="https://www.geonames.org">GeoNames</a> (CC BY 4.0)',
        maxZoom: 19,
      }).addTo(map);

      leafletRef.current = L;
      markersRef.current = L.layerGroup().addTo(map);
      mapRef.current = map;

      map.on("moveend", () => {
        clearTimeout(moveTimer);
        moveTimer = setTimeout(() => {
          const b = map.getBounds();
          onBoundsRef.current?.(`${b.getSouth()},${b.getWest()},${b.getNorth()},${b.getEast()}`);
        }, 300);
      });

      // Leaflet measures its container once; re-measure when the layout settles or changes
      resizeObserver = new ResizeObserver(() => map.invalidateSize());
      resizeObserver.observe(containerRef.current);
      setLoaded(true);
    })();

    return () => {
      cancelled = true;
      clearTimeout(moveTimer);
      resizeObserver?.disconnect();
      mapRef.current?.remove();
      mapRef.current = null;
      markersRef.current = null;
    };
  }, [zoom]);

  // Draw pins
  useEffect(() => {
    const L = leafletRef.current;
    const map = mapRef.current;
    const layer = markersRef.current;
    if (!loaded || !L || !map || !layer) return;

    layer.clearLayers();
    const icon = L.divIcon({ className: "custom-marker", html: "", iconSize: [12, 12] });
    const points: [number, number][] = [];

    for (const l of listings) {
      if (l.latitude == null || l.longitude == null) continue;
      const lat = Number(l.latitude);
      const lng = Number(l.longitude);
      points.push([lat, lng]);

      const addr = [l.streetNumber, l.streetName].filter(Boolean).join(" ");
      const lease = l.transactionType?.includes("Lease");
      L.marker([lat, lng], { icon })
        .bindPopup(
          `<div class="text-sm">
            <div class="font-bold">${formatPrice(l.listPrice)}${lease ? "/mo" : ""}</div>
            <div>${escapeHtml(addr || "Address unavailable")}</div>
            <div class="text-slate-500">${escapeHtml(l.city || "")}</div>
            ${l.bedrooms ? `<div>${l.bedrooms} bed / ${l.bathrooms || 0} bath</div>` : ""}
            <a href="/listings/${encodeURIComponent(l.mlsNumber)}" class="text-blue-600 text-xs">View details</a>
          </div>`
        )
        .addTo(layer);
    }

    if (points.length > 0 && fittedKey.current !== fitKey) {
      fittedKey.current = fitKey;
      map.fitBounds(points, { padding: [50, 50], maxZoom: zoom ?? 14 });
    }
  }, [listings, loaded, fitKey, zoom]);

  return (
    <>
      <style>{`
        .custom-marker {
          background: #0f172a;
          border: 2px solid white;
          border-radius: 50%;
          box-shadow: 0 1px 4px rgba(0,0,0,0.3);
        }
      `}</style>
      <div ref={containerRef} className="w-full h-full min-h-[400px] rounded-lg" />
    </>
  );
}
