import { useEffect, useState } from 'react';
import { getAllBookings, cancelBooking } from '../../services/api';
import toast from 'react-hot-toast';
import { format } from 'date-fns';
import { Search, X } from 'lucide-react';

export default function AdminBookings() {
  const [bookings, setBookings] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [cancelling, setCancelling] = useState(null);

  useEffect(() => {
    getAllBookings()
      .then((r) => setBookings(r.data))
      .catch(() => toast.error('Failed to load bookings'))
      .finally(() => setLoading(false));
  }, []);

  const handleCancel = async (id) => {
    if (!confirm('Cancel this booking? Seat will be released.')) return;
    setCancelling(id);
    try {
      const res = await cancelBooking(id);
      setBookings((prev) => prev.map((b) => (b.id === id ? res.data : b)));
      toast.success('Booking cancelled');
    } catch (err) {
      toast.error(err.response?.data?.detail || 'Cancel failed');
    } finally {
      setCancelling(null);
    }
  };

  const filtered = bookings.filter((b) => {
    const q = search.toLowerCase();
    return (
      b.booking_reference.toLowerCase().includes(q) ||
      b.passenger_name.toLowerCase().includes(q) ||
      b.passenger_email.toLowerCase().includes(q) ||
      (b.bus?.origin + b.bus?.destination).toLowerCase().includes(q)
    );
  });

  const confirmed = bookings.filter((b) => b.status === 'Confirmed').length;
  const cancelled = bookings.filter((b) => b.status === 'Cancelled').length;

  if (loading) return <div className="loading">Loading bookings…</div>;

  return (
    <div className="page">
      <div className="page-header">
        <div>
          <h2>All Bookings</h2>
          <div className="header-stats">
            <span className="chip-green">{confirmed} Confirmed</span>
            <span className="chip-red">{cancelled} Cancelled</span>
          </div>
        </div>
        <div className="search-box">
          <Search size={16} />
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search by ref, name, route…"
          />
        </div>
      </div>

      <div className="table-wrapper">
        <table className="data-table">
          <thead>
            <tr>
              <th>Reference</th>
              <th>Passenger</th>
              <th>Route</th>
              <th>Bus</th>
              <th>Seat</th>
              <th>Fare</th>
              <th>Booked At</th>
              <th>Status</th>
              <th>Action</th>
            </tr>
          </thead>
          <tbody>
            {filtered.map((b) => (
              <tr key={b.id} className={b.status === 'Cancelled' ? 'row-cancelled' : ''}>
                <td><code className="ref-code">{b.booking_reference}</code></td>
                <td>
                  <p className="passenger-name">{b.passenger_name}</p>
                  <p className="passenger-email">{b.passenger_email}</p>
                </td>
                <td>{b.bus ? `${b.bus.origin} → ${b.bus.destination}` : '–'}</td>
                <td>{b.bus?.name || '–'}</td>
                <td>
                  {b.seats?.length ? b.seats.map((s) => `#${s.seat_number}`).join(', ') : '–'}
                  {b.seat_count > 1 && <span className="seat-count-tag"> ({b.seat_count})</span>}
                </td>
                <td>₹{b.total_fare.toLocaleString('en-IN')}</td>
                <td>{format(new Date(b.booked_at), 'dd MMM yy, hh:mm a')}</td>
                <td>
                  <span className={b.status === 'Confirmed' ? 'status-confirmed' : 'status-cancelled'}>
                    {b.status}
                  </span>
                </td>
                <td>
                  {b.status === 'Confirmed' && (
                    <button
                      className="icon-btn delete"
                      onClick={() => handleCancel(b.id)}
                      disabled={cancelling === b.id}
                      title="Cancel booking"
                    >
                      <X size={15} />
                    </button>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        {filtered.length === 0 && <div className="empty-state"><p>No bookings found</p></div>}
      </div>
    </div>
  );
}
