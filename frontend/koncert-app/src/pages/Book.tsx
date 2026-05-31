import { useEffect, useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { getConcert, createReservation } from '../api/endpoints';
import { extractErrorMessage } from '../api/client';
import type { ConcertInfo } from '../api/types';
import { formatRsd } from '../lib/format';
import { calculatePricing } from '../lib/pricing';
import TicketCounter from '../components/TicketCounter';
import Alert from '../components/Alert';

export default function Book() {
  const navigate = useNavigate();
  const location = useLocation();
  // zona koju je korisnik kliknuo na pocetnoj strani (moze da ne postoji)
  const preselected = (location.state as any)?.zoneId;

  const [concert, setConcert] = useState<ConcertInfo | null>(null);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  // jedno useState za svako polje forme
  const [zoneId, setZoneId] = useState<number | ''>('');
  const [ticketCount, setTicketCount] = useState(1);
  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [company, setCompany] = useState('');
  const [address1, setAddress1] = useState('');
  const [address2, setAddress2] = useState('');
  const [postalCode, setPostalCode] = useState('');
  const [city, setCity] = useState('');
  const [country, setCountry] = useState('Srbija');
  const [email, setEmail] = useState('');
  const [promoCode, setPromoCode] = useState('');

  const [submitting, setSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);

  // ucitaj koncert kad se stranica otvori
  useEffect(() => {
    getConcert()
      .then((c) => {
        setConcert(c);
        // ako je korisnik vec izabrao zonu na pocetnoj, postavi je
        if (preselected && c.zones.some((z) => z.id === preselected)) {
          setZoneId(preselected);
        }
      })
      .catch((e) => setLoadError(extractErrorMessage(e)))
      .finally(() => setLoading(false));
  }, [preselected]);

  // izabrana zona - racunamo direktno u renderu
  const selectedZone =
    zoneId === '' || !concert
      ? undefined
      : concert.zones.find((z) => z.id === zoneId);

  const maxTickets = selectedZone ? Math.min(50, selectedZone.availableSeats) : 1;

  // cena se racuna direktno u renderu (bez useMemo)
  let pricing = null;
  if (selectedZone && concert) {
    pricing = calculatePricing(
      selectedZone.pricePerTicket,
      ticketCount,
      concert.isEarlyBirdActive,
      promoCode.trim().length > 0,
    );
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedZone) {
      setSubmitError('Izaberi zonu pre slanja.');
      return;
    }
    setSubmitting(true);
    setSubmitError(null);
    try {
      const result = await createReservation({
        zoneId: selectedZone.id,
        ticketCount: ticketCount,
        firstName: firstName.trim(),
        lastName: lastName.trim(),
        company: company.trim() || null,
        address1: address1.trim(),
        address2: address2.trim() || null,
        postalCode: postalCode.trim(),
        city: city.trim(),
        country: country.trim(),
        email: email.trim(),
        promoCode: promoCode.trim() || null,
      });
      // prosledjujemo i pricing da bi Confirmation mogao da prikaze popuste
      navigate('/confirmation', { state: { reservation: result, pricing } });
    } catch (err) {
      setSubmitError(extractErrorMessage(err));
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) {
    return (
      <div className="booking-layout">
        <div className="skeleton" style={{ height: 600 }} />
        <div className="skeleton" style={{ height: 360 }} />
      </div>
    );
  }

  if (loadError || !concert) {
    return <Alert variant="error">{loadError ?? 'Podaci nisu dostupni.'}</Alert>;
  }

  return (
    <div className="stack" style={{ gap: 24 }}>
      <div>
        <span className="section-title__eyebrow">Rezervacija</span>
        <h1 style={{ fontSize: '2rem', marginTop: 6 }}>Popuni podatke</h1>
        <p className="muted" style={{ marginTop: 8 }}>
          Cena se živo preračunava dok menjaš zonu, broj karata i promo kod.
        </p>
      </div>

      <form className="booking-layout" onSubmit={handleSubmit} noValidate>
        {/* LEVI PANEL — forma */}
        <div className="stack">
          <div className="panel">
            <h3>Izbor karata</h3>
            <div className="form__grid" style={{ marginTop: 16 }}>
              <div className="form__field">
                <label className="form__label">Zona <span>*</span></label>
                <select
                  className="form__select"
                  value={zoneId}
                  onChange={(e) =>
                    setZoneId(e.target.value === '' ? '' : Number(e.target.value))
                  }
                  required
                >
                  <option value="" disabled>Izaberi zonu…</option>
                  {concert.zones.map((z) => (
                    <option
                      key={z.id}
                      value={z.id}
                      disabled={z.availableSeats <= 0}
                    >
                      {z.name} — {formatRsd(z.pricePerTicket)} ·{' '}
                      {z.availableSeats > 0 ? `${z.availableSeats} slobodno` : 'rasprodato'}
                    </option>
                  ))}
                </select>
              </div>

              <div className="form__field">
                <label className="form__label">Broj karata <span>*</span></label>
                <TicketCounter
                  value={ticketCount}
                  onChange={(v) => setTicketCount(v)}
                  min={1}
                  max={maxTickets}
                />
                {selectedZone && (
                  <span className="form__hint">
                    Maksimalno {maxTickets} u ovoj zoni.
                  </span>
                )}
              </div>
            </div>
          </div>

          <div className="panel">
            <h3>Podaci kupca</h3>
            <div className="form__grid" style={{ marginTop: 16 }}>
              <div className="form__field">
                <label className="form__label">Ime <span>*</span></label>
                <input
                  className="form__input"
                  placeholder="Marko"
                  value={firstName}
                  onChange={(e) => setFirstName(e.target.value)}
                  maxLength={100}
                />
              </div>

              <div className="form__field">
                <label className="form__label">Prezime <span>*</span></label>
                <input
                  className="form__input"
                  placeholder="Petrović"
                  value={lastName}
                  onChange={(e) => setLastName(e.target.value)}
                  maxLength={100}
                />
              </div>

              <div className="form__field form__field--full">
                <label className="form__label">Email <span>*</span></label>
                <input
                  className="form__input"
                  type="email"
                  placeholder="marko@example.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  maxLength={200}
                />
              </div>

              <div className="form__field form__field--full">
                <label className="form__label">Kompanija (opciono)</label>
                <input
                  className="form__input"
                  placeholder="—"
                  value={company}
                  onChange={(e) => setCompany(e.target.value)}
                  maxLength={200}
                />
              </div>

              <div className="form__field form__field--full">
                <label className="form__label">Adresa <span>*</span></label>
                <input
                  className="form__input"
                  placeholder="Knez Mihailova 1"
                  value={address1}
                  onChange={(e) => setAddress1(e.target.value)}
                  maxLength={200}
                />
              </div>

              <div className="form__field form__field--full">
                <label className="form__label">Adresa (red 2)</label>
                <input
                  className="form__input"
                  placeholder="Stan 4"
                  value={address2}
                  onChange={(e) => setAddress2(e.target.value)}
                  maxLength={200}
                />
              </div>

              <div className="form__field">
                <label className="form__label">Poštanski broj <span>*</span></label>
                <input
                  className="form__input"
                  placeholder="11000"
                  value={postalCode}
                  onChange={(e) => setPostalCode(e.target.value)}
                  maxLength={20}
                />
              </div>

              <div className="form__field">
                <label className="form__label">Grad <span>*</span></label>
                <input
                  className="form__input"
                  placeholder="Beograd"
                  value={city}
                  onChange={(e) => setCity(e.target.value)}
                  maxLength={100}
                />
              </div>

              <div className="form__field form__field--full">
                <label className="form__label">Država <span>*</span></label>
                <input
                  className="form__input"
                  value={country}
                  onChange={(e) => setCountry(e.target.value)}
                  maxLength={100}
                />
              </div>
            </div>
          </div>

          <div className="panel">
            <h3>Promo kod (opciono)</h3>
            <p className="muted" style={{ marginTop: 6, fontSize: '0.9rem' }}>
              Ako ti je neko prosledio promo kod, dodatnih −5% na ukupno.
            </p>
            <div className="form__field" style={{ marginTop: 14 }}>
              <input
                className="form__input mono"
                placeholder="npr. AB12CD34"
                value={promoCode}
                onChange={(e) => setPromoCode(e.target.value.toUpperCase())}
                maxLength={16}
              />
            </div>
          </div>

          {submitError && <Alert variant="error">{submitError}</Alert>}
        </div>

        {/* DESNI PANEL — summary */}
        <aside className="panel summary">
          <h3>Pregled</h3>
          <div style={{ marginTop: 14 }}>
            {selectedZone ? (
              <>
                <div className="summary__row">
                  <span className="summary__label">Zona</span>
                  <span className="summary__value">{selectedZone.name}</span>
                </div>
                <div className="summary__row">
                  <span className="summary__label">Cena po karti</span>
                  <span className="summary__value">
                    {formatRsd(selectedZone.pricePerTicket)}
                  </span>
                </div>
                <div className="summary__row">
                  <span className="summary__label">Broj karata</span>
                  <span className="summary__value">{ticketCount}</span>
                </div>

                {pricing && (
                  <>
                    {pricing.earlyBirdSavings > 0 && (
                      <div className="summary__row">
                        <span className="summary__label">Early bird −10%</span>
                        <span className="summary__value" style={{ color: '#b8f4e4' }}>
                          −{formatRsd(pricing.earlyBirdSavings)}
                        </span>
                      </div>
                    )}
                    {pricing.fifthTicketSavings > 0 && (
                      <div className="summary__row">
                        <span className="summary__label">Svaka 5. karta −50%</span>
                        <span className="summary__value" style={{ color: '#b8f4e4' }}>
                          −{formatRsd(pricing.fifthTicketSavings)}
                        </span>
                      </div>
                    )}
                    {pricing.promoSavings > 0 && (
                      <div className="summary__row">
                        <span className="summary__label">Promo kod −5%</span>
                        <span className="summary__value" style={{ color: '#b8f4e4' }}>
                          −{formatRsd(pricing.promoSavings)}
                        </span>
                      </div>
                    )}

                    <div className="summary__total">
                      <span className="muted">Ukupno</span>
                      <strong>{formatRsd(pricing.total)}</strong>
                    </div>
                  </>
                )}
              </>
            ) : (
              <p className="muted" style={{ fontSize: '0.9rem' }}>
                Izaberi zonu da vidiš ukupnu cenu.
              </p>
            )}
          </div>

          <button
            type="submit"
            className="btn btn--primary btn--block"
            style={{ marginTop: 18 }}
            disabled={submitting || !selectedZone}
          >
            {submitting ? 'Slanje…' : 'Potvrdi rezervaciju'}
          </button>

          <p className="dim" style={{ fontSize: 12, marginTop: 10, textAlign: 'center' }}>
            Dobićeš jedinstveni token i promo kod za prijatelja.
          </p>
        </aside>
      </form>
    </div>
  );
}
