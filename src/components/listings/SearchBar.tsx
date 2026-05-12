"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";

interface Suggestion {
  type: string;
  text: string;
  value: string;
  count?: number;
}

const RECENT_SEARCHES_KEY = "cw_recent_searches";
const MAX_RECENT = 5;

function getRecentSearches(): string[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = localStorage.getItem(RECENT_SEARCHES_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
}

function saveRecentSearch(query: string) {
  const trimmed = query.trim();
  if (!trimmed) return;
  const recent = getRecentSearches().filter((s) => s !== trimmed);
  recent.unshift(trimmed);
  localStorage.setItem(RECENT_SEARCHES_KEY, JSON.stringify(recent.slice(0, MAX_RECENT)));
}

const TYPE_LABELS: Record<string, string> = {
  mls: "MLS#",
  address: "Address",
  city: "City",
  neighbourhood: "Neighbourhood",
};

interface Props {
  variant?: "hero" | "compact";
  className?: string;
}

export default function SearchBar({ variant = "compact", className = "" }: Props) {
  const router = useRouter();
  const [query, setQuery] = useState("");
  const [suggestions, setSuggestions] = useState<Suggestion[]>([]);
  const [recentSearches, setRecentSearches] = useState<string[]>([]);
  const [showDropdown, setShowDropdown] = useState(false);
  const [activeIndex, setActiveIndex] = useState(-1);
  const [loading, setLoading] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);
  const dropdownRef = useRef<HTMLDivElement>(null);
  const abortRef = useRef<AbortController | null>(null);

  useEffect(() => {
    setRecentSearches(getRecentSearches());
  }, []);

  const fetchSuggestions = useCallback(async (q: string) => {
    abortRef.current?.abort();
    if (q.trim().length < 2) {
      setSuggestions([]);
      return;
    }
    const controller = new AbortController();
    abortRef.current = controller;
    setLoading(true);
    try {
      const res = await fetch(`/api/listings/autocomplete?q=${encodeURIComponent(q)}`, {
        signal: controller.signal,
      });
      if (res.ok) {
        const data = await res.json();
        setSuggestions(data.suggestions);
      }
    } catch (e) {
      if ((e as Error).name !== "AbortError") setSuggestions([]);
    } finally {
      if (!controller.signal.aborted) setLoading(false);
    }
  }, []);

  useEffect(() => {
    const timer = setTimeout(() => fetchSuggestions(query), 200);
    return () => clearTimeout(timer);
  }, [query, fetchSuggestions]);

  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node) &&
          inputRef.current && !inputRef.current.contains(e.target as Node)) {
        setShowDropdown(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  function navigate(searchQuery: string) {
    const trimmed = searchQuery.trim();
    if (!trimmed) return;
    saveRecentSearch(trimmed);
    setShowDropdown(false);
    router.push(`/listings?q=${encodeURIComponent(trimmed)}`);
  }

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    navigate(query);
  }

  function handleSuggestionClick(s: Suggestion) {
    if (s.type === "mls") {
      saveRecentSearch(s.text);
      setShowDropdown(false);
      router.push(`/listings/${s.value}`);
    } else if (s.type === "city") {
      saveRecentSearch(s.value);
      setShowDropdown(false);
      router.push(`/listings?city=${encodeURIComponent(s.value)}`);
    } else if (s.type === "neighbourhood") {
      saveRecentSearch(s.value);
      setShowDropdown(false);
      router.push(`/listings?neighbourhood=${encodeURIComponent(s.value)}`);
    } else {
      navigate(s.value);
    }
  }

  function handleKeyDown(e: React.KeyboardEvent) {
    const items = suggestions.length > 0 ? suggestions : [];
    const recentItems = query.trim().length === 0 ? recentSearches : [];
    const totalItems = items.length + recentItems.length;

    if (e.key === "ArrowDown") {
      e.preventDefault();
      setActiveIndex((prev) => (prev < totalItems - 1 ? prev + 1 : 0));
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      setActiveIndex((prev) => (prev > 0 ? prev - 1 : totalItems - 1));
    } else if (e.key === "Enter" && activeIndex >= 0) {
      e.preventDefault();
      if (activeIndex < items.length) {
        handleSuggestionClick(items[activeIndex]);
      } else {
        navigate(recentItems[activeIndex - items.length]);
      }
    } else if (e.key === "Escape") {
      setShowDropdown(false);
    }
  }

  const isHero = variant === "hero";
  const showRecent = query.trim().length === 0 && recentSearches.length > 0;
  const hasDropdownContent = showDropdown && (suggestions.length > 0 || showRecent);

  return (
    <div className={`relative ${className}`}>
      <form onSubmit={handleSubmit} className="relative">
        <div className={`relative flex items-center ${isHero ? "shadow-lg" : "shadow-sm"}`}>
          <div className="absolute left-3 text-slate-400 pointer-events-none">
            <svg className={`${isHero ? "w-6 h-6" : "w-5 h-5"}`} fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-5.197-5.197m0 0A7.5 7.5 0 105.196 5.196a7.5 7.5 0 0010.607 10.607z" />
            </svg>
          </div>
          <input
            ref={inputRef}
            type="text"
            value={query}
            onChange={(e) => {
              setQuery(e.target.value);
              setActiveIndex(-1);
              setShowDropdown(true);
            }}
            onFocus={() => setShowDropdown(true)}
            onKeyDown={handleKeyDown}
            placeholder="Search by address, MLS#, neighbourhood, city, postal code..."
            className={`w-full border border-slate-300 bg-white text-slate-900 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-slate-900 focus:border-transparent ${
              isHero
                ? "pl-12 pr-28 py-4 text-lg rounded-xl"
                : "pl-10 pr-20 py-2.5 text-sm rounded-lg"
            }`}
          />
          <button
            type="submit"
            className={`absolute right-2 bg-slate-900 text-white font-medium hover:bg-slate-800 transition-colors ${
              isHero
                ? "px-6 py-2.5 text-sm rounded-lg"
                : "px-4 py-1.5 text-sm rounded-md"
            }`}
          >
            Search
          </button>
        </div>
        {loading && (
          <div className="absolute right-24 top-1/2 -translate-y-1/2">
            <div className="w-4 h-4 border-2 border-slate-300 border-t-slate-600 rounded-full animate-spin" />
          </div>
        )}
      </form>

      {hasDropdownContent && (
        <div
          ref={dropdownRef}
          className="absolute top-full left-0 right-0 mt-1 bg-white border border-slate-200 rounded-lg shadow-lg z-50 overflow-hidden"
        >
          {suggestions.length > 0 && (
            <div className="py-1">
              {suggestions.map((s, i) => (
                <button
                  key={`${s.type}-${s.value}-${i}`}
                  onClick={() => handleSuggestionClick(s)}
                  className={`w-full text-left px-4 py-2.5 text-sm flex items-center gap-3 transition-colors ${
                    activeIndex === i ? "bg-slate-100" : "hover:bg-slate-50"
                  }`}
                >
                  <span className="inline-flex items-center justify-center w-16 text-xs font-medium text-slate-500 bg-slate-100 rounded px-1.5 py-0.5 flex-shrink-0">
                    {TYPE_LABELS[s.type] || s.type}
                  </span>
                  <span className="text-slate-900 truncate">{s.text}</span>
                  {s.count != null && (
                    <span className="text-xs text-slate-400 ml-auto flex-shrink-0">{s.count} listings</span>
                  )}
                </button>
              ))}
            </div>
          )}

          {showRecent && (
            <div className="py-1">
              <div className="px-4 py-1.5 text-xs font-medium text-slate-400 uppercase tracking-wider">
                Recent Searches
              </div>
              {recentSearches.map((search, i) => (
                <button
                  key={search}
                  onClick={() => navigate(search)}
                  className={`w-full text-left px-4 py-2.5 text-sm flex items-center gap-3 transition-colors ${
                    activeIndex === suggestions.length + i ? "bg-slate-100" : "hover:bg-slate-50"
                  }`}
                >
                  <svg className="w-4 h-4 text-slate-400 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                  <span className="text-slate-700 truncate">{search}</span>
                </button>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
