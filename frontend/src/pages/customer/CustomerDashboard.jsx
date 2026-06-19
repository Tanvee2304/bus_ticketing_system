import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { getBuses, getMyBookings } from '../../services/api';
import { Bus, Ticket, Search, TrendingUp } from 'lucide-react';

export default function CustomerDashboard() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [stats, setStats] = useState({ buses: 0, bookings: 0, confirmed: 0 });

  useEffect(() => {
    Promise.all([getBuses({ available_only: true }), getMyBookings()])
      .then(([busRes, bookRes]) => {
        const bookings = bookRes.data;
        setStats({
          buses: busRes.data.length,
          bookings: bookings.length,
          confirmed: bookings.filter((b) => b.status === 'Confirmed').length,
        });
      })
      .catch(() => {});
  }, []);

  return (
    <div className="page">
      <div className="page-header">
        <h2>Welcome back, {user?.name}! 👋</h2>
        <p>Where are you heading today?</p>
      </div>

      <div className="stats-grid">
        <div className="stat-card stat-blue">
          <Bus size={32} />
          <div>
            <p className="stat-value">{stats.buses}</p>
            <p className="stat-label">Available Buses</p>
          </div>
        </div>
        <div className="stat-card stat-green">
          <Ticket size={32} />
          <div>
            <p className="stat-value">{stats.bookings}</p>
            <p className="stat-label">Total Bookings</p>
          </div>
        </div>
        <div className="stat-card stat-purple">
          <TrendingUp size={32} />
          <div>
            <p className="stat-value">{stats.confirmed}</p>
            <p className="stat-label">Active Tickets</p>
          </div>
        </div>
      </div>

      <div className="quick-actions">
        <h3>Quick Actions</h3>
        <div className="action-grid">
          <div className="action-card" onClick={() => navigate('/customer/search')}>
            <Search size={36} className="action-icon blue" />
            <h4>Search Buses</h4>
            <p>Use AI to find your perfect bus with natural language</p>
            <button className="btn-primary">Search Now</button>
          </div>
          <div className="action-card" onClick={() => navigate('/customer/bookings')}>
            <Ticket size={36} className="action-icon green" />
            <h4>My Bookings</h4>
            <p>View, track or cancel your existing bookings</p>
            <button className="btn-secondary">View Bookings</button>
          </div>
        </div>
      </div>
    </div>
  );
}
