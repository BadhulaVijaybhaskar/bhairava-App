/**
 * @bhairava/ui-web — shared web design system (React + Tailwind v4).
 * Import `@bhairava/ui-web/styles.css` once in the app entry. Do not import into RN.
 */
export const UI_WEB_PACKAGE = "@bhairava/ui-web";

export { cn } from "./lib/utils";
export {
  plotStatusColors,
  plotStatusFromLabel,
  plotStatusLabel,
  type CanonicalPlotStatus,
  type PlotStatusColors,
} from "./lib/plot-status";
export {
  FabVisibilityProvider,
  useCreateFabBlocked,
  useOccupyCreateFab,
} from "./lib/fab-visibility";
export { useBodyScrollLock, useEscapeKey, useFocusReturn, useMounted } from "./lib/overlay";

export {
  PageHeader,
  Panel,
  SectionTitle,
  Metric,
  Chip,
  PlotStatusChip,
  toneFor,
  FilterBar,
  DataTable,
  resolvePathTemplate,
  RecordHeader,
  Btn,
  LinkBtn,
  btnClasses,
  NewRecordButton,
  Timeline,
  SwitchControl,
  type ChipTone,
  type BtnVariant,
  type DataTableColumn,
  type RowLink,
} from "./components/kit";
export { ScrollTabs } from "./components/scroll-tabs";
export { BrandLogo, BrandWordmark, DEFAULT_LOGO_SRC } from "./components/brand";
export {
  Field,
  fieldBase,
  TextInput,
  NumberInput,
  SelectInput,
  TextareaInput,
  ChoiceGrid,
  Checkbox,
  MultiSelect,
  TagListInput,
  EditSheet,
  ConfirmDialog,
  useUnsavedGuard,
  type SelectOption,
} from "./components/form-kit";
export {
  AppShell,
  type AppShellProps,
  type AppShellUser,
  type NavGroup,
  type NavItem,
} from "./components/app-shell";
export { EmptyState } from "./components/empty-state";
export { LoadingState, Skeleton, Spinner } from "./components/loading-state";
export { ErrorState } from "./components/error-state";
export { Drawer, type DrawerSide } from "./components/drawer";
export { Modal, type ModalSize } from "./components/modal";
export { Tabs, TabPanel, type TabItem } from "./components/tabs";
export { GoogleSignInButton, type GoogleSignInButtonProps } from "./components/google-sign-in";
