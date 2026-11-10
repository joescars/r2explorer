/** Capture the origin before modality or an accepted action can remove its trigger. */
export function dialogFocusRestoration(invoker: HTMLElement | null): () => void {
  const scope = invoker?.closest<HTMLElement>('[data-dialog-focus-scope]');
  const doc = invoker?.ownerDocument ?? document;
  return () => {
    const focus = (target: HTMLElement | null | undefined, makeFocusable = false): boolean => {
      if (!target?.isConnected || target.matches(':disabled')
        || target.closest('[hidden], [inert], [aria-hidden="true"]') || !target.getClientRects().length) return false;
      const temporaryTabIndex = makeFocusable && !target.hasAttribute('tabindex');
      if (temporaryTabIndex) target.setAttribute('tabindex', '-1');
      target.focus({ preventScroll: true });
      if (temporaryTabIndex) target.removeAttribute('tabindex');
      return target.ownerDocument.activeElement === target;
    };
    if (focus(invoker)) return;
    if (focus(scope?.querySelector<HTMLElement>('[data-dialog-focus-fallback]'))) return;
    if (focus(doc.querySelector<HTMLElement>('main h1'), true)) return;
    focus(doc.querySelector<HTMLElement>('main'), true);
  };
}
