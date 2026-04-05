import { Routes, Route, Navigate, Outlet } from 'react-router-dom';
import LoginPage from './pages/LoginPage';
import SignUpPage from './pages/SignUpPage';
import ClaimAccountPage from './pages/ClaimAccountPage';
import StudentLayout from './components/students/StudentLayout';
import StudentDashboardPage from './pages/students/DashboardPage';
import StudentAnnouncementsPage from './pages/students/AnnouncementsPage';
import StudentMerchStorePage from './pages/students/MerchStorePage';
import MerchCheckoutPage from './pages/students/MerchCheckoutPage';
import ManageMerchPage from './pages/students/ManageMerchPage';
import StudentMyProfilePage from './pages/students/MyProfilePage';
import MembershipCardListPage from './pages/students/MembershipCardListPage';
import CcsCourseDetailPage from './pages/students/CcsCourseDetailPage';
import StudentSchedulePage from './pages/students/StudentSchedulePage';
import StudentCalendarPage from './pages/students/StudentCalendarPage';
import AdminFacultyLayout from './components/admin-faculty/AdminFacultyLayout';
import StudentProfilingDashboard from './pages/admin-faculty/StudentProfilingDashboard';
import AdminStudentProfileViewPage from './pages/admin-faculty/AdminStudentProfileViewPage';
import AdminDashboardPage from './pages/admin-faculty/AdminDashboardPage';
import AuditLogPage from './pages/admin-faculty/AuditLogPage';
import AdminAddStudentPage from './pages/admin-faculty/AdminAddStudentPage';
import AdminCreateFacultyPage from './pages/admin-faculty/AdminCreateFacultyPage';
import ProfileSettingsPage from './pages/ProfileSettingsPage';

function App() {
  return (
    <Routes>
      <Route path="/login" element={<LoginPage />} />
      <Route path="/claim-account" element={<ClaimAccountPage />} />
      <Route path="/signup" element={<SignUpPage />} />
      <Route path="/dashboard" element={<StudentLayout />}>
        <Route index element={<StudentDashboardPage />} />
        <Route path="schedule" element={<StudentSchedulePage />} />
        <Route path="calendar" element={<StudentCalendarPage />} />
        <Route path="ccs-courses/:courseCode" element={<CcsCourseDetailPage />} />
        <Route path="announcements" element={<StudentAnnouncementsPage />} />
        <Route path="merch-store" element={<StudentMerchStorePage />} />
        <Route path="merch-checkout" element={<MerchCheckoutPage />} />
        <Route path="manage-merch" element={<ManageMerchPage />} />
        <Route path="my-profile" element={<StudentMyProfilePage />} />
        <Route path="profile-settings" element={<ProfileSettingsPage />} />
        <Route path="student-history" element={<Navigate to="/dashboard" replace />} />
        <Route path="membership-cards/irregulars" element={<MembershipCardListPage />} />
        <Route path="membership-cards/:yearSegment/:sectionKey" element={<MembershipCardListPage />} />
        <Route path="membership-cards/:yearSegment" element={<MembershipCardListPage />} />
      </Route>
      <Route path="/admin-dashboard" element={<AdminFacultyLayout />}>
        <Route index element={<AdminDashboardPage />} />
        <Route path="profiling" element={<Outlet />}>
          <Route index element={<Navigate to="talent-directory" replace />} />
          <Route path="talent-directory" element={<StudentProfilingDashboard />} />
          <Route path="class-lists" element={<StudentProfilingDashboard />} />
          <Route path="student/:studentId" element={<AdminStudentProfileViewPage />} />
        </Route>
        <Route path="add-student" element={<AdminAddStudentPage />} />
        <Route path="create-faculty" element={<AdminCreateFacultyPage />} />
        <Route path="announcements" element={<StudentAnnouncementsPage />} />
        <Route path="profile-settings" element={<ProfileSettingsPage />} />
      </Route>
      <Route path="/admin" element={<AdminFacultyLayout />}>
        <Route path="audit-log" element={<AuditLogPage />} />
      </Route>
      <Route path="/" element={<Navigate to="/login" replace />} />
    </Routes>
  );
}

export default App;
