import { useEffect, useMemo, useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { getConcert, createReservation } from '../api/endpoints';
import { extractErrorMessage } from '../api/client';
import type { ConcertInfo, ZoneInfo } from '../api/types';
import { formatRsd } from '../lib/format';
import { calculatePricing } from '../lib/pricing';
import { Field } from '../components/Field';
import TicketCounter from '../components/TicketCounter';
import Alert from '../components/Alert';

interface LocationState {
  zoneId?: number;
}

interface FormState {
  zoneId: number | '';
  ticketCount: number;
  firstName: string;
  lastName: string;
  company: string;
  address1: string;
  address2: string;
  postalCode: string;
  city: string;
  country: string;
  email: string;
  promoCode: string;
}

const EMPTY: FormState = {
  zoneId: '',
  ticketCount: 1,
  firstName: '',
  lastName: '',
  company: '',
  address1: '',
  address2: '',
  postalCode: '',
  city: '',
  country: 'Srbija',
  email: '',
  promoCode: '',
};

export default function Book() {
  const navigate = useNavigate();
  const location = useLocation();
  const preselected = (location.state as LocationState | null)?.zoneId;

  const [concert, setConcert] = useState<ConcertInfo | null>(null);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  const [form, setForm] = useState<FormState>(EMPTY);
  const [submitting, setSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    getConcert()
      .then((c) => {
        if (cancelled) return;
        setConcert(c);
        if (preselected && c.zones.some((z) => z.id === preselected)) {
          setForm((f) => ({ ...f, zoneId: preselected }));
        }
      })
      .catch((e) => !cancelled && setLoadError(extractErrorMessage(e)))
      .finally(() => !cancelled && setLoading(false));
    return () => { cancelled = true; };
  }, [preselected]);

  const selectedZone: ZoneInfo | undefined = useMemo(() => {
    if (form.zoneId === '' || !concert) return undefined;
    return concert.zones.find((z) => z.id === form.zoneId);
  }, [form.zoneId, concert]);

  const maxTickets = selectedZone ? Math.min(50, selectedZone.availableSeats) : 1;

  const pricing = useMemo(() => {
    if (!selectedZone || !concert) return null;
    return calculatePricing(
      selectedZone.pricePerTicket,
      form.ticketCount,
      concert.isEarlyBirdActive,
      form.promoCode.trim().length > 0,
    );
  }, [selectedZone, concert, form.ticketCount, form.promoCode]);

  const update = <K extends keyof FormState>(key: K, value: FormState[K]) =>
    setForm((f) => ({ ...f, [key]: value }));

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
        ticketCount: form.ticketCount,
        firstName: form.firstName.trim(),
        lastName: form.lastName.trim(),
        company: form.company.trim() || null,
        address1: form.address1.trim(),
        address2: form.address2.trim() || null,
        postalCode: form.postalCode.trim(),
        city: form.city.trim(),
        country: form.country.trim(),
        email: form.email.trim(),
        promoCode: form.promoCode.trim() || null,
      });
      navigate('/confirmation', { state: { reservation: result } });
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
        <div className="stack">
          <div className="panel">
            <h3>Izbor karata</h3>
            <div className="form__grid" style={{ marginTop: 16 }}>
              <div className="form__field">
                <label className="form__label">Zona <span>*</span></label>
                <select
                  className="form__select"
                  value={form.zoneId}
                  onChange={(e) =>
                    update('zoneId', e.target.value === '' ? '' : Number(e.target.value))
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
                  value={form.ticketCount}
                  onChange={(v) => update('ticketCount', v)}
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
              <Field
                label="Ime" required placeholder="Marko"
                value={form.firstName}
                onChange={(e) => update('firstName', e.target.value)}
                maxLength={100}
              />
              <Field
                label="Prezime" required placeholder="Petrović"
                value={form.lastName}
                onChange={(e) => update('lastName', e.target.value)}
                maxLength={100}
              />
              <Field
                label="Email" required type="email" placeholder="marko@example.com"
                value={form.email}
                onChange={(e) => update('email', e.target.value)}
                full
                maxLength={200}
              />
              <Field
                label="Kompanija (opciono)" placeholder="—"
                value={form.company}
                onChange={(e) => update('company', e.target.value)}
                full
                maxLength={200}
              />
              <Field
                label="Adresa" required placeholder="Knez Mihailova 1"
                value={form.address1}
                onChange={(e) => update('address1', e.target.value)}
                full
                maxLength={200}
              />
              <Field
                label="Adresa (red 2)" placeholder="Stan 4"
                value={form.address2}
                onChange={(e) => update('address2', e.target.value)}
                full
                maxLength={200}
              />
              <Field
                label="Poštanski broj" required placeholder="11000"
                value={form.postalCode}
                onChange={(e) => update('postalCode', e.target.value)}
                maxLength={20}
              />
              <Field
                label="Grad" required placeholder="Beograd"
                value={form.city}
                onChange={(e) => update('city', e.target.value)}
                maxLength={100}
              />
              <Field
                label="Država" required
                value={form.country}
                onChange={(e) => update('country', e.target.value)}
                full
                maxLength={100}
              />
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
                value={form.promoCode}
                onChange={(e) => update('promoCode', e.target.value.toUpperCase())}
                maxLength={16}
              />
            </div>
          </div>

          {submitError && <Alert variant="error">{submitError}</Alert>}
        </div>

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
                  <span className="summary__value">{form.ticketCount}</span>
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
