"use client";

import { useState } from "react";
import { ProjectLocationFields } from "@/components/projects/project-location-fields";
import { ProjectHighlightsFields } from "@/components/projects/project-highlights-fields";
import type { ProjectHighlights } from "@/lib/project-highlights";
import { COUNTRIES, INDIA_STATES, citiesForState } from "@/lib/india-locations";

type Defaults = {
  id?: string;
  name?: string;
  code?: string;
  description?: string | null;
  reraNumber?: string | null;
  country?: string;
  state?: string;
  city?: string;
  address?: string | null;
  pincode?: string | null;
  latitude?: string;
  longitude?: string;
  totalPlots?: number;
  status?: string;
  highlights?: ProjectHighlights;
  coverImagePath?: string | null;
};

export function ProjectFormBody({
  defaults,
  mode,
  googleMapsApiKey,
}: {
  defaults?: Defaults;
  mode: "create" | "edit";
  googleMapsApiKey?: string;
}) {
  // For edit without Google search, still need controlled state/city selects
  const [state, setState] = useState(defaults?.state ?? "");
  const [city, setCity] = useState(defaults?.city ?? "");
  const cities = citiesForState(state);

  return (
    <>
      {defaults?.id ? <input type="hidden" name="id" value={defaults.id} /> : null}

      <label className="block text-sm font-semibold text-foreground">
        Project name
        <input
          name="name"
          required
          defaultValue={defaults?.name ?? ""}
          className="input-field mt-1 !pl-3"
          placeholder="Cyber Citadel"
        />
      </label>
      <label className="block text-sm font-semibold text-foreground">
        Project code
        <input
          name="code"
          required
          defaultValue={defaults?.code ?? ""}
          className="input-field mt-1 !pl-3"
          placeholder="CYBER-CITADEL"
        />
      </label>
      <label className="block text-sm font-semibold text-foreground">
        Short description
        <textarea
          name="description"
          rows={3}
          defaultValue={defaults?.description ?? ""}
          className="input-field mt-1 !h-auto !pl-3 py-2.5"
          placeholder="Premium plotted development near Amaravati corridor…"
        />
      </label>
      <label className="block text-sm font-semibold text-foreground">
        RERA number
        <input
          name="reraNumber"
          defaultValue={defaults?.reraNumber ?? ""}
          className="input-field mt-1 !pl-3"
          placeholder="Optional"
        />
      </label>

      {mode === "create" ? (
        <ProjectLocationFields googleMapsApiKey={googleMapsApiKey} />
      ) : (
        <fieldset className="space-y-4 rounded-2xl border border-border/80 bg-canvas p-4">
          <legend className="px-1 text-sm font-semibold text-foreground">Location</legend>
          <label className="block text-sm font-semibold text-foreground">
            Country
            <select name="country" defaultValue={defaults?.country ?? "India"} className="input-field mt-1 !pl-3">
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
              <select
                name="city"
                required
                value={city}
                onChange={(e) => setCity(e.target.value)}
                className="input-field mt-1 !pl-3"
              >
                <option value="">Select city</option>
                {cities.map((c) => (
                  <option key={c} value={c}>
                    {c}
                  </option>
                ))}
                {defaults?.city && !cities.includes(defaults.city) ? (
                  <option value={defaults.city}>{defaults.city}</option>
                ) : null}
              </select>
            </label>
          </div>
          <label className="block text-sm font-semibold text-foreground">
            Address
            <input
              name="address"
              defaultValue={defaults?.address ?? ""}
              className="input-field mt-1 !pl-3"
            />
          </label>
          <label className="block text-sm font-semibold text-foreground sm:max-w-[200px]">
            Pincode
            <input
              name="pincode"
              defaultValue={defaults?.pincode ?? ""}
              className="input-field mt-1 !pl-3"
              maxLength={6}
            />
          </label>
          <input type="hidden" name="latitude" value={defaults?.latitude ?? ""} />
          <input type="hidden" name="longitude" value={defaults?.longitude ?? ""} />
        </fieldset>
      )}

      {mode === "edit" ? (
        <label className="block text-sm font-semibold text-foreground">
          Status
          <select name="status" defaultValue={defaults?.status ?? "ACTIVE"} className="input-field mt-1 !pl-3">
            <option value="DRAFT">Draft</option>
            <option value="ACTIVE">Active</option>
            <option value="ON_HOLD">On hold</option>
            <option value="COMPLETED">Completed</option>
            <option value="CANCELLED">Cancelled</option>
          </select>
        </label>
      ) : null}

      <label className="block text-sm font-semibold text-foreground">
        Planned plot count
        <input
          type="number"
          name="totalPlots"
          min={0}
          max={5000}
          defaultValue={defaults?.totalPlots ?? 0}
          className="input-field mt-1 !pl-3"
        />
      </label>

      {mode === "create" ? (
        <fieldset className="space-y-3 rounded-2xl border border-border/80 bg-canvas p-4">
          <legend className="px-1 text-sm font-semibold text-foreground">Plots now</legend>
          <label className="flex cursor-pointer items-start gap-3">
            <input
              type="radio"
              name="plotsMode"
              value="none"
              defaultChecked
              className="mt-1 h-4 w-4 border-border text-primary focus:ring-brand"
            />
            <span>
              <span className="block text-sm font-semibold text-foreground">No plots yet</span>
              <span className="mt-0.5 block text-xs text-muted-foreground">Add blocks after create</span>
            </span>
          </label>
          <label className="flex cursor-pointer items-start gap-3">
            <input
              type="radio"
              name="plotsMode"
              value="count"
              className="mt-1 h-4 w-4 border-border text-primary focus:ring-brand"
            />
            <span className="text-sm font-semibold text-foreground">Use planned plot count above</span>
          </label>
        </fieldset>
      ) : null}

      <ProjectHighlightsFields defaults={defaults?.highlights} />

      <fieldset className="space-y-2 rounded-2xl border border-border/80 bg-canvas p-4">
        <legend className="px-1 text-sm font-semibold text-foreground">Master layout</legend>
        {defaults?.coverImagePath ? (
          <p className="text-xs text-muted-foreground">Current layout on file. Upload a new image to replace it.</p>
        ) : (
          <p className="text-xs text-muted-foreground">Optional site plan image (JPG / PNG / WebP).</p>
        )}
        <input
          type="file"
          name="layout"
          accept="image/jpeg,image/png,image/webp,.jpg,.jpeg,.png,.webp"
          className="mt-1 block w-full text-sm text-muted-foreground file:mr-3 file:rounded-xl file:border-0 file:bg-primary file:px-3 file:py-2 file:text-sm file:font-semibold file:text-white"
        />
      </fieldset>
    </>
  );
}
