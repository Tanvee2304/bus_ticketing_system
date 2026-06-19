import { format } from 'date-fns';
import { Clock, MapPin, Armchair, IndianRupee, Zap } from 'lucide-react';

const typeColors = { AC: 'badge-ac', 'Non-AC': 'badge-nonac', Sleeper: 'badge-sleeper' };

export default function BusCard({ bus, onBook }) {
  const isFull = bus.available_seats === 0;
  const dep = new Date(bus.departure_time);
  const arr = bus.arrival_time ? new Date(bus.arrival_time) : null;

  return (
    <div className={`bus-card ${isFull ? 'bus-card-full' : ''}`}>
      <div className="bus-card-header">
        <div>
          <h3 className="bus-name">{bus.name}</h3>
          <span className={`badge ${typeColors[bus.bus_type] || 'badge-ac'}`}>{bus.bus_type}</span>
        </div>
        <div className="bus-price">
          <IndianRupee size={16} />
          <span>{bus.price.toLocaleString('en-IN')}</span>
        </div>
      </div>

      <div className="bus-route">
        <div className="route-point">
          <MapPin size={14} className="icon-origin" />
          <div>
            <p className="city">{bus.origin}</p>
            <p className="time">{format(dep, 'hh:mm a')}</p>
            <p className="date-small">{format(dep, 'dd MMM yyyy')}</p>
          </div>
        </div>
        <div className="route-arrow">→</div>
        <div className="route-point">
          <MapPin size={14} className="icon-dest" />
          <div>
            <p className="city">{bus.destination}</p>
            {arr && <p className="time">{format(arr, 'hh:mm a')}</p>}
            {arr && <p className="date-small">{format(arr, 'dd MMM yyyy')}</p>}
          </div>
        </div>
      </div>

      <div className="bus-footer">
        <div className="seats-info">
          <Armchair size={15} />
          <span className={isFull ? 'seats-full' : 'seats-available'}>
            {isFull ? 'Sold Out' : `${bus.available_seats} seats left`}
          </span>
        </div>
        {onBook && (
          <button
            className={`btn-book ${isFull ? 'btn-disabled' : 'btn-primary'}`}
            onClick={() => !isFull && onBook(bus)}
            disabled={isFull}
          >
            {isFull ? 'Sold Out' : 'Book Now'}
          </button>
        )}
      </div>
    </div>
  );
}
