import { useState } from 'react';
import { aiSearch, getBuses } from '../../services/api';
import BusCard from '../../components/BusCard';
import BookingModal from '../../components/BookingModal';
import toast from 'react-hot-toast';
import { Sparkles, Search, Filter } from 'lucide-react';

const suggestions = [
  "I need a bus from Hyderabad to Bangalore tomorrow morning, preferably AC",
  "Sleeper bus from Mumbai to Goa this weekend",
  "Affordable non-AC bus from Bangalore to Chennai tonight",
  "AC bus from Pune to Mumbai afternoon under 500 rupees",
];

export default function SearchBuses() {
  const [query, setQuery] = useState('');
  const [buses, setBuses] = useState([]);
  const [interpreted, setInterpreted] = useState(null);
  const [message, setMessage] = useState('');
  const [loading, setLoading] = useState(false);
  const [selectedBus, setSelectedBus] = useState(null);
  const [mode, setMode] = useState('ai'); // 'ai' | 'manual'

  // Manual filter state
  const [filters, setFilters] = useState({ origin: '', destination: '', date: '', bus_type: '' });

  const handleAISearch = async (e) => {
    e?.preventDefault();
    if (!query.trim()) { toast.error('Please enter a search query'); return; }
    setLoading(true);
    try {
      const res = await aiSearch(query);
      setBuses(res.data.buses);
      setInterpreted(res.data.interpreted);
      setMessage(res.data.message);
    } catch (err) {
      toast.error(err.response?.data?.detail || 'Search failed');
    } finally {
      setLoading(false);
    }
  };

  const handleManualSearch = async (e) => {
    e?.preventDefault();
    setLoading(true);
    try {
      const params = { available_only: true };
      if (filters.origin) params.origin = filters.origin;
      if (filters.destination) params.destination = filters.destination;
      if (filters.date) params.date = filters.date;
      if (filters.bus_type) params.bus_type = filters.bus_type;
      const res = await getBuses(params);
      setBuses(res.data);
      setInterpreted(null);
      setMessage(`Found ${res.data.length} bus(es).`);
    } catch (err) {
      toast.error('Search failed');
    } finally {
      setLoading(false);
    }
  };

  const handleBookingSuccess = (booking) => {
    setBuses((prev) =>
      prev.map((b) =>
        b.id === booking.bus_id
          ? { ...b, available_seats: b.available_seats - booking.seat_count }
          : b
      )
    );
    setSelectedBus(null);
  };

  return (
    <div className="page">
      <div className="page-header">
        <h2>Find Your Bus</h2>
        <div className="mode-toggle">
          <button className={mode === 'ai' ? 'toggle-active' : 'toggle-btn'} onClick={() => setMode('ai')}>
            <Sparkles size={15} /> AI Search
          </button>
          <button className={mode === 'manual' ? 'toggle-active' : 'toggle-btn'} onClick={() => setMode('manual')}>
            <Filter size={15} /> Filter
          </button>
        </div>
      </div>

      {mode === 'ai' ? (
        <div className="ai-search-section">
          <div className="ai-badge"><Sparkles size={16} /> Powered by Claude AI</div>
          <form onSubmit={handleAISearch} className="ai-search-form">
            <textarea
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder='Try: "I need a sleeper bus from Hyderabad to Bangalore tomorrow night"'
              rows={3}
              className="ai-textarea"
            />
            <button type="submit" className="btn-primary btn-search" disabled={loading}>
              {loading ? 'Searching…' : <><Search size={16} /> Search</>}
            </button>
          </form>
          <div className="suggestions">
            <p className="suggestions-label">Try these:</p>
            {suggestions.map((s, i) => (
              <button key={i} className="suggestion-chip" onClick={() => setQuery(s)}>{s}</button>
            ))}
          </div>

          {interpreted && (
            <div className="interpreted-box">
              <p className="interpreted-title">🤖 I understood:</p>
              <div className="interpreted-tags">
                {interpreted.origin && <span className="itag">From: {interpreted.origin}</span>}
                {interpreted.destination && <span className="itag">To: {interpreted.destination}</span>}
                {interpreted.date && <span className="itag">Date: {interpreted.date}</span>}
                {interpreted.bus_type && <span className="itag">Type: {interpreted.bus_type}</span>}
                {interpreted.time_preference && <span className="itag">Time: {interpreted.time_preference}</span>}
                {interpreted.max_price && <span className="itag">Max: ₹{interpreted.max_price}</span>}
              </div>
            </div>
          )}
        </div>
      ) : (
        <form onSubmit={handleManualSearch} className="filter-form">
          <div className="filter-grid">
            <div className="form-group">
              <label>From</label>
              <input value={filters.origin} onChange={(e) => setFilters({ ...filters, origin: e.target.value })} placeholder="Hyderabad" />
            </div>
            <div className="form-group">
              <label>To</label>
              <input value={filters.destination} onChange={(e) => setFilters({ ...filters, destination: e.target.value })} placeholder="Bangalore" />
            </div>
            <div className="form-group">
              <label>Date</label>
              <input type="date" value={filters.date} onChange={(e) => setFilters({ ...filters, date: e.target.value })} />
            </div>
            <div className="form-group">
              <label>Bus Type</label>
              <select value={filters.bus_type} onChange={(e) => setFilters({ ...filters, bus_type: e.target.value })}>
                <option value="">All Types</option>
                <option value="AC">AC</option>
                <option value="Non-AC">Non-AC</option>
                <option value="Sleeper">Sleeper</option>
              </select>
            </div>
          </div>
          <button type="submit" className="btn-primary" disabled={loading}>
            {loading ? 'Searching…' : 'Search Buses'}
          </button>
        </form>
      )}

      {message && <p className="search-message">{message}</p>}

      <div className="buses-grid">
        {buses.map((bus) => (
          <BusCard key={bus.id} bus={bus} onBook={setSelectedBus} />
        ))}
        {buses.length === 0 && message && (
          <div className="empty-state">
            <p>No buses found. Try a different search.</p>
          </div>
        )}
      </div>

      {selectedBus && (
        <BookingModal
          bus={selectedBus}
          onClose={() => setSelectedBus(null)}
          onSuccess={handleBookingSuccess}
        />
      )}
    </div>
  );
}
