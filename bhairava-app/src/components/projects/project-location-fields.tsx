"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { COUNTRIES, INDIA_STATES, citiesForState } from "@/lib/india-locations";

declare global {
  interface Window {
    google?: {
      maps: {
        places: {
          Autocomplete: new (
            input: HTMLInputElement,
            opts?: {
              componentRestrictions?: { country: string | string[] };
              fields?: string[];
              types?: string[];
            },
          ) => {
            addListener: (event: string, handler: () => void) => void;
            getPlace: () => {
              formatted_address?: string;
              geometry?: { location?: { lat: () => number; lng: () => number } };
              address_components?: Array<{
                long_name: string;
                short_name: string;
                types: string[];
              }>;
            };
          };
        };
        event: { clearInstanceListeners: (instance: unknown) => void };
      };
    };
    __bhairavaMapsPromise?: Promise<void>;
  }
}

function loadGoogleMaps(apiKey: string): Promise<void> {
  if (typeof window === "undefined") return Promise.resolve();
  if (window.google?.maps?.places) return Promise.resolve();
  if (window.__bhairavaMapsPromise) return window.__bhairavaMapsPromise;

  window.__bhairavaMapsPromise = new Promise((resolve, reject) => {
    const script = document.createElement("script");
    script.src = `https://maps.googleapis.com/maps/api/js?key=${encodeURIComponent(apiKey)}&libraries=places`;
    script.async = true;
    script.onload = () => resolve();
    script.onerror = () => reject(new Error("maps_load_failed"));
    document.head.appendChild(script);
  });

  return window.__bhairavaMapsPromise;
}

function component(
  components: Array<{ long_name: string; short_name: string; types: string[] }> | undefined,
  type: string,
) {
  return components?.find((c) => c.types.includes(type))?.long_name ?? "";
}

