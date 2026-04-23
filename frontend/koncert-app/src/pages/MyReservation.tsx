import { useEffect, useState } from 'react';
import { useLocation } from 'react-router-dom';
import {
  getReservation,
  updateReservation,
  cancelReservation,
  getConcert,
} from '../api/endpoints';
import { extractErrorMessage } from '../api/client';
import type { ReservationResponse, ConcertInfo } from '../api/types';
import { Field } from '../components/Field';
import TicketCounter from '../components/TicketCounter';
import Alert from '../components/Alert';
import { formatRsd, formatDate } from '../lib/format';

interface LocState {
  email?: string;
  token?: string;
}

export default function MyReservation() {
  const { state } = useLocation();
  const initial = state as LocState | null;

  const [email, setEmail] = useState(initial?.email ?? '');
  const [token, setToken] = useState(initial?.token ?? '');
  const [reservation, setReservation] = useState<ReservationResponse | null>(null);
  const [concert, setConcert] = useState<ConcertInfo | null>(null);

  const [loading, setLoading] = useState(false);
  const [actionLoading, setActionLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);

  const [editTickets, setEditTickets] = useState<number | null>(null);
  const [confirmCancel, setConfirmCancel] = useState(false);

  useEffect(() => {
    if (initial?.email && initial.token) {
      void handleFind(initial.email, initial.token);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const handleFind = async (e?: string, t?: string) => {
    const eMail = (e ?? email).trim();
    const tkn = (t ?? token).trim();
    if (!eMail || !tkn) {
      setError('Email i token su obavezni.');
      return;
    }
    setLoading(true);
    setError(null);
    setNotice(null);
    setReservation(null);
    setConfirmCancel(false);
    try {
      const [r, c] = await Promise.all([getReservation(eMail, tkn), getConcert()]);
      setReservation(r);
      setConcert(c);
      setEditTickets(r.ticketCount);
    } catch (err) {
      setError(extractErrorMessage(err));
    } finally {
      setLoading(false);
    }
  };

  const zone = concert?.zones.find((z) => z.id === reservation?.zoneId);
  const maxTickets = (() => {
    if (!zone || !reservation) return 50;
    const othersOccupied = (zone.capacity - zone.availableSeats) - reservation.ticketCount;
    return Math.min(50, zone.capacity - othersOccupied);
  })();

  const handleUpdate = async () => {
    if (!reservation || editTickets == null) return;
    if (editTickets === reservation.ticketCount) return;
    setActionLoading(true);
    setError(null);
    setNotice(null);
    try {
      const updated = await updateReservation({
        email: reservation.email,
        token: reservation.token,
        ticketCount: editTickets,
      });
      setReservation(updated);
      setNotice('Rezervacija je ažurirana.');
      const fresh = await getConcert();
      setConcert(fresh);
    } catch (err) {
      setError(extractErrorMessage(err));
    } finally {
      setActionLoading(false);
    }
  };

  const handleCancel = async () => {
    if (!reservation) return;
    setActionLoading(true);
    setError(null);
    setNotice(null);
    try {
      await cancelReservation({
        email: reservation.email,
        token: reservation.token,
      });
      setReservation(null);
      setConfirmCancel(false);
      setNotice('Rezervacija je otkazana. Token više nije važeći.');
    } catch (err) {
      setError(extractErrorMessage(err));
    } finally {
      setActionLoading(false);
    }
  };

  return (
    <div className="stack" style={{ gap: 24, maxWidth: 820, margin: '0 auto' }}>
      <div>
        <span className="section-title__eyebrow">Moja rezervacija</span>
        <h1 style={{ fontSize: '2rem', marginTop: 6 }}>Pristupi svojim kartama</h1>
        <p className="muted" style={{ marginTop: 8 }}>
          Unesi email i token koji si dobio/la prilikom rezervacije.
        </p>
      </div>

      <form
        className="panel"
        onSubmit={(e) => {
          e.preventDefault();
          void handleFind();
        }}
      >
        <div className="form__grid">
          <Field
            label="Email" required type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="marko@example.com"
          />
          <Field
            label="Token" required
            value={token}
            onChange={(e) => setToken(e.target.value)}
            placeholder="32-karakterni token"
          />
        </div>
        <div className="row" style={{ marginTop: 14 }}>
          <button type="submit" className="btn btn--primary" disabled={loading}>
            {loading ? 'Pretraga…' : 'Pronađi rezervaciju'}
          </button>
        </div>
      </form>

      {error && <Alert variant="error">{error}</Alert>}
      {notice && <Alert variant="success">{notice}</Alert>}

      {reservation && (
        <div className="stack" style={{ gap: 20 }}>
          <div className="panel">
            <div className="between">
              <div>
                <span className="section-title__eyebrow">Detalji</span>
                <h2 style={{ marginTop: 4 }}>{reservation.zoneName}</h2>
                <p className="muted" style={{ marginTop: 4 }}>
                  Kreirano: {formatDate(reservation.createdAt)} · Status:{' '}
                  <strong style={{ color: '#fff' }}>{reservation.status}</strong>
                </p>
              </div>
              <div style={{ textAlign: 'right' }}>
                <div className="muted" style={{ fontSize: 12 }}>Ukupno</div>
                <div style={{ fontSize: '1.8rem', fontWeight: 700, fontFamily: 'Space Grotesk' }}>
                  {formatRsd(reservation.totalPrice)}
                </div>
                {reservation.isEarlyBird && (
                  <span className="summary__discount">Early bird</span>
                )}
              </div>
            </div>

            <div style={{ marginTop: 18 }}>
              <div className="summary__row">
                <span className="summary__label">Broj karata (trenutno)</span>
                <span className="summary__value">{reservation.ticketCount}</span>
              </div>
              <div className="summary__row">
                <span className="summary__label">Kupac</span>
                <span className="summary__value">
                  {reservation.firstName} {reservation.lastName}
                </span>
              </div>
              <div className="summary__row">
                <span className="summary__label">Email</span>
                <span className="summary__value">{reservation.email}</span>
              </div>
              <div className="summary__row">
                <span className="summary__label">Adresa</span>
                <span className="summary__value">
                  {reservation.address1}
                  {reservation.address2 ? `, ${reservation.address2}` : ''},{' '}
                  {reservation.postalCode} {reservation.city}, {reservation.country}
                </span>
              </div>
              <div className="summary__row">
                <span className="summary__label">Tvoj promo kod</span>
                <span className="summary__value mono">{reservation.generatedPromoCode}</span>
              </div>
            </div>
          </div>

          <div className="panel">
            <h3>Izmeni broj karata</h3>
            <p className="muted" style={{ marginTop: 6, fontSize: '0.9rem' }}>
              Cena se ponovo obračunava po istim pravilima popusta.
            </p>
            <div className="row" style={{ marginTop: 16, gap: 16 }}>
              <TicketCounter
                value={editTickets ?? reservation.ticketCount}
                onChange={setEditTickets}
                min={1}
                max={maxTickets}
              />
              <button
                type="button"
                className="btn btn--primary"
                disabled={
                  actionLoading ||
                  editTickets == null ||
                  editTickets === reservation.ticketCount
                }
                onClick={handleUpdate}
              >
                {actionLoading ? 'Snimam…' : 'Sačuvaj izmene'}
              </button>
            </div>
            {zone && (
              <p className="dim" style={{ fontSize: 12, marginTop: 10 }}>
                Maksimum u zoni uz ovu rezervaciju: {maxTickets}
              </p>
            )}
          </div>

          <div className="panel">
            <h3 style={{ color: '#ffc7d0' }}>Otkazivanje rezervacije</h3>
            <p className="muted" style={{ marginTop: 6, fontSize: '0.9rem' }}>
              Token prestaje da važi. Promo kod koji si dobio/la postaje nevažeći (ako još nije iskorišćen).
            </p>
            <div className="row" style={{ marginTop: 16 }}>
              {!confirmCancel ? (
                <button
                  type="button"
                  className="btn btn--danger"
                  onClick={() => setConfirmCancel(true)}
                  disabled={actionLoading}
                >
                  Otkaži rezervaciju
                </button>
              ) : (
                <>
                  <span className="muted" style={{ fontSize: 14 }}>
                    Siguran/na si?
                  </span>
                  <button
                    type="button"
                    className="btn btn--danger"
                    onClick={handleCancel}
                    disabled={actionLoading}
                  >
                    {actionLoading ? 'Otkazivanje…' : 'Da, otkaži'}
                  </button>
                  <button
                    type="button"
                    className="btn btn--ghost"
                    onClick={() => setConfirmCancel(false)}
                    disabled={actionLoading}
                  >
                    Odustani
                  </button>
                </>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
