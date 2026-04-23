import type { InputHTMLAttributes, ReactNode } from 'react';

interface FieldProps extends InputHTMLAttributes<HTMLInputElement> {
  label: string;
  required?: boolean;
  hint?: string;
  error?: string;
  full?: boolean;
  rightSlot?: ReactNode;
}

export function Field({
  label, required, hint, error, full, rightSlot, id, ...rest
}: FieldProps) {
  const inputId = id ?? `fld-${label.replace(/\s+/g, '-').toLowerCase()}`;
  return (
    <div className={`form__field ${full ? 'form__field--full' : ''}`}>
      <label className="form__label" htmlFor={inputId}>
        {label}{required && <span>*</span>}
      </label>
      {rightSlot ? (
        <div style={{ display: 'flex', gap: 8 }}>
          <input id={inputId} className="form__input" {...rest} />
          {rightSlot}
        </div>
      ) : (
        <input id={inputId} className="form__input" {...rest} />
      )}
      {hint && !error && <span className="form__hint">{hint}</span>}
      {error && <span className="form__error">{error}</span>}
    </div>
  );
}
