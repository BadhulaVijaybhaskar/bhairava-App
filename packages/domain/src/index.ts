export * from './plot-status';
export * from './lifecycle';
export * from './plot-transitions';
export * from './plot-corner';
export * from './project-permissions';
export * from './readiness';
export * from './overview-metrics';
export * from './pricing';
export * from './money';
export * from './document-visibility';
export * from './reservation';
export * from './pii';
export * from './plot-geometry';
export * from './plot-status-colors';
export * from './layout-api';
export * from './google-auth-rules';
export * from './mpin-rules';
export * from './mpin-ux';

/** Explicit named re-exports so Vite/Rollup can resolve CJS interop. */
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
  canonicalPlotStatusInk,
  canonicalPlotStatusLabel,
} from './plot-status-colors';
export {
  PLOT_STATUSES,
  PLOT_STATUS_LABEL,
  toCanonicalPlotStatus,
  type CanonicalPlotStatus,
} from './plot-status';
export {
  BHAIRAVA_DIRECT_CODE,
  normalizePhoneIn,
  decideMobileOnlyDup,
  decidePhoneStealAttempt,
  decideInviteHintMatch,
  preserveOriginalAttribution,
  resolveDirectAppSalesOwner,
  resolveInviteSalesOwner,
  resolveSiteVisitAssignee,
  needsProfileCompletion,
  generateAgentCode,
  invitePublicMeta,
} from './google-auth-rules';
export {
  MPIN_LENGTH,
  MPIN_MAX_FAILED_ATTEMPTS,
  MPIN_LOCK_MS,
  validateMpinFormat,
  validateMpinConfirm,
  decideMpinLock,
  nextMpinFailureState,
  needsMpinSetup,
  isMpinEligibleRole,
  normalizeMpinLoginIdentifier,
} from './mpin-rules';
export {
  MPIN_UX,
  sanitizeMpinInput,
  validateMpinDigitsInput,
  validateMpinSetupPair,
  canSubmitMpinSetup,
} from './mpin-ux';
