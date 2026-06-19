import { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { login } from '../services/api';
import toast from 'react-hot-toast';
import { Bus, Mail, Lock } from 'lucide-react';

export default function LoginPage() {
  const [form, setForm] = useState({ email: '', password: '' });
  const [loading, setLoading] = useState(false);
  const { loginUser } = useAuth();
  const navigate = useNavigate();

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    try {
      const res = await login(form);
      loginUser(res.data.access_token, res.data.user);
      toast.success(`Welcome back, ${res.data.user.name}!`);
      navigate(res.data.user.role === 'admin' ? '/admin/dashboard' : '/customer/dashboard');
    } catch (err) {
      toast.error(err.response?.data?.detail || 'Login failed');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="auth-page">
      <div className="auth-card">
        <div className="auth-brand">
          <Bus size={40} className="brand-icon" />
          <h1>BusTix</h1>
          <p>Bus Ticketing Platform</p>
        </div>

        <form onSubmit={handleSubmit} className="auth-form">
          <h2>Sign In</h2>
          <div className="form-group">
            <label><Mail size={14} /> Email</label>
            <input
              type="email"
              value={form.email}
              onChange={(e) => setForm({ ...form, email: e.target.value })}
              placeholder="you@example.com"
              required
            />
          </div>
          <div className="form-group">
            <label><Lock size={14} /> Password</label>
            <input
              type="password"
              value={form.password}
              onChange={(e) => setForm({ ...form, password: e.target.value })}
              placeholder="••••••••"
              required
            />
          </div>
          <button type="submit" className="btn-primary btn-full" disabled={loading}>
            {loading ? 'Signing in…' : 'Sign In'}
          </button>
        </form>

        <div className="auth-demo-creds">
          <p className="demo-title">Demo Credentials</p>
          <div className="cred-row" onClick={() => setForm({ email: 'admin@busticket.com', password: 'admin123' })}>
            <span>⚙️ Admin</span><code>admin@busticket.com / admin123</code>
          </div>
          <div className="cred-row" onClick={() => setForm({ email: 'rahul@example.com', password: 'customer123' })}>
            <span>👤 Customer</span><code>rahul@example.com / customer123</code>
          </div>
        </div>

        <p className="auth-switch">Don't have an account? <Link to="/register">Register</Link></p>
      </div>
    </div>
  );
}
