import { forwardRef } from 'react';
import type { ButtonHTMLAttributes, ReactNode } from 'react';
import { Loader2 } from 'lucide-react';

export type ButtonVariant = 'filled' | 'tonal' | 'outlined' | 'text' | 'danger' | 'danger-tonal';
export type ButtonSize = 'sm' | 'md' | 'lg';

const VARIANTS: Record<ButtonVariant, string> = {
  filled: 'bg-primary text-on-primary shadow-e1 hover:shadow-e2',
  tonal: 'bg-secondary-container text-on-secondary-container',
  outlined: 'border border-outline text-primary',
  text: 'text-primary',
  danger: 'bg-error text-on-error',
  'danger-tonal': 'bg-error-container text-on-error-container',
};

const SIZES: Record<ButtonSize, string> = {
  sm: 'h-8 px-3 text-[13px] gap-1.5',
  md: 'h-10 px-5 text-sm gap-2',
  lg: 'h-12 px-7 text-[15px] gap-2',
};

export interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: ButtonVariant;
  size?: ButtonSize;
  loading?: boolean;
  icon?: ReactNode;
  fullWidth?: boolean;
}

/** Material 3 filled/tonal/outlined/text button. */
export const Button = forwardRef<HTMLButtonElement, ButtonProps>(function Button(
  { variant = 'filled', size = 'md', loading = false, icon, fullWidth, className = '', children, disabled, ...rest },
  ref,
) {
  return (
    <button
      ref={ref}
      type={rest.type || 'button'}
      disabled={disabled || loading}
      className={[
        'state-layer inline-flex select-none items-center justify-center rounded-full font-medium',
        'transition-[background-color,box-shadow,opacity] duration-150',
        'disabled:pointer-events-none disabled:opacity-40',
        VARIANTS[variant],
        SIZES[size],
        fullWidth ? 'w-full' : '',
        className,
      ].join(' ')}
      {...rest}
    >
      {loading ? <Loader2 className="anim-spin h-4 w-4" aria-hidden /> : icon}
      {children}
    </button>
  );
});

export interface IconButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  label: string;
  size?: 'sm' | 'md';
  href?: string;
  target?: string;
  rel?: string;
}

/** Circular icon button (Google apps header control). */
export const IconButton = forwardRef<HTMLButtonElement, IconButtonProps>(function IconButton(
  { label, size = 'md', className = '', children, disabled, ...rest },
  ref,
) {
  return (
    <button
      ref={ref}
      type={rest.type || 'button'}
      aria-label={label}
      title={label}
      disabled={disabled}
      className={[
        'state-layer inline-flex shrink-0 items-center justify-center rounded-full text-on-surface-variant',
        'transition-colors disabled:pointer-events-none disabled:opacity-40',
        size === 'sm' ? 'h-8 w-8' : 'h-10 w-10',
        className,
      ].join(' ')}
      {...rest}
    >
      {children}
    </button>
  );
});
