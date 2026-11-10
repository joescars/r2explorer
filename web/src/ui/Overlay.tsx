import { useEffect, useId, useLayoutEffect, useRef, useState } from 'react';
import type { ReactNode, RefObject } from 'react';
import { createPortal } from 'react-dom';
import { MoreVertical } from 'lucide-react';
import { Button, IconButton } from './Button';
import { dialogFocusRestoration } from './dialogFocus';

let openDialogCount = 0;
let bodyOverflowBeforeDialogs = '';

function isBackdropPointer(event: { currentTarget: HTMLDialogElement; target: EventTarget; clientX: number; clientY: number }) {
  if (event.target !== event.currentTarget) return false;
  const bounds = event.currentTarget.getBoundingClientRect();
  return event.clientX < bounds.left || event.clientX > bounds.right
    || event.clientY < bounds.top || event.clientY > bounds.bottom;
}

export function Dialog({ open, onClose, title, description, children, footer, width = 'max-w-lg', dismissible = true, initialFocusRef, 'aria-label': ariaLabel, 'aria-busy': ariaBusy }: {
  open: boolean;
  onClose: () => void;
  title?: ReactNode;
  description?: ReactNode;
  children?: ReactNode;
  footer?: ReactNode;
  width?: string;
  dismissible?: boolean;
  initialFocusRef?: RefObject<HTMLElement | null>;
  'aria-label'?: string;
  'aria-busy'?: boolean;
}) {
  const panelRef = useRef<HTMLDialogElement>(null);
  const backdropPointerDown = useRef(false);
  const titleId = useId();
  const descriptionId = useId();
  const hasTitle = title !== undefined && title !== null;
  const hasDescription = description !== undefined && description !== null;

  useLayoutEffect(() => {
    const panel = panelRef.current;
    if (!open || !panel) return;
    const invoker = document.activeElement instanceof HTMLElement ? document.activeElement : null;
    const restoreFocus = dialogFocusRestoration(invoker);
    // Native modality contains focus and makes the rest of the document inert.
    panel.showModal();
    initialFocusRef?.current?.focus({ preventScroll: true });
    if (openDialogCount === 0) bodyOverflowBeforeDialogs = document.body.style.overflow;
    openDialogCount += 1;
    document.body.style.overflow = 'hidden';
    return () => {
      backdropPointerDown.current = false;
      panel.close();
      openDialogCount -= 1;
      if (openDialogCount === 0) document.body.style.overflow = bodyOverflowBeforeDialogs;
      restoreFocus();
    };
  }, [open, initialFocusRef]);

  if (!open) return null;
  return createPortal(
    <dialog
      ref={panelRef}
      tabIndex={-1}
      aria-modal="true"
      aria-labelledby={hasTitle ? titleId : undefined}
      aria-label={hasTitle ? undefined : (ariaLabel || 'Dialog')}
      aria-describedby={hasDescription ? descriptionId : undefined}
      aria-busy={ariaBusy}
      onCancel={(event) => {
        // Keep dismissal controlled, including while a confirmation is busy.
        event.preventDefault();
        event.stopPropagation();
        if (dismissible) onClose();
      }}
      onPointerDown={(event) => {
        backdropPointerDown.current = event.button === 0 && isBackdropPointer(event);
      }}
      onPointerUp={(event) => {
        const beganOnBackdrop = backdropPointerDown.current;
        backdropPointerDown.current = false;
        if (dismissible && beganOnBackdrop && isBackdropPointer(event)) onClose();
      }}
      onPointerCancel={() => { backdropPointerDown.current = false; }}
      className={`anim-slide-up fixed inset-x-0 bottom-0 top-auto m-0 mx-auto flex max-h-[90dvh] w-full ${width} flex-col overflow-hidden rounded-t-3xl border-0 bg-surface-high p-6 text-on-surface shadow-e3 outline-none backdrop:bg-[var(--m3-scrim)] sm:inset-0 sm:m-auto sm:max-h-[calc(100dvh-3rem)] sm:rounded-3xl`}
    >
      {hasTitle && <h2 id={titleId} className="mb-3 shrink-0 break-words text-xl font-medium">{title}</h2>}
      <div className="min-h-0 overflow-y-auto overscroll-contain text-sm text-on-surface-variant">
        {hasDescription && <div id={descriptionId} className="text-sm leading-relaxed">{description}</div>}
        {children}
      </div>
      {footer && <div className="mt-6 flex shrink-0 flex-wrap justify-end gap-2">{footer}</div>}
    </dialog>,
    document.body,
  );
}

export function ConfirmDialog({ open, onClose, onConfirm, title, message, confirmLabel = 'Confirm', confirmVariant = 'danger', busy = false }: {
  open: boolean;
  onClose: () => void;
  onConfirm: () => void;
  title: string;
  message: ReactNode;
  confirmLabel?: string;
  confirmVariant?: 'filled' | 'danger' | 'tonal';
  busy?: boolean;
}) {
  const cancelRef = useRef<HTMLButtonElement>(null);
  return (
    <Dialog
      open={open}
      onClose={onClose}
      title={title}
      description={message}
      dismissible={!busy}
      initialFocusRef={cancelRef}
      aria-busy={busy}
      footer={(
        <>
          <Button ref={cancelRef} variant="text" onClick={onClose} disabled={busy} className="min-h-11 sm:min-h-10">Cancel</Button>
          <Button variant={confirmVariant} onClick={onConfirm} loading={busy} className="min-h-11 sm:min-h-10">{confirmLabel}</Button>
        </>
      )}
    />
  );
}

export interface MenuItem {
  label: string;
  icon?: ReactNode;
  onClick: () => void;
  danger?: boolean;
  disabled?: boolean;
}

export function Menu({ items, label = 'More options', trigger }: {
  items: MenuItem[];
  label?: string;
  trigger?: (open: boolean) => ReactNode;
}) {
  const [open, setOpen] = useState(false);
  const rootRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    const onPointerDown = (event: PointerEvent) => {
      if (!rootRef.current?.contains(event.target as Node)) setOpen(false);
    };
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') setOpen(false);
    };
    document.addEventListener('pointerdown', onPointerDown);
    document.addEventListener('keydown', onKeyDown);
    return () => {
      document.removeEventListener('pointerdown', onPointerDown);
      document.removeEventListener('keydown', onKeyDown);
    };
  }, [open]);

  return (
    <div ref={rootRef} className="relative">
      <button
        type="button"
        aria-haspopup="menu"
        aria-expanded={open}
        aria-label={label}
        onClick={() => setOpen((current) => !current)}
        className="state-layer inline-flex h-9 w-9 items-center justify-center rounded-full text-on-surface-variant"
      >
        {trigger ? trigger(open) : <MoreVertical className="h-5 w-5" />}
      </button>
      {open && (
        <div
          role="menu"
          className="anim-scale-in absolute right-0 z-50 mt-1 min-w-[13rem] origin-top-right overflow-hidden rounded-xl bg-surface-high py-1.5 shadow-e2"
        >
          {items.map((item) => (
            <button
              key={item.label}
              type="button"
              role="menuitem"
              disabled={item.disabled}
              onClick={() => { setOpen(false); item.onClick(); }}
              className={[
                'flex w-full items-center gap-3 px-4 py-2.5 text-left text-sm transition-colors hover:bg-surface-highest',
                'disabled:opacity-40',
                item.danger ? 'text-error' : 'text-on-surface',
              ].join(' ')}
            >
              {item.icon && <span className="shrink-0 text-on-surface-variant">{item.icon}</span>}
              {item.label}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

export { IconButton };
