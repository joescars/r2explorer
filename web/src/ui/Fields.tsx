import { useRef } from 'react';
import type * as React from 'react';
import type { HTMLAttributes, LabelHTMLAttributes, ReactNode, SelectHTMLAttributes, InputHTMLAttributes, TextareaHTMLAttributes } from 'react';
import { ChevronDown } from 'lucide-react';

export interface CardProps extends HTMLAttributes<HTMLDivElement> {
  variant?: 'elevated' | 'filled' | 'outlined';
}

export function Card({ variant = 'filled', className = '', ...rest }: CardProps) {
  const styles: Record<NonNullable<CardProps['variant']>, string> = {
    elevated: 'bg-surface-lowest shadow-e1',
    filled: 'bg-surface-container',
    outlined: 'bg-surface border border-outline-variant',
  };
  return (
    <div
      className={`rounded-2xl ${styles[variant]} ${className}`}
      {...rest}
    />
  );
}

export function SectionCard({ title, actions, children, className = '', contentClassName = 'p-4 sm:p-6', ...rest }: {
  title?: ReactNode;
  actions?: ReactNode;
  children: ReactNode;
  className?: string;
  contentClassName?: string;
} & Omit<HTMLAttributes<HTMLDivElement>, 'title'>) {
  return (
    <Card variant="outlined" className={className} {...rest}>
      {(title || actions) && (
        <div className="flex flex-wrap items-center justify-between gap-3 px-4 sm:px-6 pt-4 sm:pt-5 pb-2">
          <div className="min-w-0 text-base font-medium">{title}</div>
          {actions && <div className="flex flex-wrap items-center gap-2">{actions}</div>}
        </div>
      )}
      <div className={contentClassName}>{children}</div>
    </Card>
  );
}

/* --------------------------------- inputs -------------------------------- */

export function Label({ children, className = '', ...rest }: LabelHTMLAttributes<HTMLLabelElement>) {
  return (
    <label className={`block text-xs font-medium text-on-surface-variant ${className}`} {...rest}>
      {children}
    </label>
  );
}

const inputBase =
  'w-full rounded-xl border border-outline-variant bg-surface-container px-3.5 text-base sm:text-sm text-on-surface ' +
  'placeholder:text-on-surface-variant transition-colors ' +
  'hover:border-outline focus:border-2 focus:border-primary focus:outline-none ' +
  'disabled:opacity-50 aria-[invalid=true]:border-error';

export interface TextFieldProps extends Omit<InputHTMLAttributes<HTMLInputElement>, 'size'> {
  label?: string;
  helpText?: string;
  errorText?: string;
  inputRef?: React.Ref<HTMLInputElement>;
}

export function TextField({ label, helpText, errorText, id, className = '', inputRef, ...rest }: TextFieldProps) {
  const inputId = id || (label ? `field-${label.replace(/\s+/g, '-').toLowerCase()}` : undefined);
  return (
    <div className={className}>
      {label && <Label htmlFor={inputId}>{label}</Label>}
      <input
        ref={inputRef}
        id={inputId}
        aria-invalid={errorText ? true : rest['aria-invalid']}
        className={`h-11 ${label ? 'mt-1.5 ' : ''}${inputBase} ${errorText ? 'border-error' : ''}`}
        {...rest}
      />
      {errorText ? (
        <p role="alert" className="mt-1.5 text-xs text-error">{errorText}</p>
      ) : helpText ? (
        <p className="mt-1.5 text-xs text-on-surface-variant">{helpText}</p>
      ) : null}
    </div>
  );
}

export interface TextAreaProps extends TextareaHTMLAttributes<HTMLTextAreaElement> {
  label?: string;
  helpText?: string;
  errorText?: string;
}

export function TextArea({ label, helpText, errorText, id, className = '', ...rest }: TextAreaProps) {
  const inputId = id || (label ? `field-${label.replace(/\s+/g, '-').toLowerCase()}` : undefined);
  return (
    <div className={className}>
      {label && <Label htmlFor={inputId}>{label}</Label>}
      <textarea
        id={inputId}
        aria-invalid={errorText ? true : rest['aria-invalid']}
        className={`py-2.5 ${label ? 'mt-1.5 ' : ''}${inputBase} resize-y ${errorText ? 'border-error' : ''}`}
        {...rest}
      />
      {errorText ? (
        <p role="alert" className="mt-1.5 text-xs text-error">{errorText}</p>
      ) : helpText ? (
        <p className="mt-1.5 text-xs text-on-surface-variant">{helpText}</p>
      ) : null}
    </div>
  );
}

export interface SelectFieldProps extends SelectHTMLAttributes<HTMLSelectElement> {
  label?: string;
  helpText?: string;
}

export function SelectField({ label, helpText, id, className = '', children, ...rest }: SelectFieldProps) {
  const inputId = id || (label ? `field-${label.replace(/\s+/g, '-').toLowerCase()}` : undefined);
  return (
    <div className={className}>
      {label && <Label htmlFor={inputId}>{label}</Label>}
      <div className={`relative ${label ? 'mt-1.5' : ''}`}>
        <select
          id={inputId}
          className={`h-11 appearance-none pr-10 ${inputBase}`}
          {...rest}
        >
          {children}
        </select>
        <ChevronDown className="pointer-events-none absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 text-on-surface-variant" aria-hidden />
      </div>
      {helpText && <p className="mt-1.5 text-xs text-on-surface-variant">{helpText}</p>}
    </div>
  );
}

