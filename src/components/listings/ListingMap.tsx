"use client";

import { useEffect, useRef, useState, type ReactNode } from "react";
import { MarkerClusterer } from "@googlemaps/markerclusterer";
import { streetAddress, type AddressFields } from "@/lib/listing-address";

interface MapListing extends AddressFields {
  id: string;
  mlsNumber: string;
  listPrice: string | number;
  latitude: string | number | null;
  longitude: string | number | null;
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
  // Label over the map's top-left corner; null for none (the listing page has its own note)
  note?: ReactNode;
}

const DEFAULT_NOTE = (
  <>
    Pins are at the street address where available, otherwise the postal code. Locations: Geocodio
    (Statistics Canada and municipal address data),{" "}
    <a href="https://www.geonames.org" target="_blank" rel="noopener noreferrer" className="underline">
      GeoNames
    </a>{" "}
    (CC BY 4.0).
  </>
);

// Set in .env.local (see .env.example); inlined at build time
const API_KEY = process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY;
const MAP_ID = process.env.NEXT_PUBLIC_GOOGLE_MAPS_MAP_ID;

function formatPrice(price: string | number): string {
  const n = typeof price === "string" ? parseFloat(price) : price;
  if (n >= 1_000_000) return `$${(n / 1_000_000).toFixed(1)}M`;
  if (n >= 1000) return `$${(n / 1000).toFixed(0)}K`;
  return `$${n}`;
}

function escapeHtml(s: string): string {
  return s.replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[c]!);
}

// One script load per page, shared by every map on it
let scriptLoad: Promise<void> | null = null;
function loadGoogleMaps(): Promise<void> {
  if (typeof google !== "undefined" && typeof google.maps?.importLibrary === "function") return Promise.resolve();
  scriptLoad ??= new Promise((resolve, reject) => {
    const callback = "__portalGoogleMapsReady";
    (window as unknown as Record<string, () => void>)[callback] = () => resolve();
    const script = document.createElement("script");
    script.src = `https://maps.googleapis.com/maps/api/js?key=${encodeURIComponent(API_KEY!)}&v=weekly&loading=async&callback=${callback}`;
    script.async = true;
    script.onerror = () => {
      scriptLoad = null;
      reject(new Error("Google Maps failed to load"));
    };
    document.head.appendChild(script);
  });
  return scriptLoad;
}

function pin(): HTMLElement {
  const el = document.createElement("div");
  el.className = "listing-pin";
  return el;
}

