import { Navigate, Route, Routes } from 'react-router-dom';
import { CustomerShell } from './shell';
import { ProfilePage, SupportPage } from './pages/Account';
import { DocumentsPage } from './pages/Documents';
import { ExplorePage, PlotDetailPage, ProjectDetailPage } from './pages/Explore';
import { HomePage } from './pages/Home';
import { LoginPage, CustomerOnboardingPage, CustomerMpinPage } from './pages/Login';
import { NotificationsPage } from './pages/Notifications';
import { PaymentsPage, SchedulesPage } from './pages/Payments';
import { BookingsPage, PropertiesPage } from './pages/Portfolio';
import { ReceiptDetailPage, ReceiptsPage } from './pages/Receipts';

export function App() {
  return (
    <Routes>
      <Route path="/login" element={<LoginPage />} />
      <Route path="/onboarding" element={<CustomerOnboardingPage />} />
      <Route path="/mpin" element={<CustomerMpinPage />} />
      <Route element={<CustomerShell />}>
        <Route path="/" element={<HomePage />} />
        <Route path="/explore" element={<ExplorePage />} />
        <Route path="/explore/:projectId" element={<ProjectDetailPage />} />
        <Route path="/explore/:projectId/plots/:plotId" element={<PlotDetailPage />} />
        <Route path="/property" element={<PropertiesPage />} />
        <Route path="/bookings" element={<BookingsPage />} />
        <Route path="/payments" element={<PaymentsPage />} />
        <Route path="/schedules" element={<SchedulesPage />} />
        <Route path="/receipts" element={<ReceiptsPage />} />
        <Route path="/receipts/:receiptId" element={<ReceiptDetailPage />} />
        <Route path="/documents" element={<DocumentsPage />} />
        <Route path="/notifications" element={<NotificationsPage />} />
        <Route path="/support" element={<SupportPage />} />
        <Route path="/profile" element={<ProfilePage />} />
      </Route>
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}
