import { useEffect, useState } from 'react';
import { getDashboardStats, getOccupancy, getRouteStats } from '../../services/api';
import toast from 'react-hot-toast';
import { IndianRupee, Bus, Ticket, Users, TrendingUp, MapPin } from 'lucide-react';

export default function AdminDashboard() {
  const [stats, setStats] = useState(null);
  const [occupancy, setOccupancy] = useState([]);
  const [routes, setRoutes] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    Promise.all([getDashboardStats(), getOccupancy(), getRouteStats()])
      .then(([s, o, r]) => {
        setStats(s.data);
        setOccupancy(o.data);
        setRoutes(r.data);
      })
      .catch(() => toast.error('Failed to load dashboard'))
      .finally(() => setLoading(false));
  }, []);

  if (loading) return <div className="loading">Loading dashboard…</div>;

  return (
    <div className="page">
      <div className="page-header">
        <h2>Admin Dashboard</h2>
        <p>Platform overview and analytics</p>
      </div>

      {/* Stats */}
      <div className="stats-grid">
        <div className="stat-card stat-blue">
          <Ticket size={28} />
          <div>
            <p className="stat-value">{stats?.total_bookings_today}</p>
            <p className="stat-label">Bookings Today</p>
          </div>
        </div>
        <div className="stat-card stat-green">
          <IndianRupee size={28} />
          <div>
            <p className="stat-value">₹{stats?.revenue_today?.toLocaleString('en-IN')}</p>
            <p className="stat-label">Revenue Today</p>
          </div>
        </div>
        <div className="stat-card stat-purple">
          <Bus size={28} />
          <div>
            <p className="stat-value">{stats?.active_buses} / {stats?.total_buses}</p>
            <p className="stat-label">Active / Total Buses</p>
          </div>
        </div>
        <div className="stat-card stat-orange">
          <Users size={28} />
          <div>
            <p className="stat-value">{stats?.total_customers}</p>
            <p className="stat-label">Total Customers</p>
          </div>
        </div>
        <div className="stat-card stat-teal">
          <TrendingUp size={28} />
          <div>
            <p className="stat-value">₹{stats?.total_revenue_all_time?.toLocaleString('en-IN')}</p>
            <p className="stat-label">All-Time Revenue</p>
          </div>
        </div>
      </div>

      <div className="dashboard-grid">
        {/* Occupancy */}
        <div className="dashboard-section">
          <h3>Bus Occupancy</h3>
          <div className="occupancy-list">
            {occupancy.map((item) => (
              <div key={item.bus_id} className="occupancy-item">
                <div className="occ-info">
                  <p className="occ-name">{item.bus_name}</p>
                  <p className="occ-route">{item.origin} → {item.destination}</p>
                </div>
                <div className="occ-bar-wrapper">
                  <div className="occ-bar">
                    <div
                      className={`occ-fill ${item.occupancy_rate === 100 ? 'fill-full' : item.occupancy_rate > 70 ? 'fill-high' : 'fill-low'}`}
                      style={{ width: `${item.occupancy_rate}%` }}
                    />
                  </div>
                  <span className="occ-pct">{item.occupancy_rate}%</span>
                </div>
                <span className="occ-seats">{item.booked_seats}/{item.total_seats}</span>
              </div>
            ))}
            {occupancy.length === 0 && <p className="empty-text">No buses yet</p>}
          </div>
        </div>

        {/* Route-wise demand */}
        <div className="dashboard-section">
          <h3>Route Demand</h3>
          <div className="routes-list">
            {routes.map((r, i) => (
              <div key={i} className="route-item">
                <div className="route-info">
                  <MapPin size={14} />
                  <span className="route-name">{r.route}</span>
                </div>
                <div className="route-stats">
                  <span className="route-bookings">{r.total_bookings} bookings</span>
                  <span className="route-revenue">₹{r.revenue.toLocaleString('en-IN')}</span>
                </div>
              </div>
            ))}
            {routes.length === 0 && <p className="empty-text">No booking data yet</p>}
          </div>
        </div>
      </div>
    </div>
  );
}
