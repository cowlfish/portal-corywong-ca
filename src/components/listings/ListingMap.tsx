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
  // bounds "south,west,north,east" for searching; view "lat,lng,zoom" for reopening the same spot
  onBoundsChange?: (bounds: string, view: string) => void;
  // The map fits itself to the listings once per distinct key (e.g. when filters change),
  // not on every update: results reload as the map moves, and refitting would loop.
  fitKey?: string;
  zoom?: number;
  // Label over the map's bottom-left corner; null for none (the listing page has its own note)
  note?: ReactNode;
  // "lat,lng,zoom" to reopen on, e.g. when returning to a search; skips the first fit.
  // Centre and zoom rather than bounds: fitting saved bounds can land a zoom level out.
  initialView?: string | null;
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

// Listings behind each pin, for cluster counts
const listingCounts = new WeakMap<google.maps.marker.AdvancedMarkerElement, number>();

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

// A pin for one listing, or with a count for several at the same spot (condo units share their
// building's address, so they geocode to the same point and would never split apart)
function pin(count = 1): HTMLElement {
  const el = document.createElement("div");
  el.className = count > 1 ? "listing-pin listing-pin-group" : "listing-pin";
  if (count > 1) el.textContent = String(count);
  return el;
}

function clusterIcon(count: number): HTMLElement {
  const el = document.createElement("div");
  el.className = "listing-cluster";
  el.textContent = count.toLocaleString("en-CA");
  return el;
}

function priceLabel(l: MapListing): string {
  return `${formatPrice(l.listPrice)}${l.transactionType?.includes("Lease") ? "/mo" : ""}`;
}

function bedBath(l: MapListing): string {
  return l.bedrooms ? `${l.bedrooms} bed / ${l.bathrooms || 0} bath` : "";
}

function popupHtml(group: MapListing[]): string {
  const link = (l: MapListing) => `/listings/${encodeURIComponent(l.mlsNumber)}`;
  if (group.length === 1) {
    const l = group[0];
    return `<div class="text-sm">
      <div class="font-bold">${priceLabel(l)}</div>
      <div>${escapeHtml(streetAddress(l, { unit: false }) || "Address unavailable")}</div>
      <div class="text-slate-500">${escapeHtml(l.city || "")}</div>
      ${bedBath(l) ? `<div>${bedBath(l)}</div>` : ""}
      <a href="${link(l)}" class="text-blue-600 text-xs">View details</a>
    </div>`;
  }
  // Several listings at one spot: usually units in one building, sometimes neighbours that
  // only have a postal code location
  const addresses = new Set(group.map((l) => streetAddress(l, { unit: false })));
  const shared = addresses.size === 1 ? [...addresses][0] : null;
  const rows = [...group]
    .sort((a, b) => Number(a.listPrice) - Number(b.listPrice))
    .map((l) => {
      const label = shared ? (l.unitNumber ? `Unit ${l.unitNumber}` : "") : streetAddress(l) || "";
      const details = [label, bedBath(l)].filter(Boolean).map(escapeHtml).join(" · ");
      return `<a href="${link(l)}" class="block py-1.5 border-t border-slate-100 hover:bg-slate-50">
        <span class="font-semibold text-slate-900">${priceLabel(l)}</span>
        ${details ? `<span class="text-slate-600"> · ${details}</span>` : ""}
      </a>`;
    })
    .join("");
  return `<div class="text-sm min-w-[220px]">
    <div class="font-bold pb-1">${group.length} listings ${shared ? `at ${escapeHtml(shared)}` : "here"}</div>
    ${shared && group[0].city ? `<div class="text-slate-500 pb-1">${escapeHtml(group[0].city)}</div>` : ""}
    <div class="max-h-48 overflow-y-auto">${rows}</div>
  </div>`;
}

