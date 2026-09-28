# Admin layout migration notes (Phase 13)

## Master plan + polygons

- Layout rows store `imageKey`, `widthPx`, `heightPx`, and `metaJson` (original filename, mime, size, upload time).
- Plot sellable geometry lives in `Plot.polygonJson` as normalized points in **0–100** master-plan space (`LAYOUT_VIEWBOX = "0 0 100 100"`).
- Domain helpers in `@bhairava/domain` (`plot-geometry.ts`) enforce **one plot ↔ one active sellable polygon** via `linkPolygonToPlot` / `relinkPolygon` / `unlinkPolygonFromPlot`.
- Status coloring uses canonical 9 statuses from `plot-status-colors.ts` (no HOLD; legacy `hold` → BLOCKED).

## SVG `preserveAspectRatio` and hit-testing

Production admin layout canvas must keep hit-testing aligned with the rendered master-plan underlay:

1. Use `viewBox="0 0 100 100"` and `preserveAspectRatio="xMidYMid meet"` on both the SVG root and the underlay `<image>`.
2. Convert pointer events with the **same** letterbox math the browser applies for `meet`:
   - Measure the SVG element's `getBoundingClientRect()`.
   - Compute the uniform scale: `s = min(rect.width, rect.height) / 100`.
   - Compute letterbox offsets: `ox = (rect.width - 100 * s) / 2`, `oy = (rect.height - 100 * s) / 2`.
   - Map client → normalized: `nx = (clientX - rect.left - ox) / s`, `ny = (clientY - rect.top - oy) / s`.
3. Apply pan/zoom **after** that mapping (or bake pan/zoom into the same transform used when drawing polygons) so drafted vertices stay under the cursor.
4. Do **not** use `preserveAspectRatio="none"` — it stretches the underlay and desyncs polygon hit areas from the visual plan.
5. Helper: `clientToNormMeet()` in `@bhairava/domain`.

Reference implementation (client-test SoT): `MAIN app/src/components/plot-canvas.tsx` (`clientToNorm` + `preserveAspectRatio="xMidYMid meet"`).

## HOLD aliases

- Plot commercial status: HOLD removed; map legacy `hold` → `BLOCKED` in `toCanonicalPlotStatus`. Keep the legacy map entry until all persisted MAIN* rows are migrated.
- Project lifecycle still has `ON_HOLD` / `ON_HOLD` variants (project paused, not plot inventory). Do not remove.
