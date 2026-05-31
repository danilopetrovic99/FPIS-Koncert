import type { ZoneInfo } from '../api/types';
import { formatRsd } from '../lib/format';

interface Props {
  zone: ZoneInfo;
  onSelect?: (zone: ZoneInfo) => void;
  compact?: boolean;
}

export default function ZoneCard({ zone, onSelect, compact }: Props) {
  const soldOut = zone.availableSeats <= 0;
  const low = !soldOut && zone.availableSeats / zone.capacity < 0.15;
  // koliko je procenata zone popunjeno (za traku ispod cene)
  const popunjenost = ((zone.capacity - zone.availableSeats) / zone.capacity) * 100;

  return (
    <div className={`zone-card ${soldOut ? 'zone-card--soldout' : ''}`}>
      <div className="zone-card__head">
        <div className="zone-card__name">{zone.name}</div>
        {soldOut ? (
          <span className="zone-card__tag zone-card__tag--soldout">Rasprodato</span>
        ) : low ? (
          <span className="zone-card__tag zone-card__tag--low">Poslednja mesta</span>
        ) : (
          <span className="zone-card__tag">Dostupno</span>
        )}
      </div>

      <div className="zone-card__price">
        <strong>{formatRsd(zone.pricePerTicket)}</strong>
        <small>/ karta</small>
      </div>

      <div>
        <div className="zone-card__bar" aria-hidden>
          <span style={{ width: `${Math.min(100, Math.max(3, popunjenost))}%` }} />
        </div>
        <div className="zone-card__avail">
          <span>{zone.availableSeats} slobodnih mesta</span>
          <span className="dim">/ {zone.capacity}</span>
        </div>
      </div>

      {!compact && onSelect && (
        <button
          type="button"
          className="btn btn--primary btn--block"
          disabled={soldOut}
          onClick={() => onSelect(zone)}
        >
          {soldOut ? 'Nema više karata' : 'Izaberi zonu'}
        </button>
      )}
    </div>
  );
}
