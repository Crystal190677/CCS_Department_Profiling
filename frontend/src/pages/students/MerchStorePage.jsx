import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import './PlaceholderPage.css';

export default function MerchStorePage() {
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
    <div className="placeholder-page">
      <h1>Merch Store</h1>
      <p>Browse and purchase CCS merchandise.</p>
    </div>
  );
}
