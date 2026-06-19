import { useState, useEffect, useRef } from 'react';
import { createBooking, previewSeats } from '../services/api';
import toast from 'react-hot-toast';
import { X, User, Mail, Phone, IndianRupee, Minus, Plus, Sparkles, CheckCircle2, AlertTriangle } from 'lucide-react';
import { format } from 'date-fns';

export default function BookingModal({ bus, onClose, onSuccess }) {
  const [form, setForm] = useState({ passenger_name: '', passenger_email: '', passenger_phone: '' });
  const [seatCount, setSeatCount] = useState(1);
  const [loading, setLoading] = useState(false);
  const [preview, setPreview] = useState(null);
  const [previewLoading, setPreviewLoading] = useState(false);
  const debounceRef = useRef(null);

  const maxBookable = Math.min(bus.available_seats, 10);

  const adjustSeats = (delta) => {
    setSeatCount((prev) => {
      const next = prev + delta;
      if (next < 1) return 1;
      if (next > maxBookable) return maxBookable;
      return next;
    });
  };

  // Debounced fetch of the seat preview whenever seatCount changes
  useEffect(() => {
    if (debounceRef.current) clearTimeout(debounceRef.current);
    setPreviewLoading(true);
    debounceRef.current = setTimeout(async () => {
      try {
        const res = await previewSeats(bus.id, seatCount);
        setPreview(res.data);
      } catch (err) {
        setPreview(null);
      } finally {
        setPreviewLoading(false);
      }
    }, 350);
    return () => clearTimeout(debounceRef.current);
  }, [seatCount, bus.id]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!form.passenger_name || !form.passenger_email || !form.passenger_phone) {
      toast.error('All fields are required');
      return;
    }
    setLoading(true);
    try {
      const res = await createBooking({ bus_id: bus.id, seat_count: seatCount, ...form });
      toast.success(`Booking confirmed! Ref: ${res.data.booking_reference} (${res.data.seat_count} seat${res.data.seat_count > 1 ? 's' : ''})`);
      onSuccess(res.data);
    } catch (err) {
      toast.error(err.response?.data?.detail || 'Booking failed');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="modal-overlay" onClick={(e) => e.target === e.currentTarget && onClose()}>
      <div className="modal">
        <div className="modal-header">
          <h2>Book Ticket</h2>
          <button className="modal-close" onClick={onClose}><X size={20} /></button>
        </div>

        <div className="booking-bus-summary">
          <p className="summary-route">{bus.origin} → {bus.destination}</p>
          <p className="summary-detail">{bus.name} • {bus.bus_type}</p>
          <p className="summary-detail">{format(new Date(bus.departure_time), 'dd MMM yyyy, hh:mm a')}</p>
          <p className="summary-detail">{bus.available_seats} seat{bus.available_seats !== 1 ? 's' : ''} available</p>
        </div>

        <form onSubmit={handleSubmit} className="booking-form">
          <div className="form-group">
            <label>Number of Seats</label>
            <div className="seat-stepper">
              <button type="button" className="stepper-btn" onClick={() => adjustSeats(-1)} disabled={seatCount <= 1}>
                <Minus size={16} />
              </button>
              <span className="stepper-value">{seatCount}</span>
              <button type="button" className="stepper-btn" onClick={() => adjustSeats(1)} disabled={seatCount >= maxBookable}>
                <Plus size={16} />
              </button>
              <span className="stepper-hint">max {maxBookable} per booking</span>
            </div>
          </div>

          {/* Smart Seat Optimizer preview */}
          {seatCount > 1 && (
            <div className="seat-optimizer-box">
              <div className="optimizer-label">
                <Sparkles size={14} /> Smart Seat Optimizer
              </div>
              {previewLoading ? (
                <p className="optimizer-loading">Finding the best seats for your group…</p>
              ) : preview ? (
                <>
                  <div className={`optimizer-status ${preview.is_fully_adjacent ? 'optimizer-good' : 'optimizer-warn'}`}>
                    {preview.is_fully_adjacent ? <CheckCircle2 size={15} /> : <AlertTriangle size={15} />}
                    <span>{preview.reason}</span>
                  </div>
                  <div className="seat-chips">
                    {preview.seats.map((s) => (
                      <span key={s.seat_number} className="seat-chip">
                        #{s.seat_number} <span className="seat-chip-pos">{s.position}</span>
                      </span>
                    ))}
                  </div>
                </>
              ) : (
                <p className="optimizer-loading">Couldn't load seat preview.</p>
              )}
            </div>
          )}

          <div className="form-group">
            <label><User size={14} /> Passenger Name</label>
            <input
              type="text"
              value={form.passenger_name}
              onChange={(e) => setForm({ ...form, passenger_name: e.target.value })}
              placeholder="Full name as on ID"
              required
            />
            <p className="field-hint">One name covers the whole group booking</p>
          </div>
          <div className="form-group">
            <label><Mail size={14} /> Email</label>
            <input
              type="email"
              value={form.passenger_email}
              onChange={(e) => setForm({ ...form, passenger_email: e.target.value })}
              placeholder="email@example.com"
              required
            />
          </div>
          <div className="form-group">
            <label><Phone size={14} /> Phone</label>
            <input
              type="tel"
              value={form.passenger_phone}
              onChange={(e) => setForm({ ...form, passenger_phone: e.target.value })}
              placeholder="+91 XXXXXXXXXX"
              required
            />
          </div>

          <div className="fare-breakdown">
            <span>{bus.price.toLocaleString('en-IN')} × {seatCount} seat{seatCount > 1 ? 's' : ''}</span>
            <span className="fare-total"><IndianRupee size={14} />{(bus.price * seatCount).toLocaleString('en-IN')}</span>
          </div>

          <div className="modal-actions">
            <button type="button" className="btn-secondary" onClick={onClose}>Cancel</button>
            <button type="submit" className="btn-primary" disabled={loading}>
              {loading ? 'Confirming…' : `Confirm Booking (${seatCount} seat${seatCount > 1 ? 's' : ''})`}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