export default function ListingMap({
  listings,
  onBoundsChange,
  fitKey = "",
  zoom,
  note = DEFAULT_NOTE,
  initialView,
}: Props) {
  const containerRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<google.maps.Map | null>(null);
  const clustererRef = useRef<MarkerClusterer | null>(null);
  const infoRef = useRef<google.maps.InfoWindow | null>(null);
  const markerClassRef = useRef<typeof google.maps.marker.AdvancedMarkerElement | null>(null);
  const fittedKey = useRef<string | null>(null);
  // Latest callback without re-creating the map when the parent re-renders
  const onBoundsRef = useRef(onBoundsChange);
  // Where to open, read once when the map is created
  const startRef = useRef({ view: initialView, fitKey });
  const [loaded, setLoaded] = useState(false);
  const [failed, setFailed] = useState(!API_KEY);
  // Phones: the note is a tap-to-open button so it doesn't cover the map
  const [noteOpen, setNoteOpen] = useState(false);

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
          // Map / Satellite switch, top right (the source label sits bottom left). Google adds a
          // "Labels" checkbox to Satellite for street names over the imagery.
          mapTypeControl: true,
          mapTypeControlOptions: {
            mapTypeIds: ["roadmap", "satellite"],
            style: google.maps.MapTypeControlStyle.HORIZONTAL_BAR,
            position: google.maps.ControlPosition.TOP_RIGHT,
          },
          fullscreenControl: false,
          clickableIcons: false,
        });
        const [lat, lng, startZoom] = (startRef.current.view ?? "").split(",").map(Number);
        if ([lat, lng, startZoom].every(Number.isFinite)) {
          map.setCenter({ lat, lng });
          map.setZoom(startZoom);
          fittedKey.current = startRef.current.fitKey;
        }
        markerClassRef.current = AdvancedMarkerElement;
        infoRef.current = new InfoWindow();
        clustererRef.current = new MarkerClusterer({
          map,
          // Counts listings, not pins: a pin for a 10-unit building adds 10
          renderer: {
            render: ({ markers, position }) => {
              const count = markers.reduce(
                (sum, m) => sum + (listingCounts.get(m as google.maps.marker.AdvancedMarkerElement) ?? 1),
                0
              );
              return new AdvancedMarkerElement({ position, content: clusterIcon(count), zIndex: 1000 + count });
            },
          },
        });
        mapRef.current = map;

        idleListener = map.addListener("idle", () => {
          clearTimeout(moveTimer);
          moveTimer = setTimeout(() => {
            const b = map.getBounds();
            if (!b) return;
            const sw = b.getSouthWest();
            const ne = b.getNorthEast();
            const c = map.getCenter();
            onBoundsRef.current?.(
              `${sw.lat()},${sw.lng()},${ne.lat()},${ne.lng()}`,
              c ? `${c.lat().toFixed(5)},${c.lng().toFixed(5)},${Number((map.getZoom() ?? 11).toFixed(2))}` : ""
            );
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

    // One pin per spot: listings within about a metre of each other share it
    const groups = new Map<string, MapListing[]>();
    for (const l of listings) {
      if (l.latitude == null || l.longitude == null) continue;
      const key = `${Number(l.latitude).toFixed(5)},${Number(l.longitude).toFixed(5)}`;
      groups.set(key, [...(groups.get(key) ?? []), l]);
    }

    for (const group of groups.values()) {
      const position = { lat: Number(group[0].latitude), lng: Number(group[0].longitude) };
      bounds.extend(position);
      const title =
        group.length > 1
          ? `${group.length} listings`
          : streetAddress(group[0], { unit: false }) || group[0].mlsNumber;
      const marker = new Marker({ position, content: pin(group.length), title, gmpClickable: true });
      listingCounts.set(marker, group.length);
      marker.addEventListener("gmp-click", () => {
        info.setContent(popupHtml(group));
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
        .listing-pin-group {
          width: auto;
          min-width: 22px;
          height: 22px;
          padding: 0 5px;
          border-radius: 11px;
          color: white;
          font: 600 11px/18px system-ui, sans-serif;
          text-align: center;
        }
        .listing-cluster {
          min-width: 32px;
          height: 32px;
          padding: 0 8px;
          border-radius: 16px;
          background: rgba(15, 23, 42, 0.85);
          border: 3px solid rgba(255, 255, 255, 0.8);
          box-shadow: 0 1px 6px rgba(0,0,0,0.35);
          color: white;
          font: 600 12px/26px system-ui, sans-serif;
          text-align: center;
        }
      `}</style>
      <div ref={containerRef} className="absolute inset-0" />
      {note && (
        // Bottom left, above the Google logo: clear of the Map / Satellite switch (top right),
        // the zoom and Street View controls (bottom right), and pin popups, which open upward
        <div className="absolute bottom-7 left-2 max-w-[calc(100%-4rem)] flex flex-col-reverse items-start gap-1 text-[11px] text-slate-600">
          <button
            type="button"
            onClick={() => setNoteOpen((o) => !o)}
            aria-expanded={noteOpen}
            aria-label="About pin locations"
            className="sm:hidden w-6 h-6 rounded-full bg-white/90 shadow-sm font-semibold text-slate-700"
          >
            i
          </button>
          <p className={`${noteOpen ? "block" : "hidden"} sm:block bg-white/90 rounded px-2 py-0.5 shadow-sm`}>
            {note}
          </p>
        </div>
      )}
    </div>
  );
}
