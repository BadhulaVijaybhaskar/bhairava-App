/** API-facing re-exports for layout/polygon helpers. */
export {
  isMappedPolygon,
  validatePolygon,
  linkPolygonToPlot,
  unlinkPolygonFromPlot,
  relinkPolygon,
  buildMasterPlanMeta,
  LAYOUT_VIEWBOX,
  clientToNormMeet,
  type NormPoint,
  type MasterPlanUploadMeta,
} from './plot-geometry';
export {
  fillForPlotStatus,
  labelForPlotStatus,
  solidForPlotStatus,
  inkForPlotStatus,
  canonicalPlotStatusFill,
  canonicalPlotStatusSolid,
} from './plot-status-colors';
