import { Routes, Route, Navigate } from 'react-router-dom';
import LoginPage from './pages/LoginPage';
import SignUpPage from './pages/SignUpPage';
import ClaimAccountPage from './pages/ClaimAccountPage';
import StudentLayout from './components/students/StudentLayout';
import StudentDashboardPage from './pages/students/DashboardPage';
import StudentAnnouncementsPage from './pages/students/AnnouncementsPage';
import StudentMerchStorePage from './pages/students/MerchStorePage';
import ManageMerchPage from './pages/students/ManageMerchPage';
import StudentMyProfilePage from './pages/students/MyProfilePage';
import StudentHistoryPage from './pages/students/StudentHistoryPage';
import AdminFacultyLayout from './components/admin-faculty/AdminFacultyLayout';
import StudentProfilingDashboard from './pages/admin-faculty/StudentProfilingDashboard';
import AdminDashboardPage from './pages/admin-faculty/AdminDashboardPage';
import ProfileSettingsPage from './pages/ProfileSettingsPage';

function App() {
  return (
    <Routes>
      <Route path="/login" element={<LoginPage />} />
      <Route path="/claim-account" element={<ClaimAccountPage />} />
      <Route path="/signup" element={<SignUpPage />} />
      <Route path="/dashboard" element={<StudentLayout />}>
        <Route index element={<StudentDashboardPage />} />
        <Route path="announcements" element={<StudentAnnouncementsPage />} />
        <Route path="merch-store" element={<StudentMerchStorePage />} />
        <Route path="manage-merch" element={<ManageMerchPage />} />
        <Route path="my-profile" element={<StudentMyProfilePage />} />
        <Route path="profile-settings" element={<ProfileSettingsPage />} />
        <Route path="student-history" element={<StudentHistoryPage />} />
      </Route>
      <Route path="/admin-dashboard" element={<AdminFacultyLayout />}>
        <Route index element={<AdminDashboardPage />} />
        <Route path="profiling" element={<StudentProfilingDashboard />} />
        <Route path="announcements" element={<StudentAnnouncementsPage />} />
        <Route path="profile-settings" element={<ProfileSettingsPage />} />
      </Route>
      <Route path="/" element={<Navigate to="/login" replace />} />
    </Routes>
  );
}

export default App;