/* --------------------------------- toggles ------------------------------- */

export function Switch({ checked, onChange, label, disabled = false, description }: {
  checked: boolean;
  onChange: (next: boolean) => void;
  label: ReactNode;
  disabled?: boolean;
  description?: string;
}) {
  return (
    <div className="flex items-start gap-3">
      <button
        type="button"
        role="switch"
        aria-checked={checked}
        disabled={disabled}
        onClick={() => onChange(!checked)}
        className={[
          'relative h-[26px] w-[50px] shrink-0 rounded-full border-2 transition-colors duration-150',
          'disabled:opacity-40',
          checked ? 'border-primary bg-primary' : 'border-outline bg-surface-highest',
        ].join(' ')}
      >
        <span
          className={[
            'absolute top-1/2 -translate-y-1/2 rounded-full transition-all duration-150',
            checked ? 'left-[24px] h-4 w-4 bg-on-primary' : 'left-[3px] h-4 w-4 bg-outline',
          ].join(' ')}
          aria-hidden
        />
      </button>
      <div className="min-w-0 pt-0.5">
        <div className="text-sm font-medium text-on-surface">{label}</div>
        {description && <div className="text-xs text-on-surface-variant">{description}</div>}
      </div>
    </div>
  );
}

export function Checkbox({ checked, onChange, label, disabled = false, className = '', description }: {
  checked: boolean;
  onChange: (next: boolean) => void;
  label: ReactNode;
  disabled?: boolean;
  className?: string;
  description?: string;
}) {
  return (
    <label className={`flex cursor-pointer items-start gap-2.5 select-none ${disabled ? 'opacity-50 pointer-events-none' : ''} ${className}`}>
      <input
        type="checkbox"
        checked={checked}
        disabled={disabled}
        onChange={(event) => onChange(event.target.checked)}
        className="mt-0.5 h-[18px] w-[18px] cursor-pointer appearance-none rounded border-2 border-outline bg-surface
          checked:border-primary checked:bg-primary
          after:content-[''] after:block after:h-full after:w-full
          checked:bg-[url('data:image/svg+xml;charset=utf-8,%3Csvg%20viewBox%3D%220%200%2016%2016%22%20fill%3D%22none%22%20xmlns%3D%22http%3A//www.w3.org/2000/svg%22%3E%3Cpath%20d%3D%22M13.3%204.3%206%2011.6l-3.3-3.3%201.2-1.2L6%209.2l6.1-6.1z%22%20fill%3D%22white%22/%3E%3C/svg%3E')]
          checked:bg-center checked:bg-no-repeat checked:[background-size:100%]
          focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary"
      />
      <span className="min-w-0">
        <span className="block text-sm text-on-surface">{label}</span>
        {description && <span className="block text-xs text-on-surface-variant">{description}</span>}
      </span>
    </label>
  );
}

/* ----------------------------- segmented control -------------------------- */

export interface SegmentOption<T extends string> {
  value: T;
  label: ReactNode;
  icon?: ReactNode;
}

export function SegmentedButton<T extends string>({ options, value, onChange, size = 'md', className = '', 'aria-label': ariaLabel }: {
  options: SegmentOption<T>[];
  value: T;
  onChange: (next: T) => void;
  size?: 'sm' | 'md';
  className?: string;
  'aria-label'?: string;
}) {
  const groupRef = useRef<HTMLDivElement>(null);
  const selectedIndex = options.findIndex((option) => option.value === value);
  const tabStopIndex = selectedIndex === -1 ? 0 : selectedIndex;
  return (
    <div
      ref={groupRef}
      role="radiogroup"
      aria-label={ariaLabel}
      aria-orientation="horizontal"
      className={`inline-flex w-full overflow-hidden rounded-full border border-outline ${className}`}
    >
      {options.map((option, index) => {
        const active = option.value === value;
        return (
          <button
            key={option.value}
            type="button"
            role="radio"
            aria-checked={active}
            tabIndex={index === tabStopIndex ? 0 : -1}
            onClick={() => onChange(option.value)}
            onKeyDown={(event) => {
              if (event.altKey || event.ctrlKey || event.metaKey) return;
              const rtl = getComputedStyle(event.currentTarget).direction === 'rtl';
              let nextIndex: number;
              switch (event.key) {
                case 'ArrowRight': nextIndex = index + (rtl ? -1 : 1); break;
                case 'ArrowLeft': nextIndex = index + (rtl ? 1 : -1); break;
                case 'ArrowDown': nextIndex = index + 1; break;
                case 'ArrowUp': nextIndex = index - 1; break;
                case 'Home': nextIndex = 0; break;
                case 'End': nextIndex = options.length - 1; break;
                default: return;
              }
              event.preventDefault();
              nextIndex = (nextIndex + options.length) % options.length;
              groupRef.current?.querySelectorAll<HTMLButtonElement>('[role="radio"]')[nextIndex]?.focus();
              onChange(options[nextIndex].value);
            }}
            className={[
              'state-layer inline-flex min-h-11 flex-1 items-center justify-center gap-2 text-sm font-medium transition-colors focus-visible:-outline-offset-2',
              size === 'sm' ? 'sm:min-h-8' : 'sm:min-h-10',
              active
                ? 'bg-secondary-container text-on-secondary-container'
                : 'text-on-surface-variant',
              option.value !== options[0]?.value ? 'border-l border-outline' : '',
            ].join(' ')}
          >
            {option.icon}
            {option.label}
          </button>
        );
      })}
    </div>
  );
}
