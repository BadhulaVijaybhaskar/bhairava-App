import type { ReactNode } from 'react';
import { Navigate, Outlet, Route, Routes } from 'react-router-dom';
import { Shell } from './components/AdminShell';
import { LoginPage } from './pages/Login';
import { DashboardPage } from './pages/Dashboard';
import { ProjectsPage } from './pages/Projects';
import { ProjectWorkspacePage } from './pages/ProjectSetup';
import { PlotsPage } from './pages/Plots';
import { LayoutsPage } from './pages/Layouts';
import { CustomerDetailPage, CustomersPage } from './pages/Customers';
import { CustomerOnboardingPage, LeadConversionPage } from './pages/Onboarding';
import {
  AgentOnboardingPage,
  BookingOnboardingPage,
  PlotOnboardingPage,
  ProjectOnboardingPage,
  ReservationOnboardingPage,
  VisitOnboardingPage,
} from './pages/OnboardingWizards';
import {
  AgentsPage,
  BookingsPage,
  CollectionsPage,
  CommissionsPage,
  LeadsPage,
  PaymentsPage,
  RegistrationsPage,
  ReservationsPage,
  ResalePage,
  SchedulePage,
  VisitsPage,
} from './pages/Lists';
import { AgentDetailPage, BookingDetailPage, PaymentDetailPage } from './pages/Details';
import { ReceiptDetailPage, ReceiptsListPage } from './pages/Receipts';
import { DocumentsPage } from './pages/Documents';
import { NotificationsPage } from './pages/Notifications';
import { ReportsPage, type ReportFocus } from './pages/Reports';
import { AuditPage, BillingPage, CompanySettingsPage, DangerZonePage, MembersPage } from './pages/Settings';

const shellRoutes: Array<[path: string, element: ReactNode]> = [
  ['/', <DashboardPage />],
  ['/projects', <ProjectsPage />],
  ['/projects/:projectId', <ProjectWorkspacePage />],
  ['/projects/:projectId/plots', <PlotsPage />],
  ['/plots', <PlotsPage />],
  ['/layouts', <LayoutsPage />],
  ['/customers', <CustomersPage />],
  ['/customers/onboarding', <CustomerOnboardingPage />],
  ['/customers/:customerId', <CustomerDetailPage />],
  ['/conversion', <LeadConversionPage />],
  ['/onboarding/project', <ProjectOnboardingPage />],
  ['/onboarding/plot', <PlotOnboardingPage />],
  ['/onboarding/customer', <CustomerOnboardingPage />],
  ['/onboarding/agent', <AgentOnboardingPage />],
  ['/onboarding/visit', <VisitOnboardingPage />],
  ['/onboarding/reservation', <ReservationOnboardingPage />],
  ['/onboarding/booking', <BookingOnboardingPage />],
  ['/agents', <AgentsPage />],
  ['/agents/:agentId', <AgentDetailPage />],
  ['/leads', <LeadsPage />],
  ['/visits', <VisitsPage />],
  ['/reservations', <ReservationsPage />],
  ['/bookings', <BookingsPage />],
  ['/bookings/:bookingId', <BookingDetailPage />],
  ['/payments', <PaymentsPage />],
  ['/payments/:paymentId', <PaymentDetailPage />],
  ['/collections', <CollectionsPage />],
  ['/schedule', <SchedulePage />],
  ['/receipts', <ReceiptsListPage />],
  ['/receipts/:receiptId', <ReceiptDetailPage />],
  ['/commissions', <CommissionsPage />],
  ['/documents', <DocumentsPage />],
  ['/registrations', <RegistrationsPage />],
  ['/resale', <ResalePage />],
  ['/notifications', <NotificationsPage />],
  ...(['sales', 'inventory', 'collections', 'agents', 'customers', 'registrations', 'resale'] as ReportFocus[]).map(
    (focus): [string, ReactNode] => [`/reports/${focus}`, <ReportsPage key={focus} focus={focus} />],
  ),
  ['/settings/users', <MembersPage />],
  ['/settings/audit', <AuditPage />],
  ['/settings/company', <CompanySettingsPage />],
  ['/settings/billing', <BillingPage />],
  ['/settings/danger', <DangerZonePage />],
];

export function App() {
  return (
    <Routes>
      <Route path="/login" element={<LoginPage />} />
      <Route element={<Shell><Outlet /></Shell>}>
        {shellRoutes.map(([path, element]) => (
          <Route key={path} path={path} element={element} />
        ))}
      </Route>
      <Route path="/reports" element={<Navigate to="/reports/sales" replace />} />
      <Route path="/site-visits" element={<Navigate to="/visits" replace />} />
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}
