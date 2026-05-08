import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { getConcert } from '../api/endpoints';
import { extractErrorMessage } from '../api/client';
import type { ConcertInfo, ZoneInfo } from '../api/types';
import { formatDate, formatRsd } from '../lib/format';
import ZoneCard from '../components/ZoneCard';
import Alert from '../components/Alert';

export default function Home() {
  const navigate = useNavigate();
  const [concert, setConcert] = useState<ConcertInfo | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    getConcert()
      .then((c) => !cancelled && setConcert(c))
      .catch((e) => !cancelled && setError(extractErrorMessage(e)))
      .finally(() => !cancelled && setLoading(false));
    return () => {
      cancelled = true;
    };
  }, []);

  const goBook = (zone?: ZoneInfo) => {
    navigate('/book', zone ? { state: { zoneId: zone.id } } : undefined);
  };

  if (loading) {
    return (
      <div className="stack" aria-busy>
        <div className="skeleton" style={{ height: 280 }} />
        <div className="zones-grid">
          {Array.from({ length: 4 }).map((_, i) => (
            <div key={i} className="skeleton" style={{ height: 220 }} />
          ))}
        </div>
      </div>
    );
  }

  if (error || !concert) {
    return (
      <Alert variant="error">
        {error ?? 'Nije moguće učitati podatke o koncertu.'}
      </Alert>
    );
  }

  const minPrice = concert.zones.reduce(
    (min, z) => (z.pricePerTicket < min ? z.pricePerTicket : min),
    concert.zones[0]?.pricePerTicket ?? 0,
  );

  return (
    <div className="stack" style={{ gap: 32 }}>
      {/* HERO */}
      <section className="hero">
        <div className="hero__content">
          {concert.isEarlyBirdActive && (
            <span className="hero__badge">
              Early Bird aktivan — do {formatDate(concert.earlyBirdDeadline)}
            </span>
          )}
          <h1 className="hero__title">{concert.name}</h1>
          <p className="hero__subtitle">
            {concert.additionalInfo ??
              'Nezaboravno veče uz najveće hitove italijanskog maestra. Obezbedite svoje mesto danas.'}
          </p>

          <div className="hero__meta">
            <div className="hero__meta-item">
              <div className="hero__meta-icon">📅</div>
              <div>
                <div className="muted" style={{ fontSize: 12 }}>Datum</div>
                <div>{concert.concertDates}</div>
              </div>
            </div>
            <div className="hero__meta-item">
              <div className="hero__meta-icon">📍</div>
              <div>
                <div className="muted" style={{ fontSize: 12 }}>Lokacija</div>
                <div>{concert.location}, {concert.city}</div>
              </div>
            </div>
            <div className="hero__meta-item">
              <div className="hero__meta-icon">🎟</div>
              <div>
                <div className="muted" style={{ fontSize: 12 }}>Cena od</div>
                <div>{formatRsd(minPrice)}</div>
              </div>
            </div>
          </div>

          <div className="hero__cta">
            <button className="btn btn--primary" onClick={() => goBook()}>
              Rezerviši kartu
            </button>
            <button className="btn btn--ghost" onClick={() => document.getElementById('zones')?.scrollIntoView({ behavior: 'smooth' })}>
              Pogledaj zone
            </button>
          </div>
        </div>
      </section>

      {/* ZONE */}
      <section id="zones">
        <div className="section-title">
          <div>
            <span className="section-title__eyebrow">Izaberi zonu</span>
            <h2>Karte i dostupnost</h2>
          </div>
          <span className="muted" style={{ fontSize: 14 }}>
            {concert.zones.length} zona · uživo ažuriranje
          </span>
        </div>

        <div className="zones-grid">
          {concert.zones.map((z) => (
            <ZoneCard key={z.id} zone={z} onSelect={goBook} />
          ))}
        </div>
      </section>

      {/* PRICING PRAVILA */}
      <section>
        <div className="section-title">
          <div>
            <span className="section-title__eyebrow">Kako radi popust</span>
            <h2>Uštedi još više</h2>
          </div>
        </div>

        <div className="zones-grid">
          <div className="panel panel--tight">
            <h4>Early Bird −10%</h4>
            <p className="muted" style={{ marginTop: 8 }}>
              Automatski na sve karte kupljene do {formatDate(concert.earlyBirdDeadline)}.
            </p>
          </div>
          <div className="panel panel--tight">
            <h4>Svaka 5. karta −50%</h4>
            <p className="muted" style={{ marginTop: 8 }}>
              Primenjuje se na poziciju 5, 10, 15… u okviru iste rezervacije.
            </p>
          </div>
          <div className="panel panel--tight">
            <h4>Promo kod −5%</h4>
            <p className="muted" style={{ marginTop: 8 }}>
              Svaka rezervacija automatski generiše promo kod za prijatelja.
            </p>
          </div>
        </div>
      </section>
    </div>
  );
}
