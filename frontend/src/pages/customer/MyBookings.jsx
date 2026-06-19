import { useEffect, useState } from 'react';
import { getMyBookings, cancelBooking } from '../../services/api';
import toast from 'react-hot-toast';
import { format } from 'date-fns';
import { Ticket, MapPin, Calendar, Hash, X } from 'lucide-react';

export default function MyBookings() {
  const [bookings, setBookings] = useState([]);
  const [loading, setLoading] = useState(true);
  const [cancelling, setCancelling] = useState(null);

  useEffect(() => {
    getMyBookings()
      .then((res) => setBookings(res.data))
      .catch(() => toast.error('Failed to load bookings'))
      .finally(() => setLoading(false));
  }, []);

  const handleCancel = async (id) => {
    if (!confirm('Are you sure you want to cancel this booking? Seats will be released.')) return;
    setCancelling(id);
    try {
      const res = await cancelBooking(id);
      setBookings((prev) => prev.map((b) => (b.id === id ? res.data : b)));
      toast.success('Booking cancelled successfully');
    } catch (err) {
      toast.error(err.response?.data?.detail || 'Cancel failed');
    } finally {
      setCancelling(null);
    }
  };

  if (loading) return <div className="loading">Loading bookings…</div>;

  const confirmed = bookings.filter((b) => b.status === 'Confirmed');
  const cancelled = bookings.filter((b) => b.status === 'Cancelled');

  return (
    <div className="page">
      <div className="page-header">
        <h2>My Bookings</h2>
        <div className="header-stats">
          <span className="chip-green">{confirmed.length} Active</span>
          <span className="chip-red">{cancelled.length} Cancelled</span>
        </div>
      </div>

      {bookings.length === 0 ? (
        <div className="empty-state">
          <Ticket size={48} opacity={0.3} />
          <p>No bookings yet. <a href="/customer/search">Search for buses</a> to get started.</p>
        </div>
      ) : (
        <div className="bookings-list">
          {bookings.map((booking) => (
            <div key={booking.id} className={`booking-card ${booking.status === 'Cancelled' ? 'booking-cancelled' : ''}`}>
              <div className="booking-header">
                <div>
                  <span className={`status-badge ${booking.status === 'Confirmed' ? 'status-confirmed' : 'status-cancelled'}`}>
                    {booking.status}
                  </span>
                  <span className="booking-ref"><Hash size={12} />{booking.booking_reference}</span>
                  {booking.seat_count > 1 && (
                    <span className="seat-count-badge">{booking.seat_count} seats</span>
                  )}
                </div>
                <p className="booking-fare">₹{booking.total_fare.toLocaleString('en-IN')}</p>
              </div>

              {booking.bus && (
                <div className="booking-route">
                  <MapPin size={14} />
                  <span>{booking.bus.origin} → {booking.bus.destination}</span>
                  <span className="bus-name-small">({booking.bus.name})</span>
                </div>
              )}

              <div className="booking-details">
                <div className="detail-item">
                  <Calendar size={13} />
                  <span>{format(new Date(booking.booked_at), 'dd MMM yyyy, hh:mm a')}</span>
                </div>
                {booking.bus && (
                  <div className="detail-item">
                    <span>Departure: {format(new Date(booking.bus.departure_time), 'dd MMM yyyy, hh:mm a')}</span>
                  </div>
                )}
                <div className="detail-item">
                  <span>Passenger: {booking.passenger_name}</span>
                </div>
                <div className="detail-item">
                  <span>
                    {booking.seat_count > 1 ? 'Seats' : 'Seat'}: {booking.seats?.map((s) => `#${s.seat_number}`).join(', ') || '–'}
                  </span>
                </div>
              </div>

              {booking.seat_allocation_note && booking.seat_count > 1 && (
                <p className="allocation-note">🪄 {booking.seat_allocation_note}</p>
              )}

              {booking.status === 'Confirmed' && (
                <button
                  className="btn-cancel"
                  onClick={() => handleCancel(booking.id)}
                  disabled={cancelling === booking.id}
                >
                  <X size={14} />
                  {cancelling === booking.id ? 'Cancelling…' : 'Cancel Booking'}
                </button>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
