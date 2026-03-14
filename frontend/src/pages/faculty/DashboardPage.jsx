import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';

export default function FacultyDashboardPage() {
  const navigate = useNavigate();
  const [user, setUser] = useState(null);

  useEffect(() => {
    const token = localStorage.getItem('ccs_token');
    const userData = localStorage.getItem('ccs_user');
    if (!token || !userData) navigate('/login');
    else setUser(JSON.parse(userData));
  }, [navigate]);

  if (!user) return null;

  return (
    <div>
      <h1>Faculty Dashboard</h1>
      <p>Welcome, {user.name}. Faculty-specific content will be added here.</p>
    </div>
  );
}
