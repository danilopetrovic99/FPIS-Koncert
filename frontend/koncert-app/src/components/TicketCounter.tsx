interface Props {
  value: number;
  onChange: (v: number) => void;
  min?: number;
  max: number;
}

export default function TicketCounter({ value, onChange, min = 1, max }: Props) {
  const clamp = (n: number) => Math.min(max, Math.max(min, n));
  return (
    <div className="form__counter" role="group" aria-label="Broj karata">
      <button
        type="button"
        aria-label="Smanji"
        onClick={() => onChange(clamp(value - 1))}
        disabled={value <= min}
      >
        −
      </button>
      <input
        type="number"
        value={value}
        min={min}
        max={max}
        onChange={(e) => {
          const n = parseInt(e.target.value, 10);
          onChange(Number.isFinite(n) ? clamp(n) : min);
        }}
      />
      <button
        type="button"
        aria-label="Povećaj"
        onClick={() => onChange(clamp(value + 1))}
        disabled={value >= max}
      >
        +
      </button>
    </div>
  );
}
