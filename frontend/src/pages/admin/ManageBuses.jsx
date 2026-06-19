import { useEffect, useState } from 'react';
import { getAllBuses, createBus, updateBus, deleteBus } from '../../services/api';
import toast from 'react-hot-toast';
import { Plus, Pencil, Trash2, X, Bus } from 'lucide-react';
import { format } from 'date-fns';

const empty = {
  name: '', origin: '', destination: '',
  departure_time: '', arrival_time: '',
  bus_type: 'AC', total_seats: 40, price: 500, is_active: true, seats_per_row: 4,
};

export default function ManageBuses() {
  const [buses, setBuses] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [editBus, setEditBus] = useState(null);
  const [form, setForm] = useState(empty);
  const [saving, setSaving] = useState(false);

  const load = () => getAllBuses().then((r) => setBuses(r.data)).catch(() => toast.error('Failed to load buses')).finally(() => setLoading(false));

  useEffect(() => { load(); }, []);

  const openCreate = () => { setForm(empty); setEditBus(null); setShowForm(true); };
  const openEdit = (bus) => {
    setEditBus(bus);
    setForm({
      ...bus,
      departure_time: bus.departure_time ? bus.departure_time.slice(0, 16) : '',
      arrival_time: bus.arrival_time ? bus.arrival_time.slice(0, 16) : '',
    });
    setShowForm(true);
  };

  const handleSave = async (e) => {
    e.preventDefault();
    setSaving(true);
    try {
      const payload = {
        ...form,
        total_seats: Number(form.total_seats),
        price: Number(form.price),
        seats_per_row: Number(form.seats_per_row),
        departure_time: new Date(form.departure_time).toISOString(),
        arrival_time: form.arrival_time ? new Date(form.arrival_time).toISOString() : null,
      };
      if (editBus) {
        const res = await updateBus(editBus.id, payload);
        setBuses((prev) => prev.map((b) => (b.id === editBus.id ? res.data : b)));
        toast.success('Bus updated!');
      } else {
        const res = await createBus(payload);
        setBuses((prev) => [...prev, res.data]);
        toast.success('Bus created!');
      }
      setShowForm(false);
    } catch (err) {
      toast.error(err.response?.data?.detail || 'Save failed');
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (id) => {
    if (!confirm('Delete this bus? All booking data will be lost.')) return;
    try {
      await deleteBus(id);
      setBuses((prev) => prev.filter((b) => b.id !== id));
      toast.success('Bus deleted');
    } catch (err) {
      toast.error(err.response?.data?.detail || 'Delete failed');
    }
  };

  const typeColor = { AC: '#3b82f6', 'Non-AC': '#f59e0b', Sleeper: '#8b5cf6' };

  if (loading) return <div className="loading">Loading buses…</div>;

  return (
    <div className="page">
      <div className="page-header">
        <div>
          <h2>Manage Buses</h2>
          <p>{buses.length} buses in system</p>
        </div>
        <button className="btn-primary" onClick={openCreate}><Plus size={16} /> Add Bus</button>
      </div>

      <div className="table-wrapper">
        <table className="data-table">
          <thead>
            <tr>
              <th>Bus Name</th>
              <th>Route</th>
              <th>Departure</th>
              <th>Type</th>
              <th>Layout</th>
              <th>Seats</th>
              <th>Price</th>
              <th>Status</th>
              <th>Actions</th>
            </tr>
          </thead>
          <tbody>
            {buses.map((bus) => (
              <tr key={bus.id}>
                <td className="bus-name-cell">
                  <Bus size={14} style={{ color: typeColor[bus.bus_type] }} /> {bus.name}
                </td>
                <td>{bus.origin} → {bus.destination}</td>
                <td>{format(new Date(bus.departure_time), 'dd MMM yy, hh:mm a')}</td>
                <td><span className={`badge badge-${bus.bus_type.toLowerCase().replace('-', '')}`}>{bus.bus_type}</span></td>
                <td className="layout-cell">{bus.seats_per_row === 3 ? '2+1' : '2+2'}</td>
                <td>
                  <span className={bus.available_seats === 0 ? 'seats-full' : 'seats-ok'}>
                    {bus.available_seats}/{bus.total_seats}
                  </span>
                </td>
                <td>₹{bus.price.toLocaleString('en-IN')}</td>
                <td>
                  <span className={bus.is_active ? 'status-active' : 'status-inactive'}>
                    {bus.is_active ? 'Active' : 'Inactive'}
                  </span>
                </td>
                <td className="actions-cell">
                  <button className="icon-btn edit" onClick={() => openEdit(bus)}><Pencil size={15} /></button>
                  <button className="icon-btn delete" onClick={() => handleDelete(bus.id)}><Trash2 size={15} /></button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        {buses.length === 0 && <div className="empty-state"><p>No buses yet. Add one!</p></div>}
      </div>

      {showForm && (
        <div className="modal-overlay" onClick={(e) => e.target === e.currentTarget && setShowForm(false)}>
          <div className="modal modal-large">
            <div className="modal-header">
              <h2>{editBus ? 'Edit Bus' : 'Add New Bus'}</h2>
              <button className="modal-close" onClick={() => setShowForm(false)}><X size={20} /></button>
            </div>
            <form onSubmit={handleSave} className="bus-form">
              <div className="form-row">
                <div className="form-group">
                  <label>Bus Name *</label>
                  <input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} placeholder="KPN Travels" required />
                </div>
                <div className="form-group">
                  <label>Bus Type *</label>
                  <select value={form.bus_type} onChange={(e) => setForm({ ...form, bus_type: e.target.value })}>
                    <option value="AC">AC</option>
                    <option value="Non-AC">Non-AC</option>
                    <option value="Sleeper">Sleeper</option>
                  </select>
                </div>
              </div>
              <div className="form-row">
                <div className="form-group">
                  <label>Origin *</label>
                  <input value={form.origin} onChange={(e) => setForm({ ...form, origin: e.target.value })} placeholder="Hyderabad" required />
                </div>
                <div className="form-group">
                  <label>Destination *</label>
                  <input value={form.destination} onChange={(e) => setForm({ ...form, destination: e.target.value })} placeholder="Bangalore" required />
                </div>
              </div>
              <div className="form-row">
                <div className="form-group">
                  <label>Departure Time *</label>
                  <input type="datetime-local" value={form.departure_time} onChange={(e) => setForm({ ...form, departure_time: e.target.value })} required />
                </div>
                <div className="form-group">
                  <label>Arrival Time</label>
                  <input type="datetime-local" value={form.arrival_time} onChange={(e) => setForm({ ...form, arrival_time: e.target.value })} />
                </div>
              </div>
              <div className="form-row">
                <div className="form-group">
                  <label>Total Seats *</label>
                  <input type="number" min="1" value={form.total_seats} onChange={(e) => setForm({ ...form, total_seats: e.target.value })} required />
                </div>
                <div className="form-group">
                  <label>Price (₹) *</label>
                  <input type="number" min="1" value={form.price} onChange={(e) => setForm({ ...form, price: e.target.value })} required />
                </div>
              </div>
              <div className="form-row">
                <div className="form-group">
                  <label>Seat Layout *</label>
                  <select value={form.seats_per_row} onChange={(e) => setForm({ ...form, seats_per_row: Number(e.target.value) })}>
                    <option value={4}>2 + 2 (standard, 4 across)</option>
                    <option value={3}>2 + 1 (sleeper/premium, 3 across)</option>
                  </select>
                  <p className="field-hint">Used by the Smart Seat Optimizer to find adjacent group seats</p>
                </div>
              </div>
              <div className="form-group">
                <label className="checkbox-label">
                  <input type="checkbox" checked={form.is_active} onChange={(e) => setForm({ ...form, is_active: e.target.checked })} />
                  Active (visible to customers)
                </label>
              </div>
              <div className="modal-actions">
                <button type="button" className="btn-secondary" onClick={() => setShowForm(false)}>Cancel</button>
                <button type="submit" className="btn-primary" disabled={saving}>
                  {saving ? 'Saving…' : editBus ? 'Update Bus' : 'Create Bus'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
