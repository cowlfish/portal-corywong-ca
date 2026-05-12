"use client";

import { useEffect, useRef, useState } from "react";
import type { Map as LeafletMap } from "leaflet";

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
}

interface Props {
  listings: MapListing[];
  onBoundsChange?: (bounds: string) => void;
}

function formatPrice(price: string | number): string {
  const n = typeof price === "string" ? parseFloat(price) : price;
  if (n >= 1_000_000) return `$${(n / 1_000_000).toFixed(1)}M`;
  if (n >= 1000) return `$${(n / 1000).toFixed(0)}K`;
  return `$${n}`;
}

export default function ListingMap({ listings, onBoundsChange }: Props) {
  const containerRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<LeafletMap | null>(null);
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    if (!containerRef.current || mapRef.current) return;

    let cancelled = false;

    (async () => {
      const L = await import("leaflet");
      await import("leaflet/dist/leaflet.css");

      if (cancelled || !containerRef.current) return;

      const map = L.map(containerRef.current, {
        center: [43.6532, -79.3832],
        zoom: 11,
        zoomControl: true,
      });

      L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
        attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>',
        maxZoom: 19,
      }).addTo(map);

      mapRef.current = map;
      setLoaded(true);

      if (onBoundsChange) {
        const emitBounds = () => {
          const b = map.getBounds();
          onBoundsChange(
            `${b.getSouth()},${b.getWest()},${b.getNorth()},${b.getEast()}`
          );
        };
        map.on("moveend", emitBounds);
      }
    })();

    return () => {
      cancelled = true;
      if (mapRef.current) {
        mapRef.current.remove();
        mapRef.current = null;
      }
    };
  }, [onBoundsChange]);

  useEffect(() => {
    if (!mapRef.current || !loaded) return;

    const L = require("leaflet") as typeof import("leaflet");
    const map = mapRef.current;

    map.eachLayer((layer) => {
      if ((layer as unknown as Record<string, boolean>)._isMarker) map.removeLayer(layer);
    });

    const geoListings = listings.filter(
      (l) => l.latitude != null && l.longitude != null
    );

    const markerIcon = L.divIcon({
      className: "custom-marker",
      html: "",
      iconSize: [12, 12],
    });

    const bounds: [number, number][] = [];

    geoListings.forEach((l) => {
      const lat = Number(l.latitude);
      const lng = Number(l.longitude);
      bounds.push([lat, lng]);

      const marker = L.marker([lat, lng], { icon: markerIcon });
      (marker as unknown as Record<string, boolean>)._isMarker = true;

      const addr = [l.streetNumber, l.streetName].filter(Boolean).join(" ");
      marker.bindPopup(
        `<div class="text-sm">
          <div class="font-bold">${formatPrice(l.listPrice)}</div>
          <div>${addr || "Address unavailable"}</div>
          <div class="text-slate-500">${l.city || ""}</div>
          ${l.bedrooms ? `<div>${l.bedrooms} bed / ${l.bathrooms || 0} bath</div>` : ""}
          <a href="/listings/${l.mlsNumber}" class="text-blue-600 text-xs">View Details</a>
        </div>`
      );

      marker.addTo(map);
    });

    if (bounds.length > 0) {
      map.fitBounds(bounds, { padding: [50, 50], maxZoom: 14 });
    }
  }, [listings, loaded]);

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
