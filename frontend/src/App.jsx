import { Routes, Route, Navigate } from 'react-router-dom';
import LoginPage from './pages/LoginPage';
import SignUpPage from './pages/SignUpPage';
import StudentLayout from './components/students/StudentLayout';
import StudentDashboardPage from './pages/students/DashboardPage';
import StudentAnnouncementsPage from './pages/students/AnnouncementsPage';
import StudentMerchStorePage from './pages/students/MerchStorePage';
import ManageMerchPage from './pages/students/ManageMerchPage';
import StudentMyProfilePage from './pages/students/MyProfilePage';
import AdminFacultyLayout from './components/admin-faculty/AdminFacultyLayout';
import StudentProfilingDashboard from './pages/admin-faculty/StudentProfilingDashboard';

function App() {
  return (
    <Routes>
      <Route path="/login" element={<LoginPage />} />
      <Route path="/signup" element={<SignUpPage />} />
      <Route path="/dashboard" element={<StudentLayout />}>
        <Route index element={<StudentDashboardPage />} />
        <Route path="announcements" element={<StudentAnnouncementsPage />} />
        <Route path="merch-store" element={<StudentMerchStorePage />} />
        <Route path="manage-merch" element={<ManageMerchPage />} />
        <Route path="my-profile" element={<StudentMyProfilePage />} />
      </Route>
      <Route path="/admin-dashboard" element={<AdminFacultyLayout />}>
        <Route index element={<StudentProfilingDashboard />} />
      </Route>
      <Route path="/" element={<Navigate to="/login" replace />} />
    </Routes>
  );
}

export default App;
