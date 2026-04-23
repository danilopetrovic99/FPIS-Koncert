import type { ReactNode } from 'react';

type Variant = 'error' | 'success' | 'info' | 'warning';

interface Props {
  variant: Variant;
  children: ReactNode;
}

const ICON: Record<Variant, string> = {
  error: '⚠',
  success: '✓',
  info: 'ℹ',
  warning: '!',
};

export default function Alert({ variant, children }: Props) {
  return (
    <div className={`alert alert--${variant}`} role="alert">
      <span className="alert__icon">{ICON[variant]}</span>
      <div>{children}</div>
    </div>
  );
}
