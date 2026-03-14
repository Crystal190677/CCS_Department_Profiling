import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import './DashboardPage.css';

export default function DashboardPage() {
  const navigate = useNavigate();
  const [user, setUser] = useState(null);

  useEffect(() => {
    const token = localStorage.getItem('ccs_token');
    const userData = localStorage.getItem('ccs_user');

    if (!token || !userData) {
      navigate('/login');
      return;
    }

    setUser(JSON.parse(userData));
  }, [navigate]);

  const handleLogout = () => {
    localStorage.removeItem('ccs_token');
    localStorage.removeItem('ccs_user');
    navigate('/login');
  };

  if (!user) return null;

  return (
    <div className="dashboard">
      <header className="dashboard-header">
        <div>
          <h1>CCS Management System</h1>
          <p>Welcome back, {user.name}</p>
        </div>
        <button className="dashboard-logout" onClick={handleLogout}>
          Sign out
        </button>
      </header>
      <main className="dashboard-main">
        <div className="dashboard-badge">
          <span>Logged in as</span>
          <strong>{user.role}</strong>
        </div>
        <p className="dashboard-placeholder">Dashboard content will be built here.</p>
      </main>
    </div>
  );
}
