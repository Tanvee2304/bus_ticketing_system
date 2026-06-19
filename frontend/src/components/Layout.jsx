import { Outlet, NavLink, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { Bus, LayoutDashboard, Ticket, Search, LogOut, Menu, X } from 'lucide-react';
import { useState } from 'react';

const adminNav = [
  { to: '/admin/dashboard', icon: LayoutDashboard, label: 'Dashboard' },
  { to: '/admin/buses', icon: Bus, label: 'Manage Buses' },
  { to: '/admin/bookings', icon: Ticket, label: 'All Bookings' },
];

const customerNav = [
  { to: '/customer/dashboard', icon: LayoutDashboard, label: 'Home' },
  { to: '/customer/search', icon: Search, label: 'Search Buses' },
  { to: '/customer/bookings', icon: Ticket, label: 'My Bookings' },
];

export default function Layout({ role }) {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const navItems = role === 'admin' ? adminNav : customerNav;

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  return (
    <div className="app-layout">
      {/* Sidebar */}
      <aside className={`sidebar ${sidebarOpen ? 'open' : ''}`}>
        <div className="sidebar-header">
          <Bus size={28} className="brand-icon" />
          <span className="brand-name">BusTix</span>
          <button className="sidebar-close" onClick={() => setSidebarOpen(false)}>
            <X size={20} />
          </button>
        </div>
        <div className="user-info">
          <div className="user-avatar">{user?.name?.[0]?.toUpperCase()}</div>
          <div>
            <p className="user-name">{user?.name}</p>
            <p className="user-role">{role === 'admin' ? '⚙️ Admin' : '👤 Customer'}</p>
          </div>
        </div>
        <nav className="sidebar-nav">
          {navItems.map(({ to, icon: Icon, label }) => (
            <NavLink
              key={to}
              to={to}
              className={({ isActive }) => `nav-item ${isActive ? 'active' : ''}`}
              onClick={() => setSidebarOpen(false)}
            >
              <Icon size={20} />
              <span>{label}</span>
            </NavLink>
          ))}
        </nav>
        <button className="logout-btn" onClick={handleLogout}>
          <LogOut size={18} />
          <span>Logout</span>
        </button>
      </aside>

      {/* Main content */}
      <div className="main-content">
        <header className="topbar">
          <button className="menu-toggle" onClick={() => setSidebarOpen(true)}>
            <Menu size={22} />
          </button>
          <h1 className="page-title">Bus Ticketing System</h1>
        </header>
        <main className="page-body">
          <Outlet />
        </main>
      </div>

      {sidebarOpen && <div className="sidebar-overlay" onClick={() => setSidebarOpen(false)} />}
    </div>
  );
}