export function ProjectLocationFields({ googleMapsApiKey }: { googleMapsApiKey?: string }) {
  const [country, setCountry] = useState("India");
  const [state, setState] = useState("");
  const [city, setCity] = useState("");
  const [customCity, setCustomCity] = useState(false);
  const [address, setAddress] = useState("");
  const [pincode, setPincode] = useState("");
  const [lat, setLat] = useState("");
  const [lng, setLng] = useState("");
  const [mapsReady, setMapsReady] = useState(false);
  const [mapsError, setMapsError] = useState(false);
  const searchRef = useRef<HTMLInputElement>(null);

  const cities = useMemo(() => citiesForState(state), [state]);
  const hasGoogle = Boolean(googleMapsApiKey);

  useEffect(() => {
    if (!googleMapsApiKey) return;
    let cancelled = false;
    loadGoogleMaps(googleMapsApiKey)
      .then(() => {
        if (!cancelled) setMapsReady(true);
      })
      .catch(() => {
        if (!cancelled) setMapsError(true);
      });
    return () => {
      cancelled = true;
    };
  }, [googleMapsApiKey]);

  useEffect(() => {
    if (!mapsReady || !searchRef.current || !window.google?.maps?.places) return;

    const autocomplete = new window.google.maps.places.Autocomplete(searchRef.current, {
      componentRestrictions: { country: "in" },
      fields: ["formatted_address", "geometry", "address_components"],
      types: ["geocode"],
    });

    autocomplete.addListener("place_changed", () => {
      const place = autocomplete.getPlace();
      const comps = place.address_components;
      const nextState = component(comps, "administrative_area_level_1");
      const nextCity =
        component(comps, "locality") ||
        component(comps, "administrative_area_level_2") ||
        component(comps, "sublocality_level_1");
      const nextPin = component(comps, "postal_code");
      const nextCountry = component(comps, "country") || "India";

      setCountry(nextCountry || "India");
      setAddress(place.formatted_address || "");
      setPincode(nextPin);
      setState(nextState);

      const knownCities = citiesForState(nextState);
      if (nextCity && knownCities.includes(nextCity)) {
        setCustomCity(false);
        setCity(nextCity);
      } else if (nextCity) {
        setCustomCity(true);
        setCity(nextCity);
      } else {
        setCity("");
        setCustomCity(false);
      }

      const location = place.geometry?.location;
      if (location) {
        setLat(String(location.lat()));
        setLng(String(location.lng()));
      }
    });

    return () => {
      window.google?.maps.event.clearInstanceListeners(autocomplete);
    };
  }, [mapsReady]);

  return (
    <fieldset className="space-y-4 rounded-2xl border border-border/80 bg-canvas p-4">
      <legend className="px-1 text-sm font-semibold text-foreground">Location</legend>

      {hasGoogle ? (
        <div className="space-y-2">
          <label className="block text-sm font-semibold text-foreground">
            Google location search
            <input
              ref={searchRef}
              type="text"
              className="input-field mt-1 !pl-3"
              placeholder={mapsReady ? "Search place in India…" : "Loading Google Maps…"}
              disabled={!mapsReady}
              autoComplete="off"
            />
          </label>
          {mapsError ? (
            <p className="text-xs text-amber-700">
              Google Maps could not load. Use the dropdowns below instead.
            </p>
          ) : (
            <p className="text-[11px] text-muted-foreground">
              Pick a place to auto-fill address, city, state, pincode, and coordinates.
            </p>
          )}
        </div>
      ) : (
        <p className="rounded-xl border border-dashed border-border bg-white px-3 py-2.5 text-xs text-muted-foreground">
          Google location search is off. Add{" "}
          <code className="rounded bg-[var(--surface-low)] px-1">NEXT_PUBLIC_GOOGLE_MAPS_API_KEY</code> in{" "}
          <code className="rounded bg-[var(--surface-low)] px-1">.env</code> to enable Places search.
        </p>
      )}

      <label className="block text-sm font-semibold text-foreground">
        Country
        <select
          name="country"
          value={country}
          onChange={(e) => setCountry(e.target.value)}
          className="input-field mt-1 !pl-3"
        >
          {COUNTRIES.map((c) => (
            <option key={c.code} value={c.name}>
              {c.name}
            </option>
          ))}
        </select>
      </label>

      <div className="grid gap-4 sm:grid-cols-2">
        <label className="block text-sm font-semibold text-foreground">
          State / UT
          <select
            name="state"
            required
            value={state}
            onChange={(e) => {
              setState(e.target.value);
              setCity("");
              setCustomCity(false);
            }}
            className="input-field mt-1 !pl-3"
          >
            <option value="">Select state</option>
            {INDIA_STATES.map((s) => (
              <option key={s.name} value={s.name}>
                {s.name}
              </option>
            ))}
          </select>
        </label>

        <label className="block text-sm font-semibold text-foreground">
          City
          {customCity ? (
            <input
              name="city"
              required
              value={city}
              onChange={(e) => setCity(e.target.value)}
              className="input-field mt-1 !pl-3"
              placeholder="Enter city"
            />
          ) : (
            <select
              name="city"
              required
              value={city}
              disabled={!state}
              onChange={(e) => {
                if (e.target.value === "__other__") {
                  setCustomCity(true);
                  setCity("");
                  return;
                }
                setCity(e.target.value);
              }}
              className="input-field mt-1 !pl-3 disabled:opacity-60"
            >
              <option value="">{state ? "Select city" : "Select state first"}</option>
              {cities.map((c) => (
                <option key={c} value={c}>
                  {c}
                </option>
              ))}
              {state ? <option value="__other__">Other city…</option> : null}
            </select>
          )}
        </label>
      </div>

      {customCity ? (
        <button
          type="button"
          className="text-xs font-semibold text-primary"
          onClick={() => {
            setCustomCity(false);
            setCity("");
          }}
        >
          Choose from city list
        </button>
      ) : null}

      <label className="block text-sm font-semibold text-foreground">
        Address (optional)
        <input
          name="address"
          value={address}
          onChange={(e) => setAddress(e.target.value)}
          className="input-field mt-1 !pl-3"
          placeholder="Street / landmark"
        />
      </label>

      <label className="block text-sm font-semibold text-foreground sm:max-w-[200px]">
        Pincode
        <input
          name="pincode"
          value={pincode}
          onChange={(e) => setPincode(e.target.value)}
          inputMode="numeric"
          pattern="\d{6}"
          maxLength={6}
          className="input-field mt-1 !pl-3"
          placeholder="530001"
        />
      </label>

      <input type="hidden" name="latitude" value={lat} />
      <input type="hidden" name="longitude" value={lng} />
      {(lat || lng) && (
        <p className="text-[11px] font-medium text-primary">
          Coordinates saved: {lat}, {lng}
        </p>
      )}
    </fieldset>
  );
}