export default function ListingMap({ listings, onBoundsChange, fitKey = "", zoom, note = DEFAULT_NOTE }: Props) {
  const containerRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<google.maps.Map | null>(null);
  const clustererRef = useRef<MarkerClusterer | null>(null);
  const infoRef = useRef<google.maps.InfoWindow | null>(null);
  const markerClassRef = useRef<typeof google.maps.marker.AdvancedMarkerElement | null>(null);
  const fittedKey = useRef<string | null>(null);
  // Latest callback without re-creating the map when the parent re-renders
  const onBoundsRef = useRef(onBoundsChange);
  const [loaded, setLoaded] = useState(false);
  const [failed, setFailed] = useState(!API_KEY);

  useEffect(() => {
    onBoundsRef.current = onBoundsChange;
  }, [onBoundsChange]);

  // Create the map once
  useEffect(() => {
    if (!API_KEY || !containerRef.current || mapRef.current) return;
    let cancelled = false;
    let moveTimer: ReturnType<typeof setTimeout> | undefined;
    let idleListener: google.maps.MapsEventListener | undefined;

    (async () => {
      try {
        await loadGoogleMaps();
        const { Map, InfoWindow } = (await google.maps.importLibrary("maps")) as google.maps.MapsLibrary;
        const { AdvancedMarkerElement } = (await google.maps.importLibrary("marker")) as google.maps.MarkerLibrary;
        if (cancelled || !containerRef.current) return;

        const map = new Map(containerRef.current, {
          center: { lat: 43.6532, lng: -79.3832 },
          zoom: zoom ?? 11,
          mapId: MAP_ID,
          mapTypeControl: false,
          fullscreenControl: false,
          clickableIcons: false,
        });
        markerClassRef.current = AdvancedMarkerElement;
        infoRef.current = new InfoWindow();
        clustererRef.current = new MarkerClusterer({ map });
        mapRef.current = map;

        idleListener = map.addListener("idle", () => {
          clearTimeout(moveTimer);
          moveTimer = setTimeout(() => {
            const b = map.getBounds();
            if (!b) return;
            const sw = b.getSouthWest();
            const ne = b.getNorthEast();
            onBoundsRef.current?.(`${sw.lat()},${sw.lng()},${ne.lat()},${ne.lng()}`);
          }, 300);
        });
        setLoaded(true);
      } catch {
        if (!cancelled) setFailed(true);
      }
    })();

    return () => {
      cancelled = true;
      clearTimeout(moveTimer);
      idleListener?.remove();
      clustererRef.current?.setMap(null);
      clustererRef.current = null;
      infoRef.current?.close();
      mapRef.current = null;
    };
  }, [zoom]);

  // Draw pins
  useEffect(() => {
    const map = mapRef.current;
    const clusterer = clustererRef.current;
    const info = infoRef.current;
    const Marker = markerClassRef.current;
    if (!loaded || !map || !clusterer || !info || !Marker) return;

    clusterer.clearMarkers();
    const bounds = new google.maps.LatLngBounds();
    const markers: google.maps.marker.AdvancedMarkerElement[] = [];

    for (const l of listings) {
      if (l.latitude == null || l.longitude == null) continue;
      const position = { lat: Number(l.latitude), lng: Number(l.longitude) };
      bounds.extend(position);

      const addr = streetAddress(l, { unit: false });
      const lease = l.transactionType?.includes("Lease");
      const marker = new Marker({ position, content: pin(), title: addr || l.mlsNumber, gmpClickable: true });
      marker.addEventListener("gmp-click", () => {
        info.setContent(
          `<div class="text-sm">
            <div class="font-bold">${formatPrice(l.listPrice)}${lease ? "/mo" : ""}</div>
            <div>${escapeHtml(addr || "Address unavailable")}</div>
            <div class="text-slate-500">${escapeHtml(l.city || "")}</div>
            ${l.bedrooms ? `<div>${l.bedrooms} bed / ${l.bathrooms || 0} bath</div>` : ""}
            <a href="/listings/${encodeURIComponent(l.mlsNumber)}" class="text-blue-600 text-xs">View details</a>
          </div>`
        );
        info.open({ map, anchor: marker });
      });
      markers.push(marker);
    }
    clusterer.addMarkers(markers);

    if (markers.length > 0 && fittedKey.current !== fitKey) {
      fittedKey.current = fitKey;
      const maxZoom = zoom ?? 14;
      if (markers.length === 1) {
        map.setCenter(bounds.getCenter());
        map.setZoom(maxZoom);
      } else {
        map.fitBounds(bounds, 50);
        google.maps.event.addListenerOnce(map, "idle", () => {
          if ((map.getZoom() ?? 0) > maxZoom) map.setZoom(maxZoom);
        });
      }
    }
  }, [listings, loaded, fitKey, zoom]);

  if (failed) {
    return (
      <div className="w-full h-full min-h-[300px] bg-slate-100 flex items-center justify-center text-sm text-slate-500">
        Map unavailable
      </div>
    );
  }

  return (
    <div className="relative w-full h-full min-h-[300px]">
      <style>{`
        .listing-pin {
          width: 12px;
          height: 12px;
          background: #0f172a;
          border: 2px solid white;
          border-radius: 50%;
          box-shadow: 0 1px 4px rgba(0,0,0,0.3);
        }
      `}</style>
      <div ref={containerRef} className="absolute inset-0" />
      {note && (
        <p className="absolute top-2 left-2 max-w-[calc(100%-1rem)] bg-white/90 rounded px-2 py-0.5 text-[11px] text-slate-600 shadow-sm">
          {note}
        </p>
      )}
    </div>
  );
}
