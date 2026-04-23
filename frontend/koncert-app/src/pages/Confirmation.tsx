import { useLocation, Link, Navigate } from 'react-router-dom';
import type { ReservationResponse } from '../api/types';
import { formatRsd } from '../lib/format';
import { useState } from 'react';

interface LocState {
  reservation?: ReservationResponse;
}

export default function Confirmation() {
  const { state } = useLocation();
  const reservation = (state as LocState | null)?.reservation;

  if (!reservation) return <Navigate to="/" replace />;

  return (
    <div className="stack" style={{ gap: 24, maxWidth: 720, margin: '0 auto' }}>
      <div className="panel confirmation">
        <div className="confirmation__check">✓</div>
        <span className="section-title__eyebrow">Uspešno</span>
        <h1 style={{ fontSize: '2rem', marginTop: 4 }}>Rezervacija potvrđena</h1>
        <p className="muted" style={{ marginTop: 8 }}>
          {reservation.firstName}, tvoje karte su sigurne. Sačuvaj token — trebaće ti za pristup rezervaciji.
        </p>

        <div className="stack" style={{ marginTop: 24, textAlign: 'left' }}>
          <CredentialRow label="Token za rezervaciju" value={reservation.token} />
          <CredentialRow label="Tvoj promo kod (−5% za prijatelja)" value={reservation.generatedPromoCode} />
        </div>
      </div>

      <div className="panel">
        <h3>Detalji rezervacije</h3>
        <div style={{ marginTop: 14 }}>
          <Row label="Zona" value={reservation.zoneName} />
          <Row label="Broj karata" value={reservation.ticketCount.toString()} />
          <Row
            label="Early bird"
            value={reservation.isEarlyBird ? 'Primenjen −10%' : 'Nije primenjen'}
          />
          <Row label="Ukupno" value={formatRsd(reservation.totalPrice)} bold />
          <Row label="Email" value={reservation.email} />
        </div>
      </div>

      <div className="row" style={{ justifyContent: 'center' }}>
        <Link to="/" className="btn btn--ghost">Nazad na početnu</Link>
        <Link
          to="/my"
          state={{ email: reservation.email, token: reservation.token }}
          className="btn btn--primary"
        >
          Otvori moju rezervaciju
        </Link>
      </div>
    </div>
  );
}

function Row({ label, value, bold }: { label: string; value: string; bold?: boolean }) {
  return (
    <div className="summary__row">
      <span className="summary__label">{label}</span>
      <span className="summary__value" style={bold ? { fontWeight: 700, fontSize: '1.1rem' } : undefined}>
        {value}
      </span>
    </div>
  );
}

function CredentialRow({ label, value }: { label: string; value: string }) {
  const [copied, setCopied] = useState(false);
  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(value);
      setCopied(true);
      setTimeout(() => setCopied(false), 1400);
    } catch {
      /* ignore */
    }
  };

  return (
    <div className="credential-card">
      <div>
        <div className="credential-card__label">{label}</div>
        <div className="credential-card__value">{value}</div>
      </div>
      <button type="button" className="btn btn--ghost btn--sm" onClick={handleCopy}>
        {copied ? 'Kopirano ✓' : 'Kopiraj'}
      </button>
    </div>
  );
}
